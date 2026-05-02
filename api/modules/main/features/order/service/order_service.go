package service

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/order/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	auditlogmodel "github.com/khiemnd777/noah_api/shared/modules/auditlog/model"
	notificationmodule "github.com/khiemnd777/noah_api/shared/modules/notification"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	searchutils "github.com/khiemnd777/noah_api/shared/search"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type OrderService interface {
	Create(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
	Update(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
	GenerateDeliveryNoteByOrderID(ctx context.Context, req DeliveryNotePrintRequest) ([]byte, string, error)
	GenerateQRSlipA5ByOrderID(ctx context.Context, orderID int64) ([]byte, string, error)
	UpdateStatus(ctx context.Context, deptID, userID int, orderItemProcessID int64, status string) (*model.OrderItemDTO, error)
	UpdateDeliveryStatus(ctx context.Context, deptID, userID int, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error)
	GetDeliveryStatus(ctx context.Context, deptID int, orderID, orderItemID int64) (*string, error)
	GetByID(ctx context.Context, id int64) (*model.OrderDTO, error)
	GetByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) (*model.OrderDTO, error)
	PrepareForRemakeByOrderID(ctx context.Context, orderID int64) (*model.OrderDTO, error)
	GetAllOrderProducts(ctx context.Context, orderID int64) ([]*model.OrderItemProductDTO, error)
	GetAllOrderMaterials(ctx context.Context, orderID int64) ([]*model.OrderItemMaterialDTO, error)
	List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	ListByPromotionCodeID(ctx context.Context, deptID int, promotionCodeID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	GetOrdersBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	InProgressList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.InProcessOrderDTO], error)
	NewestList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.NewestOrderDTO], error)
	CompletedList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.CompletedOrderDTO], error)
	Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.OrderDTO], error)
	AdvancedSearch(ctx context.Context, deptID int, query model.OrderAdvancedSearchQuery, canViewDepartment bool) (table.TableListResult[model.OrderDTO], error)
	AdvancedSearchReportSummary(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportSummaryDTO, error)
	AdvancedSearchReportBreakdown(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportBreakdownDTO, error)
	AdvancedSearchReport(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportDTO, error)
	GetProductCatalogOverview(ctx context.Context, deptID int) (*model.ProductCatalogOverviewDTO, error)
	GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error)
	GetProcessCatalogOverview(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewDTO, error)
	GetMaterialCatalogOverview(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewDTO, error)
	GetMaterialOverview(ctx context.Context, deptID int, materialID int) (*model.MaterialOverviewDTO, error)
	GetDentistCatalogOverview(ctx context.Context, deptID int) (*model.DentistCatalogOverviewDTO, error)
	GetDentistOverview(ctx context.Context, deptID int, dentistID int) (*model.DentistOverviewDTO, error)
	GetPatientCatalogOverview(ctx context.Context, deptID int) (*model.PatientCatalogOverviewDTO, error)
	GetPatientOverview(ctx context.Context, deptID int, patientID int) (*model.PatientOverviewDTO, error)
	GetClinicCatalogOverview(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewDTO, error)
	GetClinicOverview(ctx context.Context, deptID int, clinicID int) (*model.ClinicOverviewDTO, error)
	GetSectionCatalogOverview(ctx context.Context, deptID int) (*model.SectionCatalogOverviewDTO, error)
	GetSectionOverview(ctx context.Context, deptID int, sectionID int) (*model.SectionOverviewDTO, error)
	GetStaffCatalogOverview(ctx context.Context, deptID int) (*model.StaffCatalogOverviewDTO, error)
	GetStaffOverview(ctx context.Context, deptID int, staffID int64) (*model.StaffOverviewDTO, error)
	Delete(ctx context.Context, deptID int, id int64) error
	SyncPrice(ctx context.Context, orderID int64) (float64, error)
}

type orderService struct {
	repo  repository.OrderRepository
	deps  *module.ModuleDeps[config.ModuleConfig]
	cfMgr *customfields.Manager
}

type relatedLeaderNotification struct {
	LeaderID            int
	LeaderName          string
	RelatedSectionNames []string
	RelatedProcessNames []string
}

func NewOrderService(repo repository.OrderRepository, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) OrderService {
	return &orderService{repo: repo, deps: deps, cfMgr: cfMgr}
}

// ----------------------------------------------------------------------------
// Cache Keys
// ----------------------------------------------------------------------------

func kOrderByID(id int64) string {
	return fmt.Sprintf("order:id:%d", id)
}

func kOrderByIDAll(id int64) string {
	return fmt.Sprintf("order:id:%d:*", id)
}

