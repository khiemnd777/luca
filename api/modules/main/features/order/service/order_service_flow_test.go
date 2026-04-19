package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/order/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	auditlogmodel "github.com/khiemnd777/noah_api/shared/modules/auditlog/model"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type publishedMessage struct {
	channel string
	payload any
}

type notifyCall struct {
	receiverID       int
	notifierID       int
	notificationType string
	data             map[string]any
}

type broadcastAllCall struct {
	eventType string
	data      any
}

type broadcastDeptCall struct {
	deptID    int
	eventType string
	data      any
}

type serviceHooksRecorder struct {
	invalidations    [][]string
	published        []publishedMessage
	notifications    []notifyCall
	broadcastAlls    []broadcastAllCall
	broadcastToDepts []broadcastDeptCall
}

func installServiceHooks(t *testing.T) *serviceHooksRecorder {
	t.Helper()

	recorder := &serviceHooksRecorder{}

	prevInvalidate := invalidateKeysHook
	prevPublish := publishAsyncHook
	prevNotify := notifyHook
	prevBroadcastAll := broadcastAllHook
	prevBroadcastToDept := broadcastToDeptHook

	invalidateKeysHook = func(keys ...string) {
		recorder.invalidations = append(recorder.invalidations, append([]string(nil), keys...))
	}
	publishAsyncHook = func(channel string, payload any) error {
		recorder.published = append(recorder.published, publishedMessage{
			channel: channel,
			payload: payload,
		})
		return nil
	}
	notifyHook = func(receiverID, notifierID int, notificationType string, data map[string]any) {
		copied := make(map[string]any, len(data))
		for k, v := range data {
			copied[k] = v
		}
		recorder.notifications = append(recorder.notifications, notifyCall{
			receiverID:       receiverID,
			notifierID:       notifierID,
			notificationType: notificationType,
			data:             copied,
		})
	}
	broadcastAllHook = func(eventType string, data any) {
		recorder.broadcastAlls = append(recorder.broadcastAlls, broadcastAllCall{
			eventType: eventType,
			data:      data,
		})
	}
	broadcastToDeptHook = func(deptID int, eventType string, data any) {
		recorder.broadcastToDepts = append(recorder.broadcastToDepts, broadcastDeptCall{
			deptID:    deptID,
			eventType: eventType,
			data:      data,
		})
	}

	t.Cleanup(func() {
		invalidateKeysHook = prevInvalidate
		publishAsyncHook = prevPublish
		notifyHook = prevNotify
		broadcastAllHook = prevBroadcastAll
		broadcastToDeptHook = prevBroadcastToDept
	})

	return recorder
}

func requirePublishedPayload[T any](t *testing.T, recorder *serviceHooksRecorder, channel string) T {
	t.Helper()

	for _, msg := range recorder.published {
		if msg.channel != channel {
			continue
		}
		payload, ok := msg.payload.(T)
		if !ok {
			t.Fatalf("channel %s payload has unexpected type %T", channel, msg.payload)
		}
		return payload
	}

	var zero T
	t.Fatalf("missing published payload for channel %s", channel)
	return zero
}

func flattenInvalidations(recorder *serviceHooksRecorder) []string {
	out := make([]string, 0)
	for _, keys := range recorder.invalidations {
		out = append(out, keys...)
	}
	return out
}

func assertContainsKey(t *testing.T, keys []string, expected string) {
	t.Helper()
	for _, key := range keys {
		if key == expected {
			return
		}
	}
	t.Fatalf("expected invalidated key %q, got %v", expected, keys)
}

type orderRepositoryStub struct {
	createFn func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
	updateFn func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
}

func (s *orderRepositoryStub) ExistsByCode(ctx context.Context, code string) (bool, error) {
	return false, nil
}