func kOrderAll(deptID int) []string {
	return []string{
		kOrderListAll(deptID),
		kOrderSearchAll(deptID),
		"order:advanced-report:summary:*",
		"order:advanced-report:breakdown:*",
		"order:product-overview:*",
		"order:process-overview:*",
		"order:material-overview:*",
		"order:dentist-overview:*",
		"order:patient-overview:*",
		"order:clinic-overview:*",
		"order:section-overview:*",
		"order:staff-overview:*",
		"dentist:orders:*",
		"patient:orders:*",
		"clinic:orders:*",
		kOrderSectionAll(),
		kOrderPromotionAll(),
		fmt.Sprintf("order:assigned:dpt%d:*", deptID),
		"order:item:material:loaner:*",
		fmt.Sprintf("order:list:inprogress:dpt%d:*", deptID),
		fmt.Sprintf("order:list:newest:dpt%d:*", deptID),
		fmt.Sprintf("order:list:completed:dpt%d:*", deptID),
		fmt.Sprintf("dashboard:production-planning:dpt%d:*", deptID),
	}
}

func broadcastProductionPlanningChanged(deptID int) {
	broadcastToDeptHook(deptID, "dashboard:production_planning", nil)
	broadcastToDeptHook(deptID, "order:changed", nil)
}

func kOrderListAll(deptID int) string {
	return fmt.Sprintf("order:list:dpt%d:*", deptID)
}

func kOrderSectionAll() string {
	return "order:section:*"
}

func kOrderPromotionAll() string {
	return "order:promotion:*"
}

func kOrderSearchAll(deptID int) string {
	return fmt.Sprintf("order:search:dpt%d:*", deptID)
}

func kOrderList(deptID int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("order:list:dpt%d:l%d:p%d:o%s:d%s", deptID, q.Limit, q.Page, orderBy, q.Direction)
}

func kOrderSectionList(sectionID int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("order:section:%d:list:l%d:p%d:o%s:d%s", sectionID, q.Limit, q.Page, orderBy, q.Direction)
}

func kOrderPromotionList(deptID int, promotionCodeID int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("order:promotion:dpt%d:%d:list:l%d:p%d:o%s:d%s", deptID, promotionCodeID, q.Limit, q.Page, orderBy, q.Direction)
}

func kOrderInProgressList(deptID int, q table.TableQuery) string {
	return fmt.Sprintf("order:list:inprogress:dpt%d:l%d:p%d", deptID, q.Limit, q.Page)
}

func kOrderNewestList(deptID int, q table.TableQuery) string {
	return fmt.Sprintf("order:list:newest:dpt%d:l%d:p%d", deptID, q.Limit, q.Page)
}

func kOrderCompletedList(deptID int, q table.TableQuery) string {
	return fmt.Sprintf("order:list:completed:dpt%d:l%d:p%d", deptID, q.Limit, q.Page)
}

func kOrderSearch(deptID int, q dbutils.SearchQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("order:search:dpt%d:k%s:l%d:p%d:o%s:d%s", deptID, q.Keyword, q.Limit, q.Page, orderBy, q.Direction)
}

func kOrderAdvancedReportSummary(filter model.OrderAdvancedSearchFilter) string {
	return fmt.Sprintf("order:advanced-report:summary:%s", serializeAdvancedSearchFilter(filter))
}

func kOrderAdvancedReportBreakdown(filter model.OrderAdvancedSearchFilter) string {
	return fmt.Sprintf("order:advanced-report:breakdown:%s", serializeAdvancedSearchFilter(filter))
}

func kOrderProductOverview(deptID int, productID int) string {
	return fmt.Sprintf("order:product-overview:dpt%d:product:%d", deptID, productID)
}

func kOrderProductCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:product-overview:dpt%d:catalog", deptID)
}

func kOrderProcessCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:process-overview:dpt%d:catalog", deptID)
}

func kOrderMaterialOverview(deptID int, materialID int) string {
	return fmt.Sprintf("order:material-overview:dpt%d:material:%d", deptID, materialID)
}

func kOrderMaterialCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:material-overview:dpt%d:catalog", deptID)
}

func kOrderDentistOverview(deptID int, dentistID int) string {
	return fmt.Sprintf("order:dentist-overview:dpt%d:dentist:%d", deptID, dentistID)
}

func kOrderDentistCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:dentist-overview:dpt%d:catalog", deptID)
}

func kOrderPatientOverview(deptID int, patientID int) string {
	return fmt.Sprintf("order:patient-overview:dpt%d:patient:%d", deptID, patientID)
}

func kOrderPatientCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:patient-overview:dpt%d:catalog", deptID)
}

func kOrderClinicOverview(deptID int, clinicID int) string {
	return fmt.Sprintf("order:clinic-overview:dpt%d:clinic:%d", deptID, clinicID)
}

func kOrderClinicCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:clinic-overview:dpt%d:catalog", deptID)
}

func kOrderSectionOverview(deptID int, sectionID int) string {
	return fmt.Sprintf("order:section-overview:dpt%d:section:%d", deptID, sectionID)
}

func kOrderSectionCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:section-overview:dpt%d:catalog", deptID)
}

func kOrderStaffOverview(deptID int, staffID int64) string {
	return fmt.Sprintf("order:staff-overview:dpt%d:staff:%d", deptID, staffID)
}

func kOrderStaffCatalogOverview(deptID int) string {
	return fmt.Sprintf("order:staff-overview:dpt%d:catalog", deptID)
}

func (s *orderService) Create(ctx context.Context, deptID int, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
	dto, err := s.repo.Create(ctx, deptID, userID, input)
	if err != nil {
		return nil, err
	}

	if dto != nil && dto.ID > 0 {
		invalidateKeysHook(kOrderByID(dto.ID), kOrderByIDAll(dto.ID))
	}
	invalidateKeysHook(kOrderAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	for _, leader := range s.resolveRelatedLeaders(dto) {
		notifyHook(leader.LeaderID, userID, notificationmodule.TypeOrderNew, map[string]any{
			"leader_id":             leader.LeaderID,
			"leader_name":           leader.LeaderName,
			"order_id":              dto.ID,
			"order_item_id":         dto.LatestOrderItem.ID,
			"order_item_code":       dto.LatestOrderItem.Code,
			"related_section_names": leader.RelatedSectionNames,
			"related_process_names": leader.RelatedProcessNames,
			"related_section_count": len(leader.RelatedSectionNames),
			"related_process_count": len(leader.RelatedProcessNames),
			"href":                  fmt.Sprintf("/order/%d", dto.ID),
		})
	}
	broadcastAllHook("order:newest", nil)

	publishAsyncHook("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	publishAsyncHook("dashboard:daily:sales", &model.SalesDailyUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	broadcastToDeptHook(deptID, "dashboard:daily:active:stats", nil)
	broadcastToDeptHook(deptID, "dashboard:statuses", nil)
	broadcastToDeptHook(deptID, "dashboard:due_today", nil)
	broadcastToDeptHook(deptID, "dashboard:active_today", nil)
	broadcastToDeptHook(deptID, "dashboard:sales_summary", nil)
	broadcastToDeptHook(deptID, "dashboard:sales_daily", nil)
	broadcastProductionPlanningChanged(deptID)

	logger.Debug("[order_created]", "order_id", dto.ID, "created_by", userID)

	// Audit log
	publishAsyncHook("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "created",
		TargetID: dto.ID,
		Data: map[string]any{
			"order_id":        dto.ID,
			"order_item_id":   dto.LatestOrderItem.ID,
			"user_id":         userID,
			"order_code":      dto.Code,
			"order_item_code": dto.CodeLatest,
		},
	})

	return dto, nil
}

func (s *orderService) resolveRelatedLeaders(dto *model.OrderDTO) []relatedLeaderNotification {
	if dto == nil || dto.LatestOrderItem == nil || len(dto.LatestOrderItem.OrderItemProcesses) == 0 {
		return nil
	}

	byLeader := make(map[int]*relatedLeaderNotification)

	for _, process := range dto.LatestOrderItem.OrderItemProcesses {
		if process == nil || process.LeaderID == nil {
			continue
		}

		leaderID := *process.LeaderID
		entry, exists := byLeader[leaderID]
		if !exists {
			entry = &relatedLeaderNotification{LeaderID: leaderID}
			byLeader[leaderID] = entry
		}

		if entry.LeaderName == "" && process.LeaderName != nil {
			entry.LeaderName = *process.LeaderName
		}
		if process.SectionName != nil {
			entry.RelatedSectionNames = appendUniqueString(entry.RelatedSectionNames, *process.SectionName)
		}
		if process.ProcessName != nil {
			entry.RelatedProcessNames = appendUniqueString(entry.RelatedProcessNames, *process.ProcessName)
		}
	}

	leaderIDs := make([]int, 0, len(byLeader))
	for leaderID := range byLeader {
		leaderIDs = append(leaderIDs, leaderID)
	}
	slices.Sort(leaderIDs)

	result := make([]relatedLeaderNotification, 0, len(leaderIDs))
	for _, leaderID := range leaderIDs {
		entry := byLeader[leaderID]
		slices.Sort(entry.RelatedSectionNames)
		slices.Sort(entry.RelatedProcessNames)
		result = append(result, *entry)
	}

	return result
}

func appendUniqueString(items []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return items
	}

	for _, item := range items {
		if item == value {
			return items
		}
	}

	return append(items, value)
}