func (s *orderRepositoryStub) GetByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) (*model.OrderDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) UpdateStatus(ctx context.Context, orderItemProcessID int64, status string) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) UpdateDeliveryStatus(ctx context.Context, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetDeliveryStatus(ctx context.Context, orderID, orderItemID int64) (*string, error) {
	return nil, nil
}

func (s *orderRepositoryStub) SyncPrice(ctx context.Context, orderID int64) (float64, error) {
	return 0, nil
}

func (s *orderRepositoryStub) GetAllOrderProducts(ctx context.Context, orderID int64) ([]*model.OrderItemProductDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetAllOrderMaterials(ctx context.Context, orderID int64) ([]*model.OrderItemMaterialDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetAllOrderProductsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemProductDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetAllOrderMaterialsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemMaterialDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) Create(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
	if s.createFn == nil {
		return nil, errors.New("unexpected Create call")
	}
	return s.createFn(ctx, deptID, userID, input)
}

func (s *orderRepositoryStub) Update(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
	if s.updateFn == nil {
		return nil, errors.New("unexpected Update call")
	}
	return s.updateFn(ctx, deptID, userID, input)
}

func (s *orderRepositoryStub) GetByID(ctx context.Context, id int64) (*model.OrderDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) PrepareForRemakeByOrderID(ctx context.Context, orderID int64) (*model.OrderDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	return table.TableListResult[model.OrderDTO]{}, nil
}

func (s *orderRepositoryStub) ListByPromotionCodeID(ctx context.Context, deptID int, promotionCodeID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	return table.TableListResult[model.OrderDTO]{}, nil
}

func (s *orderRepositoryStub) GetOrdersBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	return table.TableListResult[model.OrderDTO]{}, nil
}

func (s *orderRepositoryStub) InProgressList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.InProcessOrderDTO], error) {
	return table.TableListResult[model.InProcessOrderDTO]{}, nil
}

func (s *orderRepositoryStub) NewestList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.NewestOrderDTO], error) {
	return table.TableListResult[model.NewestOrderDTO]{}, nil
}

func (s *orderRepositoryStub) CompletedList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.CompletedOrderDTO], error) {
	return table.TableListResult[model.CompletedOrderDTO]{}, nil
}

func (s *orderRepositoryStub) Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.OrderDTO], error) {
	return dbutils.SearchResult[model.OrderDTO]{}, nil
}

func (s *orderRepositoryStub) AdvancedSearch(ctx context.Context, query model.OrderAdvancedSearchQuery) (table.TableListResult[model.OrderDTO], error) {
	return table.TableListResult[model.OrderDTO]{}, nil
}