func (s *orderService) GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error) {
	return cache.Get(kOrderProductOverview(deptID, productID), cache.TTLShort, func() (*model.ProductOverviewDTO, error) {
		return s.repo.GetProductOverview(ctx, deptID, productID)
	})
}

func (s *orderService) GetProductCatalogOverview(ctx context.Context, deptID int) (*model.ProductCatalogOverviewDTO, error) {
	return cache.Get(kOrderProductCatalogOverview(deptID), cache.TTLShort, func() (*model.ProductCatalogOverviewDTO, error) {
		return s.repo.GetProductCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetProcessCatalogOverview(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewDTO, error) {
	return cache.Get(kOrderProcessCatalogOverview(deptID), cache.TTLShort, func() (*model.ProcessCatalogOverviewDTO, error) {
		return s.repo.GetProcessCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetMaterialOverview(ctx context.Context, deptID int, materialID int) (*model.MaterialOverviewDTO, error) {
	return cache.Get(kOrderMaterialOverview(deptID, materialID), cache.TTLShort, func() (*model.MaterialOverviewDTO, error) {
		return s.repo.GetMaterialOverview(ctx, deptID, materialID)
	})
}

func (s *orderService) GetMaterialCatalogOverview(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewDTO, error) {
	return cache.Get(kOrderMaterialCatalogOverview(deptID), cache.TTLShort, func() (*model.MaterialCatalogOverviewDTO, error) {
		return s.repo.GetMaterialCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetDentistOverview(ctx context.Context, deptID int, dentistID int) (*model.DentistOverviewDTO, error) {
	return cache.Get(kOrderDentistOverview(deptID, dentistID), cache.TTLShort, func() (*model.DentistOverviewDTO, error) {
		return s.repo.GetDentistOverview(ctx, deptID, dentistID)
	})
}

func (s *orderService) GetDentistCatalogOverview(ctx context.Context, deptID int) (*model.DentistCatalogOverviewDTO, error) {
	return cache.Get(kOrderDentistCatalogOverview(deptID), cache.TTLShort, func() (*model.DentistCatalogOverviewDTO, error) {
		return s.repo.GetDentistCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetPatientOverview(ctx context.Context, deptID int, patientID int) (*model.PatientOverviewDTO, error) {
	return cache.Get(kOrderPatientOverview(deptID, patientID), cache.TTLShort, func() (*model.PatientOverviewDTO, error) {
		return s.repo.GetPatientOverview(ctx, deptID, patientID)
	})
}

func (s *orderService) GetPatientCatalogOverview(ctx context.Context, deptID int) (*model.PatientCatalogOverviewDTO, error) {
	return cache.Get(kOrderPatientCatalogOverview(deptID), cache.TTLShort, func() (*model.PatientCatalogOverviewDTO, error) {
		return s.repo.GetPatientCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetClinicOverview(ctx context.Context, deptID int, clinicID int) (*model.ClinicOverviewDTO, error) {
	return cache.Get(kOrderClinicOverview(deptID, clinicID), cache.TTLShort, func() (*model.ClinicOverviewDTO, error) {
		return s.repo.GetClinicOverview(ctx, deptID, clinicID)
	})
}

func (s *orderService) GetClinicCatalogOverview(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewDTO, error) {
	return cache.Get(kOrderClinicCatalogOverview(deptID), cache.TTLShort, func() (*model.ClinicCatalogOverviewDTO, error) {
		return s.repo.GetClinicCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetSectionOverview(ctx context.Context, deptID int, sectionID int) (*model.SectionOverviewDTO, error) {
	return cache.Get(kOrderSectionOverview(deptID, sectionID), cache.TTLShort, func() (*model.SectionOverviewDTO, error) {
		return s.repo.GetSectionOverview(ctx, deptID, sectionID)
	})
}

func (s *orderService) GetSectionCatalogOverview(ctx context.Context, deptID int) (*model.SectionCatalogOverviewDTO, error) {
	return cache.Get(kOrderSectionCatalogOverview(deptID), cache.TTLShort, func() (*model.SectionCatalogOverviewDTO, error) {
		return s.repo.GetSectionCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetStaffCatalogOverview(ctx context.Context, deptID int) (*model.StaffCatalogOverviewDTO, error) {
	return cache.Get(kOrderStaffCatalogOverview(deptID), cache.TTLShort, func() (*model.StaffCatalogOverviewDTO, error) {
		return s.repo.GetStaffCatalogOverview(ctx, deptID)
	})
}

func (s *orderService) GetStaffOverview(ctx context.Context, deptID int, staffID int64) (*model.StaffOverviewDTO, error) {
	return cache.Get(kOrderStaffOverview(deptID, staffID), cache.TTLShort, func() (*model.StaffOverviewDTO, error) {
		return s.repo.GetStaffOverview(ctx, deptID, staffID)
	})
}

func (s *orderService) Update(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
	dto, err := s.repo.Update(ctx, deptID, userID, input)
	if err != nil {
		return nil, err
	}

	if dto != nil {
		invalidateKeysHook(kOrderByID(dto.ID), kOrderByIDAll(dto.ID))
	}
	invalidateKeysHook(kOrderAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	publishAsyncHook("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	broadcastToDeptHook(deptID, "dashboard:daily:active:stats", nil)
	broadcastToDeptHook(deptID, "dashboard:statuses", nil)
	broadcastToDeptHook(deptID, "dashboard:due_today", nil)
	broadcastToDeptHook(deptID, "dashboard:active_today", nil)
	broadcastProductionPlanningChanged(deptID)

	publishAsyncHook("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "updated",
		TargetID: dto.ID,
		Data: map[string]any{
			"order_id":        dto.ID,
			"order_item_id":   dto.LatestOrderItem.ID,
			"user_id":         userID,
			"order_code":      dto.Code,
			"order_item_code": dto.CodeLatest,
		},
	})
	return dto, nil
}

func (s *orderService) UpdateStatus(ctx context.Context, deptID, userID int, orderItemProcessID int64, status string) (*model.OrderItemDTO, error) {
	out, err := s.repo.UpdateStatus(ctx, orderItemProcessID, status)
	if err != nil {
		return nil, err
	}

	if out != nil {
		invalidateKeysHook(
			kOrderByID(out.OrderID),
			kOrderByIDAll(out.OrderID),
		)
	}
	invalidateKeysHook(kOrderAll(deptID)...)

	publishAsyncHook("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	broadcastToDeptHook(deptID, "dashboard:daily:active:stats", nil)
	broadcastToDeptHook(deptID, "dashboard:statuses", nil)
	broadcastToDeptHook(deptID, "dashboard:due_today", nil)
	broadcastToDeptHook(deptID, "dashboard:active_today", nil)
	broadcastProductionPlanningChanged(deptID)

	publishAsyncHook("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "updated:status:change",
		TargetID: out.ID,
		Data: map[string]any{
			"order_id":        out.OrderID,
			"order_item_id":   out.ID,
			"user_id":         userID,
			"order_code":      out.CodeOriginal,
			"order_item_code": out.Code,
			"status":          out.Status,
		},
	})

	return out, nil
}

func (s *orderService) UpdateDeliveryStatus(ctx context.Context, deptID, userID int, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error) {
	out, err := s.repo.UpdateDeliveryStatus(ctx, orderID, orderItemID, status)
	if err != nil {
		return nil, err
	}

	if out != nil {
		invalidateKeysHook(
			kOrderByID(out.OrderID),
			kOrderByIDAll(out.OrderID),
		)
	}
	invalidateKeysHook(kOrderAll(deptID)...)

	// Later: broadcast to delivery dashboard only
	// realtime.BroadcastToDept(deptID, "dashboard:statuses", nil)
	broadcastProductionPlanningChanged(deptID)

	publishAsyncHook("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "updated:delivery-status:change",
		TargetID: out.ID,
		Data: map[string]any{
			"order_id":        out.OrderID,
			"order_item_id":   out.ID,
			"user_id":         userID,
			"order_code":      out.CodeOriginal,
			"order_item_code": out.Code,
			"delivery_status": out.Status,
		},
	})

	return out, nil
}

func (s *orderService) GetDeliveryStatus(ctx context.Context, deptID int, orderID, orderItemID int64) (*string, error) {
	return s.repo.GetDeliveryStatus(ctx, orderID, orderItemID)
}

func (s *orderService) upsertSearch(ctx context.Context, deptID int, dto *model.OrderDTO) {
	if dto == nil {
		return
	}

	kwPtr, _ := searchutils.BuildKeywords(
		ctx,
		s.cfMgr,
		"order",
		[]any{dto.Code, dto.ClinicName, dto.DentistName, dto.PatientName},
		dto.CustomFields,
	)

	publishAsyncHook("search:upsert", &searchmodel.Doc{
		EntityType: "order",
		EntityID:   int64(dto.ID),
		Title:      utils.DerefString(dto.Code),
		Subtitle:   nil,
		Keywords:   &kwPtr,
		Content:    nil,
		Attributes: map[string]any{},
		OrgID:      utils.Ptr(int64(deptID)),
		OwnerID:    nil,
	})
}

func (s *orderService) unlinkSearch(id int64) {
	publishAsyncHook("search:unlink", &searchmodel.UnlinkDoc{
		EntityType: "order",
		EntityID:   id,
	})
}

func (s *orderService) GetByID(ctx context.Context, id int64) (*model.OrderDTO, error) {
	return s.repo.GetByID(ctx, id)
	// return cache.Get(kOrderByID(id), cache.TTLMedium, func() (*model.OrderDTO, error) {
	// 	return s.repo.GetByID(ctx, id)
	// })
}

func (s *orderService) GetByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) (*model.OrderDTO, error) {
	return s.repo.GetByOrderIDAndOrderItemID(ctx, orderID, orderItemID)
	// return cache.Get(kOrderByOrderIDAndOrderItemID(orderID, orderItemID), cache.TTLMedium, func() (*model.OrderDTO, error) {
	// 	return s.repo.GetByOrderIDAndOrderItemID(ctx, orderID, orderItemID)
	// })
}

func (s *orderService) PrepareForRemakeByOrderID(ctx context.Context, orderID int64) (*model.OrderDTO, error) {
	return s.repo.PrepareForRemakeByOrderID(ctx, orderID)
}

func (s *orderService) GetAllOrderProducts(ctx context.Context, orderID int64) ([]*model.OrderItemProductDTO, error) {
	return s.repo.GetAllOrderProducts(ctx, orderID)
}

func (s *orderService) GetAllOrderMaterials(ctx context.Context, orderID int64) ([]*model.OrderItemMaterialDTO, error) {
	return s.repo.GetAllOrderMaterials(ctx, orderID)
}

func (s *orderService) SyncPrice(ctx context.Context, orderID int64) (float64, error) {
	return s.repo.SyncPrice(ctx, orderID)
}

func (s *orderService) NewestList(ctx context.Context, deptID int, q table.TableQuery) (table.TableListResult[model.NewestOrderDTO], error) {
	type boxed = table.TableListResult[model.NewestOrderDTO]

	query := q
	query.OrderBy = utils.Ptr("created_at")
	query.Direction = "desc"
	key := kOrderNewestList(deptID, query)

	ptr, err := cache.Get(key, cache.TTLLong, func() (*boxed, error) {
		list, err := s.repo.NewestList(ctx, deptID, query)
		if err != nil {
			return nil, err
		}
		return &list, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *orderService) CompletedList(ctx context.Context, deptID int, q table.TableQuery) (table.TableListResult[model.CompletedOrderDTO], error) {
	type boxed = table.TableListResult[model.CompletedOrderDTO]

	query := q
	query.OrderBy = utils.Ptr("updated_at")
	query.Direction = "desc"
	key := kOrderCompletedList(deptID, query)

	ptr, err := cache.Get(key, cache.TTLLong, func() (*boxed, error) {
		list, err := s.repo.CompletedList(ctx, deptID, query)
		if err != nil {
			return nil, err
		}
		return &list, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *orderService) InProgressList(ctx context.Context, deptID int, q table.TableQuery) (table.TableListResult[model.InProcessOrderDTO], error) {
	type boxed = table.TableListResult[model.InProcessOrderDTO]

	query := q
	query.OrderBy = utils.Ptr("delivery_date")
	query.Direction = "desc"
	key := kOrderInProgressList(deptID, query)

	ptr, err := cache.Get(key, cache.TTLLong, func() (*boxed, error) {
		list, err := s.repo.InProgressList(ctx, deptID, query)
		if err != nil {
			return nil, err
		}
		return &list, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	now := time.Now()
	items := make([]*model.InProcessOrderDTO, 0, len(ptr.Items))
	for _, item := range ptr.Items {
		if item == nil {
			items = append(items, nil)
			continue
		}
		itemCopy := *item
		itemCopy.Now = &now
		items = append(items, &itemCopy)
	}
	res := *ptr
	res.Items = items
	return res, nil
}

func (s *orderService) List(ctx context.Context, deptID int, q table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	type boxed = table.TableListResult[model.OrderDTO]
	key := kOrderList(deptID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.List(ctx, deptID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	res := *ptr
	res.Items = enrichOrderPlanningRisk(res.Items, time.Now())
	return res, nil
}

func (s *orderService) ListByPromotionCodeID(ctx context.Context, deptID int, promotionCodeID int, q table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	type boxed = table.TableListResult[model.OrderDTO]
	key := kOrderPromotionList(deptID, promotionCodeID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.ListByPromotionCodeID(ctx, deptID, promotionCodeID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	res := *ptr
	res.Items = enrichOrderPlanningRisk(res.Items, time.Now())
	return res, nil
}

func (s *orderService) GetOrdersBySectionID(ctx context.Context, sectionID int, q table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	type boxed = table.TableListResult[model.OrderDTO]
	key := kOrderSectionList(sectionID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.GetOrdersBySectionID(ctx, sectionID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	res := *ptr
	res.Items = enrichOrderPlanningRisk(res.Items, time.Now())
	return res, nil
}

func (s *orderService) Delete(ctx context.Context, deptID int, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	invalidateKeysHook(kOrderAll(deptID)...)
	invalidateKeysHook(kOrderByID(id))

	broadcastAllHook("order:newest", nil)

	publishAsyncHook("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	publishAsyncHook("dashboard:daily:sales", &model.SalesDailyUpsert{
		DepartmentID: deptID,
		StatAt:       time.Now(),
	})

	broadcastToDeptHook(deptID, "dashboard:daily:active:stats", nil)
	broadcastToDeptHook(deptID, "dashboard:statuses", nil)
	broadcastToDeptHook(deptID, "dashboard:due_today", nil)
	broadcastToDeptHook(deptID, "dashboard:active_today", nil)
	broadcastToDeptHook(deptID, "dashboard:sales_summary", nil)
	broadcastToDeptHook(deptID, "dashboard:sales_daily", nil)
	broadcastProductionPlanningChanged(deptID)

	s.unlinkSearch(id)
	return nil
}

func (s *orderService) Search(ctx context.Context, deptID int, q dbutils.SearchQuery) (dbutils.SearchResult[model.OrderDTO], error) {
	type boxed = dbutils.SearchResult[model.OrderDTO]
	key := kOrderSearch(deptID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.Search(ctx, deptID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	res := *ptr
	res.Items = enrichOrderPlanningRisk(res.Items, time.Now())
	return res, nil
}

func (s *orderService) AdvancedSearch(ctx context.Context, deptID int, query model.OrderAdvancedSearchQuery, canViewDepartment bool) (table.TableListResult[model.OrderDTO], error) {
	normalized := s.normalizeAdvancedSearchQuery(deptID, query, canViewDepartment)
	res, err := s.repo.AdvancedSearch(ctx, normalized)
	if err != nil {
		return res, err
	}
	res.Items = enrichOrderPlanningRisk(res.Items, time.Now())
	return res, nil
}

func (s *orderService) AdvancedSearchReportSummary(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportSummaryDTO, error) {
	normalized := s.normalizeAdvancedSearchFilter(deptID, filter, canViewDepartment)
	key := kOrderAdvancedReportSummary(normalized)

	return cache.Get(key, 60*time.Second, func() (*model.OrderAdvancedSearchReportSummaryDTO, error) {
		return s.repo.AdvancedSearchReportSummary(ctx, normalized)
	})
}

func (s *orderService) AdvancedSearchReportBreakdown(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportBreakdownDTO, error) {
	normalized := s.normalizeAdvancedSearchFilter(deptID, filter, canViewDepartment)
	key := kOrderAdvancedReportBreakdown(normalized)

	return cache.Get(key, 300*time.Second, func() (*model.OrderAdvancedSearchReportBreakdownDTO, error) {
		return s.repo.AdvancedSearchReportBreakdown(ctx, normalized)
	})
}

func (s *orderService) AdvancedSearchReport(ctx context.Context, deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) (*model.OrderAdvancedSearchReportDTO, error) {
	normalized := s.normalizeAdvancedSearchFilter(deptID, filter, canViewDepartment)
	summary, err := s.AdvancedSearchReportSummary(ctx, deptID, normalized, true)
	if err != nil {
		return nil, err
	}

	breakdown, err := s.AdvancedSearchReportBreakdown(ctx, deptID, normalized, true)
	if err != nil {
		return nil, err
	}

	return &model.OrderAdvancedSearchReportDTO{
		OrderAdvancedSearchReportSummaryDTO:   *summary,
		OrderAdvancedSearchReportBreakdownDTO: *breakdown,
	}, nil
}

func (s *orderService) normalizeAdvancedSearchQuery(deptID int, query model.OrderAdvancedSearchQuery, canViewDepartment bool) model.OrderAdvancedSearchQuery {
	query.OrderAdvancedSearchFilter = s.normalizeAdvancedSearchFilter(deptID, query.OrderAdvancedSearchFilter, canViewDepartment)

	if query.Limit <= 0 {
		query.Limit = table.DefaultLimit
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	query.Offset = (query.Page - 1) * query.Limit

	if query.OrderBy == nil || utils.DerefString(query.OrderBy) == "" {
		query.OrderBy = utils.Ptr("created_at")
	}
	if query.Direction == "" {
		query.Direction = "desc"
	}

	return query
}

func (s *orderService) normalizeAdvancedSearchFilter(deptID int, filter model.OrderAdvancedSearchFilter, canViewDepartment bool) model.OrderAdvancedSearchFilter {
	if !canViewDepartment || filter.DepartmentID == nil || *filter.DepartmentID <= 0 {
		filter.DepartmentID = utils.Ptr(deptID)
	}

	filter.CategoryIDs = normalizeIntSlice(filter.CategoryIDs)
	filter.ProductIDs = normalizeIntSlice(filter.ProductIDs)
	filter.OrderCode = normalizeStringPtr(filter.OrderCode)
	filter.ClinicName = normalizeStringPtr(filter.ClinicName)
	filter.DentistName = normalizeStringPtr(filter.DentistName)
	filter.PatientName = normalizeStringPtr(filter.PatientName)
	filter.CreatedYear = normalizePositiveIntPtr(filter.CreatedYear)
	filter.CreatedMonth = normalizeMonthPtr(filter.CreatedMonth)
	filter.DeliveryYear = normalizePositiveIntPtr(filter.DeliveryYear)
	filter.DeliveryMonth = normalizeMonthPtr(filter.DeliveryMonth)

	return filter
}

func normalizeIntSlice(values []int) []int {
	if len(values) == 0 {
		return nil
	}

	seen := make(map[int]struct{}, len(values))
	out := make([]int, 0, len(values))
	for _, value := range values {
		if value <= 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizePositiveIntPtr(value *int) *int {
	if value == nil || *value <= 0 {
		return nil
	}
	return value
}

func normalizeMonthPtr(value *int) *int {
	if value == nil || *value < 1 || *value > 12 {
		return nil
	}
	return value
}

func serializeAdvancedSearchFilter(filter model.OrderAdvancedSearchFilter) string {
	parts := []string{
		fmt.Sprintf("department=%d", utils.DerefInt(filter.DepartmentID)),
		fmt.Sprintf("categories=%s", serializeIntSlice(filter.CategoryIDs)),
		fmt.Sprintf("products=%s", serializeIntSlice(filter.ProductIDs)),
		fmt.Sprintf("order_code=%s", utils.DerefString(filter.OrderCode)),
		fmt.Sprintf("clinic=%s", utils.DerefString(filter.ClinicName)),
		fmt.Sprintf("dentist=%s", utils.DerefString(filter.DentistName)),
		fmt.Sprintf("patient=%s", utils.DerefString(filter.PatientName)),
		fmt.Sprintf("created_year=%d", utils.DerefInt(filter.CreatedYear)),
		fmt.Sprintf("created_month=%d", utils.DerefInt(filter.CreatedMonth)),
		fmt.Sprintf("delivery_year=%d", utils.DerefInt(filter.DeliveryYear)),
		fmt.Sprintf("delivery_month=%d", utils.DerefInt(filter.DeliveryMonth)),
	}

	return strings.Join(parts, "|")
}

func enrichOrderPlanningRisk(items []*model.OrderDTO, now time.Time) []*model.OrderDTO {
	out := make([]*model.OrderDTO, 0, len(items))
	for _, item := range items {
		if item == nil {
			out = append(out, nil)
			continue
		}
		copyItem := *item
		applyOrderPlanningRisk(&copyItem, now)
		out = append(out, &copyItem)
	}
	return out
}

func applyOrderPlanningRisk(item *model.OrderDTO, now time.Time) {
	if item == nil {
		return
	}
	item.RiskBucket = model.PlanningRiskBucketNormal
	item.DeliveryAt = item.DeliveryDate
	item.ETA = item.DeliveryDate
	if item.DeliveryDate == nil {
		return
	}
	remaining := int(item.DeliveryDate.Sub(now).Minutes())
	item.RemainingMinutes = &remaining
	if remaining < 0 {
		lateBy := -remaining
		item.LateByMinutes = &lateBy
		item.PredictedLate = true
		item.RiskBucket = model.PlanningRiskBucketOverdue
		item.RiskScore = 100
		return
	}
	switch {
	case remaining <= 120:
		item.RiskBucket = model.PlanningRiskBucketDue2h
		item.RiskScore = 90
	case remaining <= 240:
		item.RiskBucket = model.PlanningRiskBucketDue4h
		item.RiskScore = 70
	case remaining <= 360:
		item.RiskBucket = model.PlanningRiskBucketDue6h
		item.RiskScore = 50
	default:
		item.RiskBucket = model.PlanningRiskBucketNormal
		item.RiskScore = 0
	}
}

func serializeIntSlice(values []int) string {
	if len(values) == 0 {
		return ""
	}

	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, fmt.Sprintf("%d", value))
	}

	return strings.Join(parts, ",")
}