func (s *orderRepositoryStub) AdvancedSearchReportSummary(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportSummaryDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) AdvancedSearchReportBreakdown(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportBreakdownDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) AdvancedSearchReport(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetProductCatalogOverview(ctx context.Context, deptID int) (*model.ProductCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetProcessCatalogOverview(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetMaterialCatalogOverview(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetMaterialOverview(ctx context.Context, deptID int, materialID int) (*model.MaterialOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetDentistCatalogOverview(ctx context.Context, deptID int) (*model.DentistCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetDentistOverview(ctx context.Context, deptID int, dentistID int) (*model.DentistOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetPatientCatalogOverview(ctx context.Context, deptID int) (*model.PatientCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetPatientOverview(ctx context.Context, deptID int, patientID int) (*model.PatientOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetClinicCatalogOverview(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetClinicOverview(ctx context.Context, deptID int, clinicID int) (*model.ClinicOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetSectionCatalogOverview(ctx context.Context, deptID int) (*model.SectionCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetSectionOverview(ctx context.Context, deptID int, sectionID int) (*model.SectionOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetStaffCatalogOverview(ctx context.Context, deptID int) (*model.StaffCatalogOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) GetStaffOverview(ctx context.Context, deptID int, staffID int64) (*model.StaffOverviewDTO, error) {
	return nil, nil
}

func (s *orderRepositoryStub) Delete(ctx context.Context, id int64) error {
	return nil
}

type orderFileRepositoryStub struct {
	orderExistsFn func(ctx context.Context, deptID int, orderID int64) (bool, error)
	listFn        func(ctx context.Context, orderID int64) ([]*model.OrderFileDTO, error)
	createFn      func(ctx context.Context, params repository.CreateOrderFileParams) (*model.OrderFileDTO, error)
	getByIDFn     func(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error)
	deleteFn      func(ctx context.Context, orderID int64, fileID int64) error
}

func (s *orderFileRepositoryStub) OrderExistsInDepartment(ctx context.Context, deptID int, orderID int64) (bool, error) {
	if s.orderExistsFn == nil {
		return false, errors.New("unexpected OrderExistsInDepartment call")
	}
	return s.orderExistsFn(ctx, deptID, orderID)
}

func (s *orderFileRepositoryStub) ListByOrderID(ctx context.Context, orderID int64) ([]*model.OrderFileDTO, error) {
	if s.listFn == nil {
		return nil, errors.New("unexpected ListByOrderID call")
	}
	return s.listFn(ctx, orderID)
}

func (s *orderFileRepositoryStub) Create(ctx context.Context, params repository.CreateOrderFileParams) (*model.OrderFileDTO, error) {
	if s.createFn == nil {
		return nil, errors.New("unexpected Create call")
	}
	return s.createFn(ctx, params)
}

func (s *orderFileRepositoryStub) GetByID(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error) {
	if s.getByIDFn == nil {
		return nil, errors.New("unexpected GetByID call")
	}
	return s.getByIDFn(ctx, orderID, fileID)
}

func (s *orderFileRepositoryStub) Delete(ctx context.Context, orderID int64, fileID int64) error {
	if s.deleteFn == nil {
		return errors.New("unexpected Delete call")
	}
	return s.deleteFn(ctx, orderID, fileID)
}

type orderItemRepositoryStub struct {
	getLatestOrderItemIDByOrderIDFn func(ctx context.Context, orderID int64) (int64, error)
}

func (s *orderItemRepositoryStub) IsLatest(ctx context.Context, orderItemID int64) (bool, error) {
	return false, nil
}

func (s *orderItemRepositoryStub) IsLatestIfOrderID(ctx context.Context, orderID, orderItemID int64) (bool, error) {
	return false, nil
}

func (s *orderItemRepositoryStub) GetLatestByOrderID(ctx context.Context, orderID int64) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) GetLatestOrderItemIDByOrderID(ctx context.Context, orderID int64) (int64, error) {
	if s.getLatestOrderItemIDByOrderIDFn == nil {
		return 0, errors.New("unexpected GetLatestOrderItemIDByOrderID call")
	}
	return s.getLatestOrderItemIDByOrderIDFn(ctx, orderID)
}

func (s *orderItemRepositoryStub) GetHistoricalByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) ([]*model.OrderItemHistoricalDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) GetTotalPriceByOrderItemID(ctx context.Context, orderItemID int64) (float64, error) {
	return 0, nil
}

func (s *orderItemRepositoryStub) GetTotalPriceByOrderID(ctx context.Context, tx *generated.Tx, orderID int64) (float64, error) {
	return 0, nil
}

func (s *orderItemRepositoryStub) GetAllProductsAndMaterialsByOrderID(ctx context.Context, orderID int64) (model.OrderProductsAndMaterialsDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) GetDeliveryStatus(ctx context.Context, orderID, orderItemID int64) (*string, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) UpdateDeliveryStatus(ctx context.Context, tx *generated.Tx, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) Create(ctx context.Context, tx *generated.Tx, order *model.OrderDTO, input *model.OrderItemUpsertDTO) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) Update(ctx context.Context, tx *generated.Tx, order *model.OrderDTO, input *model.OrderItemUpsertDTO) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) GetOrderIDAndOrderItemIDByCode(ctx context.Context, code string) (int64, int64, error) {
	return 0, 0, nil
}

func (s *orderItemRepositoryStub) GetByID(ctx context.Context, id int64) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) PrepareLatestForRemakeByOrderID(ctx context.Context, orderID int64) (*model.OrderItemDTO, error) {
	return nil, nil
}

func (s *orderItemRepositoryStub) List(ctx context.Context, query table.TableQuery) (table.TableListResult[model.OrderItemDTO], error) {
	return table.TableListResult[model.OrderItemDTO]{}, nil
}

func (s *orderItemRepositoryStub) Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.OrderItemDTO], error) {
	return dbutils.SearchResult[model.OrderItemDTO]{}, nil
}

func (s *orderItemRepositoryStub) Delete(ctx context.Context, id int64) error {
	return nil
}

type fakeStorage struct {
	uploadedPath  string
	uploadedBytes []byte
}

func (s *fakeStorage) Upload(ctx context.Context, path string, file io.Reader) (string, error) {
	data, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}
	s.uploadedPath = path
	s.uploadedBytes = append([]byte(nil), data...)
	return path, nil
}

func TestOrderServiceCreate_NewOrder(t *testing.T) {
	recorder := installServiceHooks(t)
	ctx := context.Background()

	input := makeOrderUpsertFixture("24060001", "Nha khoa A", "Bac si B", "Benh nhan C")
	expected := makeOrderDTOFixture(101, "24060001", "24060001", 1001, 0)
	expected.LeaderIDLatest = ptr(88)
	expected.LeaderNameLatest = ptr("To truong")
	expected.SectionNameLatest = ptr("Section A")
	expected.ProcessNameLatest = ptr("Wax-up")

	var gotDeptID, gotUserID int
	var gotInput *model.OrderUpsertDTO
	svc := &orderService{
		repo: &orderRepositoryStub{
			createFn: func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
				gotDeptID = deptID
				gotUserID = userID
				gotInput = input
				return expected, nil
			},
		},
	}

	result, err := svc.Create(ctx, 7, 22, input)
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if result != expected {
		t.Fatalf("expected result pointer to match repo output")
	}
	if gotDeptID != 7 || gotUserID != 22 {
		t.Fatalf("expected dept/user 7/22, got %d/%d", gotDeptID, gotUserID)
	}
	if gotInput != input {
		t.Fatalf("expected service to pass input through to repo")
	}
	if gotInput.DTO.LatestOrderItemUpsert == nil || gotInput.DTO.LatestOrderItemUpsert.DTO.Products == nil || gotInput.DTO.LatestOrderItemUpsert.DTO.LoanerMaterials == nil {
		t.Fatalf("expected create input to keep product and loaner material lists")
	}

	keys := flattenInvalidations(recorder)
	assertContainsKey(t, keys, "order:id:101")
	assertContainsKey(t, keys, "order:id:101:*")
	assertContainsKey(t, keys, "order:list:dpt7:*")
	assertContainsKey(t, keys, "order:search:dpt7:*")

	if len(recorder.notifications) != 1 {
		t.Fatalf("expected 1 notification call, got %d", len(recorder.notifications))
	}
	notification := recorder.notifications[0]
	if notification.receiverID != 88 || notification.notifierID != 22 || notification.notificationType != "order:checkin" {
		t.Fatalf("unexpected notification call: %#v", notification)
	}

	searchDoc := requirePublishedPayload[*searchmodel.Doc](t, recorder, "search:upsert")
	if searchDoc.EntityType != "order" || searchDoc.EntityID != 101 {
		t.Fatalf("unexpected search payload identity: %#v", searchDoc)
	}
	if searchDoc.Title != "24060001" {
		t.Fatalf("expected search title to use parent order code, got %q", searchDoc.Title)
	}
	if searchDoc.Keywords == nil || *searchDoc.Keywords != "24060001|Nha khoa A|Bac si B|Benh nhan C" {
		t.Fatalf("unexpected search keywords: %#v", searchDoc.Keywords)
	}

	audit := requirePublishedPayload[auditlogmodel.AuditLogRequest](t, recorder, "log:create")
	if audit.Action != "created" || audit.Module != "order" || audit.TargetID != 101 {
		t.Fatalf("unexpected audit payload: %#v", audit)
	}
	if audit.Data["order_id"] != int64(101) || audit.Data["order_item_id"] != int64(1001) {
		t.Fatalf("unexpected audit ids: %#v", audit.Data)
	}
	if derefStringAny(t, audit.Data["order_code"]) != "24060001" {
		t.Fatalf("unexpected audit order_code: %#v", audit.Data["order_code"])
	}
	if derefStringAny(t, audit.Data["order_item_code"]) != "24060001" {
		t.Fatalf("unexpected audit order_item_code: %#v", audit.Data["order_item_code"])
	}
}

func TestOrderServiceCreate_RemakeOrder(t *testing.T) {
	recorder := installServiceHooks(t)
	ctx := context.Background()

	input := makeOrderUpsertFixture("24060001", "Nha khoa A", "Bac si B", "Benh nhan C")
	input.DTO.LatestOrderItemUpsert.DTO.RemakeCount = 1
	expected := makeOrderDTOFixture(102, "24060001", "A24060001", 1002, 1)

	svc := &orderService{
		repo: &orderRepositoryStub{
			createFn: func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
				return expected, nil
			},
		},
	}

	result, err := svc.Create(ctx, 7, 22, input)
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if result != expected {
		t.Fatalf("expected result pointer to match repo output")
	}

	searchDoc := requirePublishedPayload[*searchmodel.Doc](t, recorder, "search:upsert")
	if searchDoc.Title != "24060001" {
		t.Fatalf("expected search title to keep parent order code, got %q", searchDoc.Title)
	}

	audit := requirePublishedPayload[auditlogmodel.AuditLogRequest](t, recorder, "log:create")
	if audit.Action != "created" {
		t.Fatalf("unexpected audit action: %s", audit.Action)
	}
	if derefStringAny(t, audit.Data["order_code"]) != "24060001" {
		t.Fatalf("unexpected remake audit order_code: %#v", audit.Data["order_code"])
	}
	if derefStringAny(t, audit.Data["order_item_code"]) != "A24060001" {
		t.Fatalf("unexpected remake audit order_item_code: %#v", audit.Data["order_item_code"])
	}
}

func TestOrderServiceUpdate_LatestOrder(t *testing.T) {
	recorder := installServiceHooks(t)
	ctx := context.Background()

	input := makeOrderUpsertFixture("24060001", "Nha khoa A", "Bac si B", "Benh nhan C")
	input.DTO.ID = 201
	input.DTO.LatestOrderItemUpsert.DTO.ID = 2001
	expected := makeOrderDTOFixture(201, "24060001", "24060001", 2001, 0)

	var gotInput *model.OrderUpsertDTO
	svc := &orderService{
		repo: &orderRepositoryStub{
			updateFn: func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
				gotInput = input
				return expected, nil
			},
		},
	}

	result, err := svc.Update(ctx, 7, 22, input)
	if err != nil {
		t.Fatalf("Update returned error: %v", err)
	}
	if result != expected {
		t.Fatalf("expected result pointer to match repo output")
	}
	if gotInput == nil || gotInput.DTO.ID != 201 {
		t.Fatalf("expected update input dto.id to be preserved, got %#v", gotInput)
	}

	audit := requirePublishedPayload[auditlogmodel.AuditLogRequest](t, recorder, "log:create")
	if audit.Action != "updated" || audit.TargetID != 201 {
		t.Fatalf("unexpected audit payload: %#v", audit)
	}
	if audit.Data["order_item_id"] != int64(2001) {
		t.Fatalf("unexpected latest order item id in audit: %#v", audit.Data)
	}
	if derefStringAny(t, audit.Data["order_item_code"]) != "24060001" {
		t.Fatalf("unexpected latest order item code in audit: %#v", audit.Data["order_item_code"])
	}
}

func TestOrderServiceUpdate_HistoricalOrder(t *testing.T) {
	recorder := installServiceHooks(t)
	ctx := context.Background()

	input := makeOrderUpsertFixture("24060001", "Nha khoa A", "Bac si B", "Benh nhan C")
	input.DTO.ID = 301
	input.DTO.LatestOrderItemUpsert.DTO.ID = 3002
	expected := makeOrderDTOFixture(301, "24060001", "A24060001", 3002, 1)

	svc := &orderService{
		repo: &orderRepositoryStub{
			updateFn: func(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
				return expected, nil
			},
		},
	}

	result, err := svc.Update(ctx, 7, 22, input)
	if err != nil {
		t.Fatalf("Update returned error: %v", err)
	}
	if result != expected {
		t.Fatalf("expected result pointer to match repo output")
	}

	searchDoc := requirePublishedPayload[*searchmodel.Doc](t, recorder, "search:upsert")
	if searchDoc.Title != "24060001" {
		t.Fatalf("unexpected search title: %q", searchDoc.Title)
	}

	audit := requirePublishedPayload[auditlogmodel.AuditLogRequest](t, recorder, "log:create")
	if audit.Action != "updated" || audit.TargetID != 301 {
		t.Fatalf("unexpected audit payload: %#v", audit)
	}
	if audit.Data["order_item_id"] != int64(3002) {
		t.Fatalf("unexpected historical order item id in audit: %#v", audit.Data)
	}
	if derefStringAny(t, audit.Data["order_item_code"]) != "A24060001" {
		t.Fatalf("unexpected historical order item code in audit: %#v", audit.Data["order_item_code"])
	}
}

func TestOrderFileServiceList_Success(t *testing.T) {
	installServiceHooks(t)
	ctx := context.Background()

	expected := []*model.OrderFileDTO{
		{ID: 1, OrderID: 42, FileName: "rx-1.pdf"},
	}
	svc := &orderFileService{
		repo: &orderFileRepositoryStub{
			orderExistsFn: func(ctx context.Context, deptID int, orderID int64) (bool, error) {
				if deptID != 7 || orderID != 42 {
					t.Fatalf("unexpected order lookup args: dept=%d order=%d", deptID, orderID)
				}
				return true, nil
			},
			listFn: func(ctx context.Context, orderID int64) ([]*model.OrderFileDTO, error) {
				if orderID != 42 {
					t.Fatalf("unexpected list order id: %d", orderID)
				}
				return expected, nil
			},
		},
	}

	got, err := svc.List(ctx, 7, 42)
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("unexpected list result: %#v", got)
	}
}

func TestOrderFileServiceUpload_UsesLatestOrderItem(t *testing.T) {
	installServiceHooks(t)
	ctx := context.Background()

	storage := &fakeStorage{}
	header := newMultipartFileHeader(t, "file", "prescription.png", mustDecodeBase64(t, "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X8xkAAAAASUVORK5CYII="))

	var gotCreate repository.CreateOrderFileParams
	svc := &orderFileService{
		repo: &orderFileRepositoryStub{
			orderExistsFn: func(ctx context.Context, deptID int, orderID int64) (bool, error) {
				return true, nil
			},
			createFn: func(ctx context.Context, params repository.CreateOrderFileParams) (*model.OrderFileDTO, error) {
				gotCreate = params
				return &model.OrderFileDTO{
					ID:          55,
					OrderID:     params.OrderID,
					OrderItemID: params.OrderItemID,
					FileName:    params.FileName,
					FileURL:     params.FileURL,
					FileType:    repository.PrescriptionFileType,
					Format:      params.Format,
					MimeType:    params.MimeType,
					SizeBytes:   params.SizeBytes,
				}, nil
			},
		},
		orderItemRepo: &orderItemRepositoryStub{
			getLatestOrderItemIDByOrderIDFn: func(ctx context.Context, orderID int64) (int64, error) {
				if orderID != 42 {
					t.Fatalf("unexpected latest order item lookup order id: %d", orderID)
				}
				return 4201, nil
			},
		},
		storage: storage,
	}

	got, err := svc.Upload(ctx, 7, 42, header)
	if err != nil {
		t.Fatalf("Upload returned error: %v", err)
	}
	if got.OrderItemID != 4201 {
		t.Fatalf("expected uploaded file dto to use latest order item id, got %d", got.OrderItemID)
	}
	if gotCreate.OrderID != 42 || gotCreate.OrderItemID != 4201 {
		t.Fatalf("unexpected create params: %#v", gotCreate)
	}
	if gotCreate.FileName != "prescription.png" || gotCreate.Format != "png" || gotCreate.MimeType != "image/png" {
		t.Fatalf("unexpected create file metadata: %#v", gotCreate)
	}
	if !strings.HasPrefix(gotCreate.FileURL, "orders/42/") || !strings.HasSuffix(gotCreate.FileURL, ".png") {
		t.Fatalf("unexpected create file url: %s", gotCreate.FileURL)
	}
	if storage.uploadedPath != gotCreate.FileURL {
		t.Fatalf("expected storage path and repo file url to match, got %q vs %q", storage.uploadedPath, gotCreate.FileURL)
	}
	if len(storage.uploadedBytes) == 0 {
		t.Fatal("expected uploaded file bytes to be passed to storage")
	}
}

func TestOrderFileServiceDelete_Success(t *testing.T) {
	installServiceHooks(t)
	ctx := context.Background()

	tmpDir := t.TempDir()
	t.Setenv("STORAGE_ROOT", tmpDir)

	relPath := "orders/42/delete-me.png"
	fullPath := filepath.Join(tmpDir, "files", filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(fullPath, []byte("ok"), 0o600); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	var deletedOrderID, deletedFileID int64
	svc := &orderFileService{
		repo: &orderFileRepositoryStub{
			orderExistsFn: func(ctx context.Context, deptID int, orderID int64) (bool, error) {
				return true, nil
			},
			getByIDFn: func(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error) {
				return &model.OrderFileDTO{
					ID:       fileID,
					OrderID:  orderID,
					FileName: "delete-me.png",
					FileURL:  relPath,
				}, nil
			},
			deleteFn: func(ctx context.Context, orderID int64, fileID int64) error {
				deletedOrderID = orderID
				deletedFileID = fileID
				return nil
			},
		},
	}

	if err := svc.Delete(ctx, 7, 42, 9); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}
	if deletedOrderID != 42 || deletedFileID != 9 {
		t.Fatalf("unexpected delete args: order=%d file=%d", deletedOrderID, deletedFileID)
	}
	if _, err := os.Stat(fullPath); !os.IsNotExist(err) {
		t.Fatalf("expected file to be removed, stat err=%v", err)
	}
}

func TestOrderFileServiceGetFilePath_Success(t *testing.T) {
	installServiceHooks(t)
	ctx := context.Background()

	tmpDir := t.TempDir()
	t.Setenv("STORAGE_ROOT", tmpDir)

	relPath := "orders/42/existing.pdf"
	fullPath := filepath.Join(tmpDir, "files", filepath.FromSlash(relPath))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(fullPath, []byte("pdf"), 0o600); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	svc := &orderFileService{
		repo: &orderFileRepositoryStub{
			orderExistsFn: func(ctx context.Context, deptID int, orderID int64) (bool, error) {
				return true, nil
			},
			getByIDFn: func(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error) {
				return &model.OrderFileDTO{
					ID:       fileID,
					OrderID:  orderID,
					FileName: "existing.pdf",
					FileURL:  relPath,
					MimeType: "application/pdf",
				}, nil
			},
		},
	}

	gotPath, gotMime, gotName, err := svc.GetFilePath(ctx, 7, 42, 3)
	if err != nil {
		t.Fatalf("GetFilePath returned error: %v", err)
	}
	if gotPath != fullPath || gotMime != "application/pdf" || gotName != "existing.pdf" {
		t.Fatalf("unexpected file path response: path=%q mime=%q name=%q", gotPath, gotMime, gotName)
	}
}

func makeOrderUpsertFixture(code, clinicName, dentistName, patientName string) *model.OrderUpsertDTO {
	deliveryDate := time.Date(2026, time.April, 20, 9, 0, 0, 0, time.UTC)
	priority := "urgent"
	status := "received"
	note := "Rang 11"
	loanerType := "loaner"
	loanerStatus := "on_loan"
	productName := "Zirconia"
	productCode := "PRD-01"
	materialName := "Implant driver"

	return &model.OrderUpsertDTO{
		DTO: model.OrderDTO{
			Code:        ptr(code),
			ClinicName:  ptr(clinicName),
			DentistName: ptr(dentistName),
			PatientName: ptr(patientName),
			LatestOrderItemUpsert: &model.OrderItemUpsertDTO{
				DTO: model.OrderItemDTO{
					CustomFields: map[string]any{
						"status":        status,
						"priority":      priority,
						"delivery_date": deliveryDate,
						"note":          note,
					},
					Products: []*model.OrderItemProductDTO{
						{
							ProductID:   11,
							ProductCode: ptr(productCode),
							ProductName: ptr(productName),
							Quantity:    2,
							Note:        ptr(note),
						},
					},
					LoanerMaterials: []*model.OrderItemMaterialDTO{
						{
							MaterialID:   21,
							MaterialName: ptr(materialName),
							Type:         ptr(loanerType),
							Status:       ptr(loanerStatus),
							Quantity:     1,
						},
					},
				},
			},
		},
	}
}

func makeOrderDTOFixture(orderID int64, code, itemCode string, orderItemID int64, remakeCount int) *model.OrderDTO {
	return &model.OrderDTO{
		ID:          orderID,
		Code:        ptr(code),
		CodeLatest:  ptr(itemCode),
		ClinicName:  ptr("Nha khoa A"),
		DentistName: ptr("Bac si B"),
		PatientName: ptr("Benh nhan C"),
		LatestOrderItem: &model.OrderItemDTO{
			ID:           orderItemID,
			OrderID:      orderID,
			Code:         ptr(itemCode),
			CodeOriginal: ptr(code),
			RemakeCount:  remakeCount,
		},
		RemakeCount: ptr(remakeCount),
	}
}

func newMultipartFileHeader(t *testing.T, fieldName, fileName string, content []byte) *multipart.FileHeader {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatalf("CreateFormFile: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("Write multipart content: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("Close writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Body = io.NopCloser(bytes.NewReader(body.Bytes()))

	if err := req.ParseMultipartForm(int64(len(body.Bytes()) + 1024)); err != nil {
		t.Fatalf("ParseMultipartForm: %v", err)
	}

	files := req.MultipartForm.File[fieldName]
	if len(files) != 1 {
		t.Fatalf("expected exactly one multipart file, got %d", len(files))
	}
	return files[0]
}

func mustDecodeBase64(t *testing.T, value string) []byte {
	t.Helper()

	data, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		t.Fatalf("DecodeString: %v", err)
	}
	return data
}

func derefStringAny(t *testing.T, value any) string {
	t.Helper()

	ptrValue, ok := value.(*string)
	if !ok || ptrValue == nil {
		t.Fatalf("expected *string payload, got %T", value)
	}
	return *ptrValue
}

func ptr[T any](value T) *T {
	return &value
}
