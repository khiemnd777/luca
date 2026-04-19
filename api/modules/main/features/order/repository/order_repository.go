package repository

import (
	"context"
	stdsql "database/sql"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	relation "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/modules/main/features/promotion/contextbuilder"
	"github.com/khiemnd777/noah_api/modules/main/features/promotion/engine"
	promotionrepo "github.com/khiemnd777/noah_api/modules/main/features/promotion/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/categoryprocess"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/material"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/order"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitem"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemmaterial"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemprocess"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemproduct"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/predicate"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/product"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/productprocess"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
	"github.com/lib/pq"
)

type OrderRepository interface {
	ExistsByCode(ctx context.Context, code string) (bool, error)
	GetByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) (*model.OrderDTO, error)
	UpdateStatus(ctx context.Context, orderItemProcessID int64, status string) (*model.OrderItemDTO, error)
	UpdateDeliveryStatus(ctx context.Context, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error)
	GetDeliveryStatus(ctx context.Context, orderID, orderItemID int64) (*string, error)
	SyncPrice(ctx context.Context, orderID int64) (float64, error)
	GetAllOrderProducts(ctx context.Context, orderID int64) ([]*model.OrderItemProductDTO, error)
	GetAllOrderMaterials(ctx context.Context, orderID int64) ([]*model.OrderItemMaterialDTO, error)
	GetAllOrderProductsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemProductDTO, error)
	GetAllOrderMaterialsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemMaterialDTO, error)
	// -- general functions
	Create(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
	Update(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error)
	GetByID(ctx context.Context, id int64) (*model.OrderDTO, error)
	PrepareForRemakeByOrderID(
		ctx context.Context,
		orderID int64,
	) (*model.OrderDTO, error)
	List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	ListByPromotionCodeID(ctx context.Context, deptID int, promotionCodeID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	GetOrdersBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error)
	InProgressList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.InProcessOrderDTO], error)
	NewestList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.NewestOrderDTO], error)
	CompletedList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.CompletedOrderDTO], error)
	Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.OrderDTO], error)
	AdvancedSearch(ctx context.Context, query model.OrderAdvancedSearchQuery) (table.TableListResult[model.OrderDTO], error)
	AdvancedSearchReportSummary(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportSummaryDTO, error)
	AdvancedSearchReportBreakdown(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportBreakdownDTO, error)
	AdvancedSearchReport(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportDTO, error)
	GetProductCatalogOverview(ctx context.Context, deptID int) (*model.ProductCatalogOverviewDTO, error)
	GetProcessCatalogOverview(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewDTO, error)
	GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error)
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
	Delete(ctx context.Context, id int64) error
}

type orderRepository struct {
	db                   *generated.Client
	deps                 *module.ModuleDeps[config.ModuleConfig]
	cfMgr                *customfields.Manager
	orderItemRepo        OrderItemRepository
	orderItemProcessRepo OrderItemProcessRepository
	orderItemProductRepo OrderItemProductRepository
	orderCodeRepo        OrderCodeRepository
	promotionRepo        promotionrepo.PromotionRepository
	promoengine          *engine.Engine
	promoctxbuilder      *contextbuilder.Builder
	promoguard           engine.PromotionGuard
}

type orderAdvancedSearchScope struct {
	Predicates []predicate.Order
	WhereSQL   string
	Args       []any
}

type productOverviewScope struct {
	RootProductID    int
	RootProductName  *string
	IsTemplate       bool
	IncludesVariants bool
	VariantCount     int
	ScopedProductIDs []int
	ScopeLabel       string
}

type materialOverviewScope struct {
	MaterialID   int
	MaterialCode *string
	MaterialName *string
	Type         *string
	IsImplant    bool
	ScopeLabel   string
}

type sectionOverviewScope struct {
	SectionID   int
	SectionName *string
	LeaderName  *string
	ScopeLabel  string
}

type clinicOverviewScope struct {
	ClinicID     int
	ClinicName   *string
	PhoneNumber  *string
	DentistCount int
	PatientCount int
	ScopeLabel   string
}

type dentistOverviewScope struct {
	DentistID   int
	DentistName *string
	PhoneNumber *string
	ClinicCount int
	ScopeLabel  string
}

type patientOverviewScope struct {
	PatientID   int
	PatientName *string
	PhoneNumber *string
	ClinicCount int
	ScopeLabel  string
}

func productOverviewScopeLabel(isTemplate bool, variantCount int) string {
	if !isTemplate {
		return "Biến thể hiện tại"
	}
	if variantCount <= 0 {
		return "Template"
	}
	return fmt.Sprintf("Template + %d biến thể", variantCount)
}

func productCatalogOverviewScopeLabel() string {
	return "Toàn bộ catalog sản phẩm"
}

func materialCatalogOverviewScopeLabel() string {
	return "Toàn bộ catalog vật tư"
}

func processCatalogOverviewScopeLabel() string {
	return "Toàn bộ danh mục công đoạn"
}

func processCatalogJoinNameExpr(alias string) string {
	return fmt.Sprintf(`LOWER(BTRIM(COALESCE(NULLIF(%[1]s.process_name, ''), '')))`, alias)
}

func processCatalogNameExpr(alias string) string {
	return fmt.Sprintf(`LOWER(BTRIM(COALESCE(NULLIF(%[1]s.name, ''), NULLIF(%[1]s.code, ''), '')))`, alias)
}

func sectionCatalogOverviewScopeLabel() string {
	return "Toàn bộ phòng ban"
}

func clinicCatalogOverviewScopeLabel() string {
	return "Toàn bộ nha khoa"
}

func dentistCatalogOverviewScopeLabel() string {
	return "Toàn bộ nha sĩ"
}

func patientCatalogOverviewScopeLabel() string {
	return "Toàn bộ bệnh nhân"
}

func clinicOverviewScopeLabel() string {
	return "Nha khoa hiện tại"
}

func dentistOverviewScopeLabel() string {
	return "Nha sĩ hiện tại"
}

func patientOverviewScopeLabel() string {
	return "Bệnh nhân hiện tại"
}

func sectionOverviewScopeLabel() string {
	return "Phòng ban hiện tại"
}

func normalizedOrderStatusExpr(alias string) string {
	return fmt.Sprintf(`CASE
		WHEN COALESCE(NULLIF(%[1]s.status_latest, ''), 'received') = 'issue' THEN 'rework'
		ELSE COALESCE(NULLIF(%[1]s.status_latest, ''), 'received')
	END`, alias)
}

func normalizedProcessStatusExpr(alias string) string {
	raw := fmt.Sprintf("COALESCE(NULLIF(%s.custom_fields->>'status', ''), NULLIF(%s.status, ''))", alias, alias)
	return fmt.Sprintf(`CASE
		WHEN %[1]s.completed_at IS NOT NULL THEN 'completed'
		WHEN %[2]s = 'completed' THEN 'completed'
		WHEN %[2]s = 'qc' THEN 'qc'
		WHEN %[2]s = 'rework' THEN 'rework'
		WHEN %[2]s = 'issue' THEN 'rework'
		WHEN %[2]s = 'in_progress' THEN 'in_progress'
		WHEN %[2]s = 'pending' THEN 'waiting'
		WHEN %[2]s = 'waiting' THEN 'waiting'
		WHEN %[1]s.started_at IS NOT NULL THEN 'in_progress'
		ELSE 'waiting'
	END`, alias, raw)
}

func normalizedMaterialStatusExpr(alias string) string {
	return fmt.Sprintf(`COALESCE(NULLIF(%s.status, ''), 'on_loan')`, alias)
}

func catalogProcessMapCTE() string {
	return fmt.Sprintf(`product_categories AS (
	SELECT
		id AS product_id,
		category_id
	FROM products
	WHERE department_id = $1
	  AND deleted_at IS NULL
),
process_candidates AS (
	SELECT
		pc.product_id,
		cp.process_id,
		1 AS source_priority,
		cp.display_order
	FROM product_categories pc
	JOIN %s cp
		ON cp.category_id = pc.category_id

	UNION ALL

	SELECT
		pc.product_id,
		pp.process_id,
		2 AS source_priority,
		pp.display_order
	FROM product_categories pc
	JOIN %s pp
		ON pp.product_id = pc.product_id
),
ranked_processes AS (
	SELECT
		product_id,
		process_id,
		source_priority,
		display_order,
		ROW_NUMBER() OVER (
			PARTITION BY product_id, process_id
			ORDER BY source_priority ASC, display_order ASC, process_id ASC
		) AS rn
	FROM process_candidates
),
catalog_process_map AS (
	SELECT
		product_id,
		process_id,
		ROW_NUMBER() OVER (
			PARTITION BY product_id
			ORDER BY source_priority ASC, display_order ASC, process_id ASC
		) AS step_number
	FROM ranked_processes
	WHERE rn = 1
)`, categoryprocess.Table, productprocess.Table)
}

func materialOverviewScopeLabel(materialType *string, isImplant bool) string {
	switch utils.SafeString(materialType) {
	case "loaner":
		if isImplant {
			return "Vật tư cho mượn implant"
		}
		return "Vật tư cho mượn"
	case "consumable":
		if isImplant {
			return "Vật tư tiêu hao implant"
		}
		return "Vật tư tiêu hao"
	default:
		if isImplant {
			return "Vật tư implant"
		}
		return "Vật tư đang theo dõi"
	}
}

func NewOrderRepository(
	db *generated.Client,
	deps *module.ModuleDeps[config.ModuleConfig],
	cfMgr *customfields.Manager,
) OrderRepository {
	orderItemProductRepo := NewOrderItemProductRepository(db)
	promotionRepo := promotionrepo.NewPromotionRepository(db, deps.DB)
	promoengine := engine.NewEngine(deps)
	promoctxbuilder := contextbuilder.NewBuilder(orderItemProductRepo)
	promoguard := engine.NewGuard(promotionRepo)

	return &orderRepository{
		db:                   db,
		deps:                 deps,
		cfMgr:                cfMgr,
		orderItemRepo:        NewOrderItemRepository(db, deps, cfMgr),
		orderItemProcessRepo: NewOrderItemProcessRepository(db, deps, cfMgr),
		orderCodeRepo:        NewOrderCodeRepository(db),
		orderItemProductRepo: orderItemProductRepo,
		promotionRepo:        promotionRepo,
		promoengine:          promoengine,
		promoctxbuilder:      promoctxbuilder,
		promoguard:           promoguard,
	}
}

func (r *orderRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	return r.db.Order.
		Query().
		Where(
			order.CodeEQ(code),
			order.DeletedAtIsNil(),
		).
		Exist(ctx)
}

func (r *orderRepository) GetByOrderIDAndOrderItemID(ctx context.Context, orderID, orderItemID int64) (*model.OrderDTO, error) {
	q := r.db.Order.Query().
		Where(
			order.ID(orderID),
			order.DeletedAtIsNil(),
		)

	entity, err := q.Only(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.Order, *model.OrderDTO](entity)

	// latest order item
	latest, err := r.orderItemRepo.GetByID(ctx, orderItemID)
	if err != nil {
		return nil, err
	}
	dto.LatestOrderItem = latest
	return dto, nil
}

func (r *orderRepository) SyncPrice(ctx context.Context, orderID int64) (float64, error) {
	return r.orderItemRepo.GetTotalPriceByOrderID(ctx, nil, orderID)
}

// -- helpers

func (r *orderRepository) createNewOrder(
	ctx context.Context,
	tx *generated.Tx,
	deptID,
	userID int,
	input *model.OrderUpsertDTO,
) (*model.OrderDTO, error) {

	dto := &input.DTO

	logger.Debug(
		"create order: dto fields",
		"clinic_id", utils.DerefInt(dto.ClinicID),
		"clinic_name", utils.DerefString(dto.ClinicName),
		"dentist_id", utils.DerefInt(dto.DentistID),
		"dentist_name", utils.DerefString(dto.DentistName),
		"patient_id", utils.DerefInt(dto.PatientID),
		"patient_name", utils.DerefString(dto.PatientName),
		"ref_user_name", utils.DerefString(dto.RefUserName),
	)

	q := tx.Order.Create().
		SetNillableDepartmentID(&deptID).
		SetNillableCode(dto.Code).
		SetNillablePromotionCode(dto.PromotionCode).
		SetNillablePromotionCodeID(dto.PromotionCodeID).
		SetNillableClinicID(dto.ClinicID).
		SetNillableClinicName(dto.ClinicName).
		SetNillableDentistID(dto.DentistID).
		SetNillableDentistName(dto.DentistName).
		SetNillablePatientID(dto.PatientID).
		SetNillablePatientName(dto.PatientName).
		SetNillableRefUserID(dto.RefUserID).
		SetNillableRefUserName(dto.RefUserName)

	// custom fields
	if input.Collections != nil && len(*input.Collections) > 0 {
		if _, err := customfields.PrepareCustomFields(
			ctx, r.cfMgr, *input.Collections, dto.CustomFields, q, false,
		); err != nil {
			return nil, logger.PrintError("[ERROR]", err)
		}
	}

	// save order
	orderEnt, err := q.Save(ctx)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	// map back
	out := mapper.MapAs[*generated.Order, *model.OrderDTO](orderEnt)

	// create first-latest order item
	loi := input.DTO.LatestOrderItemUpsert
	loi.DTO.OrderID = out.ID
	loi.DTO.CodeOriginal = out.Code

	latest, err := r.orderItemRepo.Create(ctx, tx, out, loi)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	out.LatestOrderItem = latest

	// reassign latest order item -> order as cache to appear them on the table
	lstStatus := utils.SafeGetStringPtr(latest.CustomFields, "status")
	lstDeliveryStatus := latest.DeliveryStatus
	lstPriority := utils.SafeGetStringPtr(latest.CustomFields, "priority")
	prdQty := utils.SafeGetIntPtr(latest.CustomFields, "quantity")
	dlrDate := utils.SafeGetDateTimePtr(latest.CustomFields, "delivery_date")
	rmkType := utils.SafeGetStringPtr(latest.CustomFields, "remake_type")
	rmkCount := latest.RemakeCount
	lstIsCash := latest.IsCash
	lstIsCredit := latest.IsCredit

	// total price
	totalPrice, err := r.orderItemRepo.GetTotalPriceByOrderID(ctx, tx, out.ID)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}
	prdTotalPrice := totalPrice

	discountAmount, promoSnapshot := r.buildPromotionSnapshot(ctx, out)
	if discountAmount > 0 {
		prdTotalPrice = math.Max(0, prdTotalPrice-discountAmount)
	}

	_, err = orderEnt.
		Update().
		SetNillableCodeLatest(latest.Code).
		SetNillableStatusLatest(lstStatus).
		SetNillableDeliveryStatusLatest(lstDeliveryStatus).
		SetNillablePriorityLatest(lstPriority).
		SetNillableQuantity(prdQty).
		SetTotalPrice(prdTotalPrice).
		SetNillableDeliveryDate(dlrDate).
		SetNillableRemakeType(rmkType).
		SetNillableRemakeCount(&rmkCount).
		SetNillableIsCash(&lstIsCash).
		SetNillableIsCredit(&lstIsCredit).
		Save(ctx)

	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	// Assign latest ones to output
	out.CodeLatest = latest.Code
	out.StatusLatest = lstStatus
	out.DeliveryStatusLatest = lstDeliveryStatus
	out.PriorityLatest = lstPriority
	out.Quantity = prdQty
	out.TotalPrice = &prdTotalPrice
	out.DeliveryDate = dlrDate
	out.RemakeType = rmkType
	out.RemakeCount = &rmkCount

	processes, err := r.orderItemProcessRepo.GetProcessesByOrderItemID(ctx, tx, out.LatestOrderItem.ID)

	if err != nil {
		logger.Error(
			"failed to get processes by order item",
			"orderItemID", out.LatestOrderItem.ID,
			"err", err,
		)
		return nil, logger.PrintError("[ERROR]", err)
	}

	if len(processes) > 0 {
		stProc := processes[0]
		out.ProcessIDLatest = utils.Ptr(int(stProc.ID))
		out.ProcessNameLatest = stProc.ProcessName
		out.SectionNameLatest = stProc.SectionName
		out.LeaderIDLatest = stProc.LeaderID
		out.LeaderNameLatest = stProc.LeaderName
	}

	err = r.orderCodeRepo.ConfirmReservation(ctx, tx, *dto.Code)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	// relation
	// if err = relation.Upsert1(ctx, tx, "orders_customers", orderEnt, &input.DTO, out); err != nil {
	// 	return nil, err
	// }
	if err = relation.Upsert1(ctx, tx, "orders_clinics", orderEnt, &input.DTO, out); err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}
	if err = relation.Upsert1(ctx, tx, "orders_dentists", orderEnt, &input.DTO, out); err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}
	if err = relation.Upsert1(ctx, tx, "orders_patients", orderEnt, &input.DTO, out); err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}
	if err = relation.Upsert1(ctx, tx, "orders_ref_users", orderEnt, &input.DTO, out); err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	if promoSnapshot != nil {
		if err := r.promotionRepo.UpsertPromotionUsageFromSnapshot(
			ctx,
			tx,
			*out.PromotionCodeID,
			out.ID,
			out.RefUserID,
			promoSnapshot,
		); err != nil {
			return nil, logger.PrintError("[ERROR]", err)
		}
	}

	return out, nil
}

func (r *orderRepository) upsertExistingOrder(
	ctx context.Context,
	tx *generated.Tx,
	deptID,
	userID int,
	input *model.OrderUpsertDTO,
) (*model.OrderDTO, error) {

	dto := &input.DTO

	// Load order theo code
	orderEnt, err := r.db.Order.
		Query().
		Where(order.CodeEQ(*dto.Code), order.DeletedAtIsNil()).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	// UPDATE ORDER (custom fields + m2m + 1)
	up := tx.Order.UpdateOneID(orderEnt.ID).
		SetNillableCode(dto.Code)

	if input.Collections != nil && len(*input.Collections) > 0 {
		if _, err := customfields.PrepareCustomFields(
			ctx, r.cfMgr, *input.Collections, dto.CustomFields, up, false,
		); err != nil {
			return nil, err
		}
	}

	orderEnt, err = up.Save(ctx)
	if err != nil {
		return nil, err
	}

	out := mapper.MapAs[*generated.Order, *model.OrderDTO](orderEnt)

	loi := input.DTO.LatestOrderItemUpsert
	loi.DTO.OrderID = out.ID
	loi.DTO.CodeOriginal = out.Code

	latest, err := r.orderItemRepo.Create(ctx, tx, out, loi)
	if err != nil {
		return nil, err
	}

	out.LatestOrderItem = latest

	// reassign latest order item -> order as cache to appear them on the table
	lstStatus := utils.SafeGetStringPtr(latest.CustomFields, "status")
	lstDeliveryStatus := latest.DeliveryStatus
	lstPriority := utils.SafeGetStringPtr(latest.CustomFields, "priority")
	dlrDate := utils.SafeGetDateTimePtr(latest.CustomFields, "delivery_date")
	rmkType := utils.SafeGetStringPtr(latest.CustomFields, "remake_type")
	rmkCount := latest.RemakeCount
	lstIsCash := latest.IsCash
	lstIsCredit := latest.IsCredit

	totalPrice, err := r.orderItemRepo.GetTotalPriceByOrderID(ctx, tx, out.ID)
	if err != nil {
		return nil, err
	}
	prdTotalPrice := totalPrice

	discountAmount, promoSnapshot := r.buildPromotionSnapshot(ctx, out)
	if discountAmount > 0 {
		prdTotalPrice = math.Max(0, prdTotalPrice-discountAmount)
	}

	_, err = orderEnt.
		Update().
		SetNillableCodeLatest(latest.Code).
		SetNillableStatusLatest(lstStatus).
		SetNillableDeliveryStatusLatest(lstDeliveryStatus).
		SetNillablePriorityLatest(lstPriority).
		SetTotalPrice(prdTotalPrice).
		SetNillableDeliveryDate(dlrDate).
		SetNillableRemakeType(rmkType).
		SetNillableRemakeCount(&rmkCount).
		SetNillableDepartmentID(&deptID).
		SetNillableIsCash(&lstIsCash).
		SetNillableIsCredit(&lstIsCredit).
		Save(ctx)

	if err != nil {
		return nil, err
	}

	// Assign latest ones to output
	out.CodeLatest = latest.Code
	out.StatusLatest = lstStatus
	out.DeliveryStatusLatest = lstDeliveryStatus
	out.PriorityLatest = lstPriority
	out.TotalPrice = &prdTotalPrice
	out.DeliveryDate = dlrDate
	out.RemakeType = rmkType
	out.RemakeCount = &rmkCount

	// relations
	// if err := relation.Upsert1(ctx, tx, "orders_customers", orderEnt, &input.DTO, out); err != nil {
	// 	return nil, err
	// }
	if err = relation.Upsert1(ctx, tx, "orders_clinics", orderEnt, &input.DTO, out); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_dentists", orderEnt, &input.DTO, out); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_patients", orderEnt, &input.DTO, out); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_ref_users", orderEnt, &input.DTO, out); err != nil {
		return nil, err
	}

	if promoSnapshot != nil {
		if err := r.promotionRepo.UpsertPromotionUsageFromSnapshot(
			ctx,
			tx,
			*out.PromotionCodeID,
			out.ID,
			out.RefUserID,
			promoSnapshot,
		); err != nil {
			return nil, err
		}
	}

	return out, nil
}

// -- general functions
func (r *orderRepository) Create(ctx context.Context, deptID, userID int, input *model.OrderUpsertDTO) (*model.OrderDTO, error) {
	var err error

	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}
	defer func() {
		if err != nil {
			logger.Error(fmt.Sprintf("[ERROR] %v", err))
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	dto := &input.DTO
	code := dto.Code

	exists, err := r.ExistsByCode(ctx, *code)
	if err != nil {
		return nil, logger.PrintError("[ERROR]", err)
	}

	var out *model.OrderDTO
	if exists {
		out, err = r.upsertExistingOrder(ctx, tx, deptID, userID, input)
		if err != nil {
			return nil, logger.PrintError("[ERROR]", err)
		}
	} else {
		out, err = r.createNewOrder(ctx, tx, deptID, userID, input)
		if err != nil {
			return nil, logger.PrintError("[ERROR]", err)
		}
	}

	return out, nil
}

func (r *orderRepository) Update(
	ctx context.Context,
	deptID,
	userID int,
	input *model.OrderUpsertDTO,
) (*model.OrderDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	output := &input.DTO

	q := tx.Order.UpdateOneID(output.ID).
		SetNillableClinicID(output.ClinicID).
		SetNillableClinicName(output.ClinicName).
		SetNillablePromotionCode(output.PromotionCode).
		SetNillablePromotionCodeID(output.PromotionCodeID).
		SetNillableDentistID(output.DentistID).
		SetNillableDentistName(output.DentistName).
		SetNillablePatientID(output.PatientID).
		SetNillablePatientName(output.PatientName).
		SetNillableRefUserID(output.RefUserID).
		SetNillableRefUserName(output.RefUserName).
		SetNillableDepartmentID(&deptID)

	if input.Collections != nil && len(*input.Collections) > 0 {
		_, err = customfields.PrepareCustomFields(
			ctx,
			r.cfMgr,
			*input.Collections,
			output.CustomFields,
			q,
			false,
		)
		if err != nil {
			return nil, err
		}
	}

	entity, err := q.Save(ctx)
	if err != nil {
		return nil, err
	}

	output = mapper.MapAs[*generated.Order, *model.OrderDTO](entity)

	// ===== Update latest order item
	latest, err := r.orderItemRepo.Update(
		ctx,
		tx,
		output,
		input.DTO.LatestOrderItemUpsert,
	)
	if err != nil {
		return nil, err
	}

	isLatest, err := r.orderItemRepo.IsLatestIfOrderID(
		ctx,
		entity.ID,
		latest.ID,
	)
	if err != nil {
		return nil, err
	}

	output.LatestOrderItem = latest

	// ===== Update order cache fields & total price
	if isLatest {
		lstStatus := utils.SafeGetStringPtr(latest.CustomFields, "status")
		lstDeliveryStatus := latest.DeliveryStatus
		lstPriority := utils.SafeGetStringPtr(latest.CustomFields, "priority")
		dlrDate := utils.SafeGetDateTimePtr(latest.CustomFields, "delivery_date")
		rmkType := utils.SafeGetStringPtr(latest.CustomFields, "remake_type")
		rmkCount := latest.RemakeCount
		lstIsCash := latest.IsCash
		lstIsCredit := latest.IsCredit

		totalPrice, err := r.orderItemRepo.GetTotalPriceByOrderID(
			ctx,
			tx,
			output.ID,
		)
		if err != nil {
			return nil, err
		}

		discountAmount, promoSnapshot := r.buildPromotionSnapshot(ctx, output)

		if discountAmount > 0 {
			logger.Info(
				"apply promotion discount to order",
				"order_id", output.ID,
				"user_id", userID,
				"original_total_price", totalPrice,
				"discount_amount", discountAmount,
			)

			totalPrice = math.Max(0, totalPrice-discountAmount)
		} else {
			logger.Debug(
				"no promotion discount applied",
				"order_id", output.ID,
				"user_id", userID,
				"total_price", totalPrice,
			)
		}

		prdTotalPrice := totalPrice

		_, err = entity.
			Update().
			SetNillableCodeLatest(latest.Code).
			SetNillableStatusLatest(lstStatus).
			SetNillableDeliveryStatusLatest(lstDeliveryStatus).
			SetNillablePriorityLatest(lstPriority).
			SetTotalPrice(prdTotalPrice).
			SetNillableDeliveryDate(dlrDate).
			SetNillableRemakeType(rmkType).
			SetNillableRemakeCount(&rmkCount).
			SetNillableIsCash(&lstIsCash).
			SetNillableIsCredit(&lstIsCredit).
			Save(ctx)
		if err != nil {
			logger.Error(
				"failed to update order after applying promotion",
				"order_id", output.ID,
				"final_total_price", prdTotalPrice,
				"err", err,
			)
			return nil, err
		}

		logger.Debug(
			"order updated with final price",
			"order_id", output.ID,
			"final_total_price", prdTotalPrice,
			"status_latest", lstStatus,
			"priority_latest", lstPriority,
		)

		// ===== Assign latest values to output
		output.CodeLatest = latest.Code
		output.StatusLatest = lstStatus
		output.DeliveryStatusLatest = lstDeliveryStatus
		output.PriorityLatest = lstPriority
		output.TotalPrice = &prdTotalPrice
		output.DeliveryDate = dlrDate
		output.RemakeType = rmkType
		output.RemakeCount = &rmkCount
		output.IsCash = lstIsCash
		output.IsCredit = lstIsCredit

		// ===== Persist promotion usage snapshot
		if promoSnapshot != nil {
			logger.Info(
				"persist promotion usage snapshot",
				"order_id", output.ID,
				"user_id", userID,
				"promo_code", promoSnapshot.PromoCode,
				"discount_amount", promoSnapshot.DiscountAmount,
				"applied_conditions", promoSnapshot.AppliedConditions,
			)

			if err := r.promotionRepo.UpsertPromotionUsageFromSnapshot(
				ctx,
				tx,
				*output.PromotionCodeID,
				output.ID,
				output.RefUserID,
				promoSnapshot,
			); err != nil {
				logger.Error(
					"failed to persist promotion usage snapshot",
					"order_id", output.ID,
					"user_id", userID,
					"promo_code", promoSnapshot.PromoCode,
					"err", err,
				)
				return nil, err
			}
		}
	}

	// ===== Relations
	if err = relation.Upsert1(ctx, tx, "orders_clinics", entity, &input.DTO, output); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_dentists", entity, &input.DTO, output); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_patients", entity, &input.DTO, output); err != nil {
		return nil, err
	}
	if err = relation.Upsert1(ctx, tx, "orders_ref_users", entity, &input.DTO, output); err != nil {
		return nil, err
	}

	return output, nil
}

func (r *orderRepository) UpdateStatus(ctx context.Context, orderItemProcessID int64, status string) (*model.OrderItemDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	_, err = r.orderItemProcessRepo.UpdateStatus(ctx, tx, orderItemProcessID, status)
	if err != nil {
		return nil, err
	}

	// Get oip from memory to ensure CF == latest status, because not yet Committed to db
	updatedOIP, err := tx.OrderItemProcess.
		Query().
		Where(orderitemprocess.IDEQ(orderItemProcessID)).
		First(ctx)
	if err != nil {
		return nil, err
	}

	if updatedOIP.OrderID == nil {
		err = fmt.Errorf("OrderID is nil after updating process")
		return nil, err
	}

	processes, err := r.orderItemProcessRepo.GetProcessesByOrderItemID(ctx, tx, updatedOIP.OrderItemID)
	if err != nil {
		return nil, err
	}

	orderDTO, err := r.recalculateOrderStatusByProcesses(ctx, tx, *updatedOIP.OrderID, updatedOIP.OrderItemID, processes)
	if err != nil {
		return nil, err
	}

	return orderDTO, nil
}

func (r *orderRepository) UpdateDeliveryStatus(ctx context.Context, orderID, orderItemID int64, status string) (*model.OrderItemDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	itemDTO, err := r.orderItemRepo.UpdateDeliveryStatus(ctx, tx, orderID, orderItemID, status)
	if err != nil {
		return nil, err
	}

	latest, err := tx.OrderItem.
		Query().
		Where(
			orderitem.OrderID(orderID),
			orderitem.DeletedAtIsNil(),
		).
		Order(generated.Desc(orderitem.FieldCreatedAt)).
		First(ctx)
	if err != nil {
		return nil, err
	}

	if latest.ID == orderItemID {
		if _, err = tx.Order.
			UpdateOneID(orderID).
			SetNillableDeliveryStatusLatest(itemDTO.DeliveryStatus).
			Save(ctx); err != nil {
			return nil, err
		}
	}

	return itemDTO, nil
}

func (r *orderRepository) GetDeliveryStatus(ctx context.Context, orderID, orderItemID int64) (*string, error) {
	return r.orderItemRepo.GetDeliveryStatus(ctx, orderID, orderItemID)
}

func (r *orderRepository) recalculateOrderStatusByProcesses(
	ctx context.Context,
	tx *generated.Tx,
	orderID,
	orderItemID int64,
	processes []*model.OrderItemProcessDTO,
) (*model.OrderItemDTO, error) {

	if len(processes) == 0 {
		return nil, fmt.Errorf("no processes found for order %d", orderItemID)
	}

	allWaiting := true
	allCompleted := true
	anyInProgress := false

	for _, p := range processes {
		status := utils.SafeGetString(p.CustomFields, "status")

		switch status {
		case "waiting":
		case "completed":
			allWaiting = false
		case "in_progress", "qc", "rework":
			allWaiting = false
			allCompleted = false
			anyInProgress = true
		default:
			allWaiting = false
			allCompleted = false
		}

		if status != "waiting" {
			allWaiting = false
		}
		if status != "completed" {
			allCompleted = false
		}
	}

	var orderStatus string

	switch {
	case allWaiting:
		orderStatus = "received"

	case anyInProgress:
		orderStatus = "in_progress"

	case allCompleted:
		orderStatus = "completed"

	default:
		orderStatus = "in_progress"
	}

	oi, err := tx.OrderItem.Query().
		Where(orderitem.IDEQ(orderItemID)).
		First(ctx)
	if err != nil {
		return nil, err
	}

	cf := utils.CloneOrInit(oi.CustomFields)
	cf["status"] = orderStatus

	qoi := tx.OrderItem.
		UpdateOne(oi).
		SetCustomFields(cf)

	if orderStatus == "completed" {
		now := time.Now()
		qoi = qoi.SetNillableCompletedAt(&now)
	}

	updated, err := qoi.
		Save(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.OrderItem, *model.OrderItemDTO](updated)
	dto.IsCash = updated.IsCash
	dto.IsCredit = updated.IsCredit
	dto.TotalPrice = updated.TotalPrice

	tx.Order.UpdateOneID(orderID).
		SetNillableStatusLatest(&orderStatus).
		Save(ctx)

	return dto, nil
}

func (r *orderRepository) GetByID(ctx context.Context, id int64) (*model.OrderDTO, error) {
	q := r.db.Order.Query().
		Where(
			order.ID(id),
			order.DeletedAtIsNil(),
		)

	entity, err := q.Only(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.Order, *model.OrderDTO](entity)

	// latest order item
	latest, err := r.orderItemRepo.GetLatestByOrderID(ctx, id)
	if err != nil {
		return nil, err
	}
	dto.LatestOrderItem = latest
	return dto, nil
}

func (r *orderRepository) PrepareForRemakeByOrderID(
	ctx context.Context,
	orderID int64,
) (*model.OrderDTO, error) {

	entity, err := r.db.Order.
		Query().
		Where(
			order.ID(orderID),
			order.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[
		*generated.Order,
		*model.OrderDTO,
	](entity)

	latestItem, err := r.orderItemRepo.
		PrepareLatestForRemakeByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	dto.LatestOrderItem = latestItem

	return dto, nil
}

func (r *orderRepository) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.OrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(order.DepartmentIDEQ(deptID),
				order.DeletedAtIsNil(),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldID,
		func(src []*generated.Order) []*model.OrderDTO {
			return mapper.MapListAs[*generated.Order, *model.OrderDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.OrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) ListByPromotionCodeID(
	ctx context.Context,
	deptID int,
	promotionCodeID int,
	query table.TableQuery,
) (table.TableListResult[model.OrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(
				order.DepartmentIDEQ(deptID),
				order.PromotionCodeIDEQ(promotionCodeID),
				order.DeletedAtIsNil(),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldID,
		func(src []*generated.Order) []*model.OrderDTO {
			return mapper.MapListAs[*generated.Order, *model.OrderDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.OrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) GetOrdersBySectionID(
	ctx context.Context,
	sectionID int,
	query table.TableQuery,
) (table.TableListResult[model.OrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(
				order.DeletedAtIsNil(),
				order.HasItemsWith(
					orderitem.HasProcessesWith(
						orderitemprocess.SectionIDEQ(sectionID),
					),
				),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldID,
		func(src []*generated.Order) []*model.OrderDTO {
			return mapper.MapListAs[*generated.Order, *model.OrderDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.OrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) InProgressList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.InProcessOrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(
				order.DepartmentIDEQ(deptID),
				order.DeletedAtIsNil(),
				order.StatusLatestEQ("in_progress"),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldDeliveryDate,
		func(src []*generated.Order) []*model.InProcessOrderDTO {
			out := make([]*model.InProcessOrderDTO, 0, len(src))
			for _, item := range src {
				out = append(out, &model.InProcessOrderDTO{
					ID:                   item.ID,
					Code:                 item.Code,
					CodeLatest:           item.CodeLatest,
					DeliveryDate:         item.DeliveryDate,
					TotalPrice:           item.TotalPrice,
					ProcessNameLatest:    item.ProcessNameLatest,
					StatusLatest:         item.StatusLatest,
					DeliveryStatusLatest: item.DeliveryStatusLatest,
					PriorityLatest:       item.PriorityLatest,
				})
			}
			return out
		},
	)
	if err != nil {
		var zero table.TableListResult[model.InProcessOrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) NewestList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.NewestOrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(
				order.DepartmentIDEQ(deptID),
				order.DeletedAtIsNil(),
				order.StatusLatestEQ("received"),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldCreatedAt,
		func(src []*generated.Order) []*model.NewestOrderDTO {
			out := make([]*model.NewestOrderDTO, 0, len(src))
			for _, item := range src {
				out = append(out, &model.NewestOrderDTO{
					ID:                   item.ID,
					Code:                 item.Code,
					CodeLatest:           item.CodeLatest,
					CreatedAt:            item.CreatedAt,
					StatusLatest:         item.StatusLatest,
					DeliveryStatusLatest: item.DeliveryStatusLatest,
					PriorityLatest:       item.PriorityLatest,
				})
			}
			return out
		},
	)
	if err != nil {
		var zero table.TableListResult[model.NewestOrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) CompletedList(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.CompletedOrderDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Order.Query().
			Where(
				order.DepartmentIDEQ(deptID),
				order.DeletedAtIsNil(),
				order.StatusLatestEQ("completed"),
			),
		query,
		order.Table,
		order.FieldID,
		order.FieldUpdatedAt,
		func(src []*generated.Order) []*model.CompletedOrderDTO {
			out := make([]*model.CompletedOrderDTO, 0, len(src))
			for _, item := range src {
				out = append(out, &model.CompletedOrderDTO{
					ID:                   item.ID,
					Code:                 item.Code,
					CodeLatest:           item.CodeLatest,
					CreatedAt:            item.CreatedAt,
					StatusLatest:         item.StatusLatest,
					DeliveryStatusLatest: item.DeliveryStatusLatest,
					PriorityLatest:       item.PriorityLatest,
				})
			}
			return out
		},
	)
	if err != nil {
		var zero table.TableListResult[model.CompletedOrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.OrderDTO], error) {
	return dbutils.Search(
		ctx,
		r.db.Order.Query().
			Where(order.DepartmentIDEQ(deptID),
				order.DeletedAtIsNil(),
			),
		[]string{
			dbutils.GetNormField(order.FieldCode),
		},
		query,
		order.Table,
		order.FieldID,
		order.FieldID,
		order.Or,
		func(src []*generated.Order) []*model.OrderDTO {
			return mapper.MapListAs[*generated.Order, *model.OrderDTO](src)
		},
	)
}

func (r *orderRepository) AdvancedSearch(ctx context.Context, query model.OrderAdvancedSearchQuery) (table.TableListResult[model.OrderDTO], error) {
	scope := r.buildAdvancedSearchScope(query.OrderAdvancedSearchFilter)

	list, err := table.TableListV2(
		ctx,
		r.db.Order.Query().Where(scope.Predicates...),
		table.TableQuery{
			Limit:     query.Limit,
			Page:      query.Page,
			Offset:    query.Offset,
			OrderBy:   query.OrderBy,
			Direction: query.Direction,
		},
		order.Table,
		order.FieldID,
		order.FieldCreatedAt,
		func(q *generated.OrderQuery) *generated.OrderQuery {
			return q
		},
		func(src []*generated.Order) []*model.OrderDTO {
			return mapper.MapListAs[*generated.Order, *model.OrderDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.OrderDTO]
		return zero, err
	}
	return list, nil
}

func (r *orderRepository) AdvancedSearchReport(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportDTO, error) {
	summary, err := r.AdvancedSearchReportSummary(ctx, filter)
	if err != nil {
		return nil, err
	}

	breakdown, err := r.AdvancedSearchReportBreakdown(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &model.OrderAdvancedSearchReportDTO{
		OrderAdvancedSearchReportSummaryDTO:   *summary,
		OrderAdvancedSearchReportBreakdownDTO: *breakdown,
	}, nil
}

func (r *orderRepository) AdvancedSearchReportSummary(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportSummaryDTO, error) {
	scope := r.buildAdvancedSearchScope(filter)

	summaryQuery := fmt.Sprintf(`
SELECT
	COUNT(*) AS total_orders,
	COALESCE(SUM(COALESCE(o.total_price, 0)), 0) AS total_value,
	COALESCE(AVG(COALESCE(o.total_price, 0)), 0) AS average_order_value,
	COUNT(*) FILTER (WHERE COALESCE(o.remake_count, 0) > 0) AS remake_orders,
	COALESCE(SUM(COALESCE(o.total_price, 0)), 0) AS total_sales,
	COALESCE(SUM(COALESCE(o.total_price, 0)), 0) AS total_revenue
FROM orders o
WHERE %s
`, scope.WhereSQL)

	report := &model.OrderAdvancedSearchReportSummaryDTO{}

	if err := r.deps.DB.QueryRowContext(ctx, summaryQuery, scope.Args...).Scan(
		&report.TotalOrders,
		&report.TotalValue,
		&report.AverageOrderValue,
		&report.RemakeOrders,
		&report.TotalSales,
		&report.TotalRevenue,
	); err != nil {
		return nil, err
	}

	return report, nil
}

func (r *orderRepository) AdvancedSearchReportBreakdown(ctx context.Context, filter model.OrderAdvancedSearchFilter) (*model.OrderAdvancedSearchReportBreakdownDTO, error) {
	scope := r.buildAdvancedSearchScope(filter)

	report := &model.OrderAdvancedSearchReportBreakdownDTO{
		StatusBreakdown: []*model.OrderAdvancedSearchStatusBreakdownDTO{},
		TopProducts:     []*model.OrderAdvancedSearchTopProductDTO{},
	}

	statusQuery := fmt.Sprintf(`
SELECT
	COALESCE(o.status_latest, '') AS status,
	COUNT(*) AS total
FROM orders o
WHERE %s
GROUP BY COALESCE(o.status_latest, '')
ORDER BY total DESC, status ASC
`, scope.WhereSQL)

	statusRows, err := r.deps.DB.QueryContext(ctx, statusQuery, scope.Args...)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()

	for statusRows.Next() {
		row := &model.OrderAdvancedSearchStatusBreakdownDTO{}
		if err := statusRows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		report.StatusBreakdown = append(report.StatusBreakdown, row)
	}
	if err := statusRows.Err(); err != nil {
		return nil, err
	}

	topProductsQuery := fmt.Sprintf(`
SELECT
	oip.product_id,
	MIN(NULLIF(oip.product_code, '')) AS product_code,
	MIN(COALESCE(NULLIF(p.name, ''), NULLIF(o.product_name, ''), NULLIF(oi.product_name, ''), NULLIF(oip.product_code, ''), 'Sản phẩm chưa đặt tên')) AS product_name,
	COUNT(DISTINCT o.id) AS order_count,
	COALESCE(SUM(COALESCE(oip.quantity, 0)), 0) AS total_quantity,
	COALESCE(SUM(COALESCE(oip.quantity, 0) * COALESCE(oip.retail_price, 0)), 0) AS total_sales,
	COALESCE(SUM(COALESCE(oip.quantity, 0) * COALESCE(oip.retail_price, 0)), 0) AS total_revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
JOIN order_item_products oip ON oip.order_id = o.id AND oip.order_item_id = oi.id AND oip.product_id IS NOT NULL
LEFT JOIN products p ON p.id = oip.product_id
WHERE %s
GROUP BY oip.product_id
ORDER BY order_count DESC, total_quantity DESC, product_name ASC
LIMIT 5
`, scope.WhereSQL)

	topRows, err := r.deps.DB.QueryContext(ctx, topProductsQuery, scope.Args...)
	if err != nil {
		return nil, err
	}
	defer topRows.Close()

	for topRows.Next() {
		row := &model.OrderAdvancedSearchTopProductDTO{}
		if err := topRows.Scan(
			&row.ProductID,
			&row.ProductCode,
			&row.ProductName,
			&row.OrderCount,
			&row.TotalQuantity,
			&row.TotalSales,
			&row.TotalRevenue,
		); err != nil {
			return nil, err
		}
		report.TopProducts = append(report.TopProducts, row)
	}
	if err := topRows.Err(); err != nil {
		return nil, err
	}

	return report, nil
}

func (r *orderRepository) GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error) {
	scope, err := r.resolveProductOverviewScope(ctx, deptID, productID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getProductOverviewSummary(ctx, deptID, scope.ScopedProductIDs)
	if err != nil {
		return nil, err
	}

	statusBreakdown, err := r.getProductOverviewStatusBreakdown(ctx, deptID, scope.ScopedProductIDs)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getProductOverviewProcessLoad(ctx, deptID, scope.ScopedProductIDs)
	if err != nil {
		return nil, err
	}
	if len(processLoad) == 0 {
		processLoad, err = r.getProductOverviewFallbackProcessLoad(ctx, scope.ScopedProductIDs)
		if err != nil {
			return nil, err
		}
	}

	recentOrders, err := r.getProductOverviewRecentOrders(ctx, deptID, scope.ScopedProductIDs)
	if err != nil {
		return nil, err
	}

	return &model.ProductOverviewDTO{
		Scope: &model.ProductOverviewScopeDTO{
			RootProductID:    scope.RootProductID,
			RootProductName:  scope.RootProductName,
			IsTemplate:       scope.IsTemplate,
			IncludesVariants: scope.IncludesVariants,
			VariantCount:     scope.VariantCount,
			ScopedProductIDs: scope.ScopedProductIDs,
			ScopeLabel:       scope.ScopeLabel,
		},
		Summary:              summary,
		OrderStatusBreakdown: statusBreakdown,
		ProcessLoad:          processLoad,
		RecentOrders:         recentOrders,
	}, nil
}

func (r *orderRepository) GetProductCatalogOverview(ctx context.Context, deptID int) (*model.ProductCatalogOverviewDTO, error) {
	coverage, err := r.getProductCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getProductCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	statusBreakdown, err := r.getProductCatalogOverviewStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getProductCatalogOverviewProcessLoad(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.ProductCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: statusBreakdown,
		ProcessLoad:          processLoad,
	}, nil
}

func (r *orderRepository) GetProcessCatalogOverview(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewDTO, error) {
	coverage, err := r.getProcessCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getProcessCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getProcessCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	processLoads, err := r.getProcessCatalogOverviewProcessLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.ProcessCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ProcessLoads:         processLoads,
	}, nil
}

func (r *orderRepository) GetMaterialOverview(ctx context.Context, deptID int, materialID int) (*model.MaterialOverviewDTO, error) {
	scope, err := r.resolveMaterialOverviewScope(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getMaterialOverviewSummary(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getMaterialOverviewOrderStatusBreakdown(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	materialStatusBreakdown, err := r.getMaterialOverviewMaterialStatusBreakdown(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getMaterialOverviewProcessLoad(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.getMaterialOverviewRecentOrders(ctx, deptID, materialID)
	if err != nil {
		return nil, err
	}

	return &model.MaterialOverviewDTO{
		Scope: &model.MaterialOverviewScopeDTO{
			MaterialID:   scope.MaterialID,
			MaterialCode: scope.MaterialCode,
			MaterialName: scope.MaterialName,
			Type:         scope.Type,
			IsImplant:    scope.IsImplant,
			ScopeLabel:   scope.ScopeLabel,
		},
		Summary:                 summary,
		OrderStatusBreakdown:    orderStatusBreakdown,
		MaterialStatusBreakdown: materialStatusBreakdown,
		ProcessLoad:             processLoad,
		RecentOrders:            recentOrders,
	}, nil
}

func (r *orderRepository) GetMaterialCatalogOverview(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewDTO, error) {
	coverage, err := r.getMaterialCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getMaterialCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getMaterialCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	materialStatusBreakdown, err := r.getMaterialCatalogOverviewMaterialStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getMaterialCatalogOverviewProcessLoad(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.MaterialCatalogOverviewDTO{
		Coverage:                coverage,
		Summary:                 summary,
		OrderStatusBreakdown:    orderStatusBreakdown,
		MaterialStatusBreakdown: materialStatusBreakdown,
		ProcessLoad:             processLoad,
	}, nil
}

func (r *orderRepository) GetDentistOverview(ctx context.Context, deptID int, dentistID int) (*model.DentistOverviewDTO, error) {
	scope, err := r.resolveDentistOverviewScope(ctx, deptID, dentistID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getDentistOverviewSummary(ctx, deptID, dentistID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getDentistOverviewOrderStatusBreakdown(ctx, deptID, dentistID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getDentistOverviewProcessLoad(ctx, deptID, dentistID)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.getDentistOverviewRecentOrders(ctx, deptID, dentistID)
	if err != nil {
		return nil, err
	}

	return &model.DentistOverviewDTO{
		Scope: &model.DentistOverviewScopeDTO{
			DentistID:   scope.DentistID,
			DentistName: scope.DentistName,
			PhoneNumber: scope.PhoneNumber,
			ClinicCount: scope.ClinicCount,
			ScopeLabel:  scope.ScopeLabel,
		},
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ProcessLoad:          processLoad,
		RecentOrders:         recentOrders,
	}, nil
}

func (r *orderRepository) GetDentistCatalogOverview(ctx context.Context, deptID int) (*model.DentistCatalogOverviewDTO, error) {
	coverage, err := r.getDentistCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getDentistCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getDentistCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	dentistLoads, err := r.getDentistCatalogOverviewDentistLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.DentistCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		DentistLoads:         dentistLoads,
	}, nil
}

func (r *orderRepository) GetPatientOverview(ctx context.Context, deptID int, patientID int) (*model.PatientOverviewDTO, error) {
	scope, err := r.resolvePatientOverviewScope(ctx, deptID, patientID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getPatientOverviewSummary(ctx, deptID, patientID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getPatientOverviewOrderStatusBreakdown(ctx, deptID, patientID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getPatientOverviewProcessLoad(ctx, deptID, patientID)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.getPatientOverviewRecentOrders(ctx, deptID, patientID)
	if err != nil {
		return nil, err
	}

	return &model.PatientOverviewDTO{
		Scope: &model.PatientOverviewScopeDTO{
			PatientID:   scope.PatientID,
			PatientName: scope.PatientName,
			PhoneNumber: scope.PhoneNumber,
			ClinicCount: scope.ClinicCount,
			ScopeLabel:  scope.ScopeLabel,
		},
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ProcessLoad:          processLoad,
		RecentOrders:         recentOrders,
	}, nil
}

func (r *orderRepository) GetPatientCatalogOverview(ctx context.Context, deptID int) (*model.PatientCatalogOverviewDTO, error) {
	coverage, err := r.getPatientCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getPatientCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getPatientCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	patientLoads, err := r.getPatientCatalogOverviewPatientLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.PatientCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		PatientLoads:         patientLoads,
	}, nil
}

func (r *orderRepository) GetClinicOverview(ctx context.Context, deptID int, clinicID int) (*model.ClinicOverviewDTO, error) {
	scope, err := r.resolveClinicOverviewScope(ctx, deptID, clinicID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getClinicOverviewSummary(ctx, deptID, clinicID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getClinicOverviewOrderStatusBreakdown(ctx, deptID, clinicID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getClinicOverviewProcessLoad(ctx, deptID, clinicID)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.getClinicOverviewRecentOrders(ctx, deptID, clinicID)
	if err != nil {
		return nil, err
	}

	return &model.ClinicOverviewDTO{
		Scope: &model.ClinicOverviewScopeDTO{
			ClinicID:     scope.ClinicID,
			ClinicName:   scope.ClinicName,
			PhoneNumber:  scope.PhoneNumber,
			DentistCount: scope.DentistCount,
			PatientCount: scope.PatientCount,
			ScopeLabel:   scope.ScopeLabel,
		},
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ProcessLoad:          processLoad,
		RecentOrders:         recentOrders,
	}, nil
}

func (r *orderRepository) GetClinicCatalogOverview(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewDTO, error) {
	coverage, err := r.getClinicCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getClinicCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getClinicCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	clinicLoads, err := r.getClinicCatalogOverviewClinicLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.ClinicCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ClinicLoads:          clinicLoads,
	}, nil
}

func (r *orderRepository) GetSectionOverview(ctx context.Context, deptID int, sectionID int) (*model.SectionOverviewDTO, error) {
	scope, err := r.resolveSectionOverviewScope(ctx, deptID, sectionID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getSectionOverviewSummary(ctx, deptID, sectionID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getSectionOverviewOrderStatusBreakdown(ctx, deptID, sectionID)
	if err != nil {
		return nil, err
	}

	processLoad, err := r.getSectionOverviewProcessLoad(ctx, deptID, sectionID)
	if err != nil {
		return nil, err
	}

	recentOrders, err := r.getSectionOverviewRecentOrders(ctx, deptID, sectionID)
	if err != nil {
		return nil, err
	}

	return &model.SectionOverviewDTO{
		Scope: &model.SectionOverviewScopeDTO{
			SectionID:   scope.SectionID,
			SectionName: scope.SectionName,
			LeaderName:  scope.LeaderName,
			ScopeLabel:  scope.ScopeLabel,
		},
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		ProcessLoad:          processLoad,
		RecentOrders:         recentOrders,
	}, nil
}

func (r *orderRepository) resolveDentistOverviewScope(ctx context.Context, deptID int, dentistID int) (*dentistOverviewScope, error) {
	query := `
SELECT
	d.id,
	NULLIF(d.name, '') AS dentist_name,
	NULLIF(d.phone_number, '') AS phone_number,
	COALESCE((
		SELECT COUNT(*)
		FROM clinic_dentists cd
		JOIN clinics c ON c.id = cd.clinic_id
		WHERE cd.dentist_id = d.id
		  AND c.department_id = $1
		  AND c.deleted_at IS NULL
	), 0) AS clinic_count
FROM dentists d
WHERE d.id = $2
  AND d.deleted_at IS NULL
LIMIT 1
`

	scope := &dentistOverviewScope{ScopeLabel: dentistOverviewScopeLabel()}
	var dentistName, phoneNumber stdsql.NullString
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, dentistID).Scan(
		&scope.DentistID,
		&dentistName,
		&phoneNumber,
		&scope.ClinicCount,
	); err != nil {
		return nil, err
	}
	if dentistName.Valid {
		scope.DentistName = &dentistName.String
	}
	if phoneNumber.Valid {
		scope.PhoneNumber = &phoneNumber.String
	}
	return scope, nil
}

func (r *orderRepository) getDentistCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.DentistCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(DISTINCT d.id)
		FROM dentists d
		JOIN clinic_dentists cd ON cd.dentist_id = d.id
		JOIN clinics c ON c.id = cd.clinic_id
		WHERE d.deleted_at IS NULL
		  AND c.department_id = $1
		  AND c.deleted_at IS NULL
	), 0) AS total_dentists,
	COALESCE((
		SELECT COUNT(DISTINCT o.dentist_id)
		FROM orders o
		WHERE o.department_id = $1
		  AND o.deleted_at IS NULL
		  AND o.dentist_id IS NOT NULL
	), 0) AS dentists_with_orders
`

	dto := &model.DentistCatalogOverviewCoverageDTO{ScopeLabel: dentistCatalogOverviewScopeLabel()}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(&dto.TotalDentists, &dto.DentistsWithOrders); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getDentistOverviewSummary(ctx context.Context, deptID int, dentistID int) (*model.DentistOverviewSummaryDTO, error) {
	return r.queryDentistSummary(ctx, "o.dentist_id = $2", []any{deptID, dentistID})
}

func (r *orderRepository) getDentistCatalogOverviewSummary(ctx context.Context, deptID int) (*model.DentistCatalogOverviewSummaryDTO, error) {
	summary, err := r.queryDentistSummary(ctx, "o.dentist_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	return &model.DentistCatalogOverviewSummaryDTO{
		OpenOrders:         summary.OpenOrders,
		InProductionOrders: summary.InProductionOrders,
		CompletedOrders:    summary.CompletedOrders,
		RemakeOrders:       summary.RemakeOrders,
		LifetimeOrders:     summary.LifetimeOrders,
		CompletionPercent:  summary.CompletionPercent,
	}, nil
}

func (r *orderRepository) queryDentistSummary(ctx context.Context, scopeWhere string, args []any) (*model.DentistOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id,
		%s AS status
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
),
process_totals AS (
	SELECT
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM order_item_processes op
	JOIN orders o ON o.id = op.order_id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
)
SELECT
	COUNT(*) FILTER (WHERE status IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
	COUNT(*) FILTER (WHERE status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
	COUNT(*) FILTER (WHERE status = 'rework') AS remake_orders,
	COUNT(*) AS lifetime_orders,
	COALESCE(ROUND(100.0 * (SELECT completed_processes FROM process_totals) / NULLIF((SELECT total_processes FROM process_totals), 0)), 0) AS completion_percent
FROM scoped_orders
`, orderStatusExpr, scopeWhere, processStatusExpr, scopeWhere)

	dto := &model.DentistOverviewSummaryDTO{}
	if err := r.deps.DB.QueryRowContext(ctx, query, args...).Scan(
		&dto.OpenOrders,
		&dto.InProductionOrders,
		&dto.CompletedOrders,
		&dto.RemakeOrders,
		&dto.LifetimeOrders,
		&dto.CompletionPercent,
	); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getDentistOverviewOrderStatusBreakdown(ctx context.Context, deptID int, dentistID int) ([]*model.DentistOverviewOrderStatusBreakdownDTO, error) {
	return r.queryDentistOrderStatusBreakdown(ctx, deptID, "o.dentist_id = $2", []any{deptID, dentistID})
}

func (r *orderRepository) getDentistCatalogOverviewOrderStatusBreakdown(ctx context.Context, deptID int) ([]*model.DentistCatalogOverviewOrderStatusBreakdownDTO, error) {
	rows, err := r.queryDentistOrderStatusBreakdown(ctx, deptID, "o.dentist_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	result := make([]*model.DentistCatalogOverviewOrderStatusBreakdownDTO, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, &model.DentistCatalogOverviewOrderStatusBreakdownDTO{
			Status: row.Status,
			Count:  row.Count,
		})
	}
	return result, nil
}

func (r *orderRepository) queryDentistOrderStatusBreakdown(ctx context.Context, deptID int, scopeWhere string, args []any) ([]*model.DentistOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	query := fmt.Sprintf(`
SELECT
	%s AS status,
	COUNT(*) AS count
FROM orders o
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND %s
GROUP BY %s
ORDER BY count DESC, status ASC
`, orderStatusExpr, scopeWhere, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.DentistOverviewOrderStatusBreakdownDTO, 0)
	for rows.Next() {
		row := &model.DentistOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getDentistCatalogOverviewDentistLoads(ctx context.Context, deptID int) ([]*model.DentistCatalogOverviewDentistLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH dentist_base AS (
	SELECT
		d.id AS dentist_id,
		NULLIF(d.name, '') AS dentist_name,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s = 'completed') AS completed_orders,
		COUNT(DISTINCT o.id) AS lifetime_orders
	FROM dentists d
	LEFT JOIN orders o
		ON o.dentist_id = d.id
	   AND o.department_id = $1
	   AND o.deleted_at IS NULL
	WHERE d.deleted_at IS NULL
	  AND EXISTS (
		SELECT 1
		FROM clinic_dentists cd
		JOIN clinics c ON c.id = cd.clinic_id
		WHERE cd.dentist_id = d.id
		  AND c.department_id = $1
		  AND c.deleted_at IS NULL
	  )
	GROUP BY d.id, d.name
),
dentist_process AS (
	SELECT
		o.dentist_id,
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.dentist_id IS NOT NULL
	GROUP BY o.dentist_id
)
SELECT
	db.dentist_id,
	db.dentist_name,
	db.open_orders,
	db.in_production_orders,
	db.completed_orders,
	db.lifetime_orders,
	COALESCE(ROUND(100.0 * dp.completed_processes / NULLIF(dp.total_processes, 0)), 0) AS completion_percent
FROM dentist_base db
LEFT JOIN dentist_process dp
	ON dp.dentist_id = db.dentist_id
WHERE db.lifetime_orders > 0
ORDER BY db.open_orders DESC, db.in_production_orders DESC, db.lifetime_orders DESC, db.dentist_id ASC
LIMIT 5
`, normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.DentistCatalogOverviewDentistLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.DentistCatalogOverviewDentistLoadDTO{}
		var dentistName stdsql.NullString
		if err := rows.Scan(
			&row.DentistID,
			&dentistName,
			&row.OpenOrders,
			&row.InProductionOrders,
			&row.CompletedOrders,
			&row.LifetimeOrders,
			&row.CompletionPercent,
		); err != nil {
			return nil, err
		}
		if dentistName.Valid {
			row.DentistName = &dentistName.String
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getDentistOverviewProcessLoad(ctx context.Context, deptID int, dentistID int) ([]*model.DentistOverviewProcessLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
SELECT
	COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
	COALESCE(op.step_number, 0) AS step_number,
	COUNT(*) FILTER (WHERE %s = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE %s = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE %s = 'qc') AS qc,
	COUNT(*) FILTER (WHERE %s = 'rework') AS rework,
	COUNT(*) FILTER (WHERE %s = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT op.order_id) FILTER (WHERE %s IN ('waiting', 'in_progress', 'qc', 'rework')) AS active_orders
FROM order_item_processes op
JOIN orders o
	ON o.id = op.order_id
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND o.dentist_id = $2
GROUP BY COALESCE(NULLIF(op.process_name, ''), 'Công đoạn'), COALESCE(op.step_number, 0)
ORDER BY active_orders DESC, total DESC, step_number ASC, process_name ASC
LIMIT 5
`, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, dentistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.DentistOverviewProcessLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.DentistOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getDentistOverviewRecentOrders(ctx context.Context, deptID int, dentistID int) ([]*model.DentistOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		MIN(COALESCE(NULLIF(o.code_latest, ''), NULLIF(o.code, ''))) AS order_code,
		%s AS order_status,
		MIN(NULLIF(o.clinic_name, '')) AS clinic_name,
		MIN(NULLIF(o.patient_name, '')) AS patient_name,
		COALESCE(MAX(o.updated_at), MAX(o.created_at)) AS updated_at
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.dentist_id = $2
	GROUP BY o.id, %s
),
latest_process AS (
	SELECT DISTINCT ON (op.order_id)
		op.order_id,
		COALESCE(NULLIF(op.process_name, ''), NULLIF(o.process_name_latest, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	   AND o.dentist_id = $2
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	ORDER BY
		op.order_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	so.order_id,
	so.order_code,
	so.order_status,
	so.clinic_name,
	so.patient_name,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, so.updated_at) AS latest_checkpoint_at
FROM scoped_orders so
LEFT JOIN latest_process lp
	ON lp.order_id = so.order_id
ORDER BY COALESCE(lp.latest_checkpoint_at, so.updated_at) DESC, so.order_id DESC
LIMIT 5
`, orderStatusExpr, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, dentistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.DentistOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.DentistOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			status             stdsql.NullString
			clinicName         stdsql.NullString
			patientName        stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)
		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&status,
			&clinicName,
			&patientName,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}
		if orderCode.Valid {
			row.OrderCode = &orderCode.String
		}
		if status.Valid {
			row.Status = &status.String
		}
		if clinicName.Valid {
			row.ClinicName = &clinicName.String
		}
		if patientName.Valid {
			row.PatientName = &patientName.String
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = &currentProcessName.String
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = &latestCheckpointAt.Time
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) resolvePatientOverviewScope(ctx context.Context, deptID int, patientID int) (*patientOverviewScope, error) {
	query := `
SELECT
	p.id,
	NULLIF(p.name, '') AS patient_name,
	NULLIF(p.phone_number, '') AS phone_number,
	COALESCE((
		SELECT COUNT(*)
		FROM clinic_patients cp
		JOIN clinics c ON c.id = cp.clinic_id
		WHERE cp.patient_id = p.id
		  AND c.deleted_at IS NULL
		  AND c.department_id = $1
	), 0) AS clinic_count
FROM patients p
WHERE p.id = $2
  AND p.deleted_at IS NULL
LIMIT 1
`

	scope := &patientOverviewScope{ScopeLabel: patientOverviewScopeLabel()}
	var patientName, phoneNumber stdsql.NullString
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, patientID).Scan(
		&scope.PatientID,
		&patientName,
		&phoneNumber,
		&scope.ClinicCount,
	); err != nil {
		return nil, err
	}
	if patientName.Valid {
		scope.PatientName = &patientName.String
	}
	if phoneNumber.Valid {
		scope.PhoneNumber = &phoneNumber.String
	}
	return scope, nil
}

func (r *orderRepository) getPatientCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.PatientCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM patients p
		WHERE p.deleted_at IS NULL
	), 0) AS total_patients,
	COALESCE((
		SELECT COUNT(DISTINCT o.patient_id)
		FROM orders o
		WHERE o.department_id = $1
		  AND o.deleted_at IS NULL
		  AND o.patient_id IS NOT NULL
	), 0) AS patients_with_orders
`

	dto := &model.PatientCatalogOverviewCoverageDTO{ScopeLabel: patientCatalogOverviewScopeLabel()}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(&dto.TotalPatients, &dto.PatientsWithOrders); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getPatientOverviewSummary(ctx context.Context, deptID int, patientID int) (*model.PatientOverviewSummaryDTO, error) {
	return r.queryPatientSummary(ctx, "o.patient_id = $2", []any{deptID, patientID})
}

func (r *orderRepository) getPatientCatalogOverviewSummary(ctx context.Context, deptID int) (*model.PatientCatalogOverviewSummaryDTO, error) {
	summary, err := r.queryPatientSummary(ctx, "o.patient_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	return &model.PatientCatalogOverviewSummaryDTO{
		OpenOrders:         summary.OpenOrders,
		InProductionOrders: summary.InProductionOrders,
		CompletedOrders:    summary.CompletedOrders,
		RemakeOrders:       summary.RemakeOrders,
		LifetimeOrders:     summary.LifetimeOrders,
		CompletionPercent:  summary.CompletionPercent,
	}, nil
}

func (r *orderRepository) queryPatientSummary(ctx context.Context, scopeWhere string, args []any) (*model.PatientOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id,
		%s AS status
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
),
process_totals AS (
	SELECT
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM order_item_processes op
	JOIN orders o ON o.id = op.order_id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
)
SELECT
	COUNT(*) FILTER (WHERE status IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
	COUNT(*) FILTER (WHERE status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
	COUNT(*) FILTER (WHERE status = 'rework') AS remake_orders,
	COUNT(*) AS lifetime_orders,
	COALESCE(ROUND(100.0 * (SELECT completed_processes FROM process_totals) / NULLIF((SELECT total_processes FROM process_totals), 0)), 0) AS completion_percent
FROM scoped_orders
`, orderStatusExpr, scopeWhere, processStatusExpr, scopeWhere)

	dto := &model.PatientOverviewSummaryDTO{}
	if err := r.deps.DB.QueryRowContext(ctx, query, args...).Scan(
		&dto.OpenOrders,
		&dto.InProductionOrders,
		&dto.CompletedOrders,
		&dto.RemakeOrders,
		&dto.LifetimeOrders,
		&dto.CompletionPercent,
	); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getPatientOverviewOrderStatusBreakdown(ctx context.Context, deptID int, patientID int) ([]*model.PatientOverviewOrderStatusBreakdownDTO, error) {
	return r.queryPatientOrderStatusBreakdown(ctx, deptID, "o.patient_id = $2", []any{deptID, patientID})
}

func (r *orderRepository) getPatientCatalogOverviewOrderStatusBreakdown(ctx context.Context, deptID int) ([]*model.PatientCatalogOverviewOrderStatusBreakdownDTO, error) {
	rows, err := r.queryPatientOrderStatusBreakdown(ctx, deptID, "o.patient_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	result := make([]*model.PatientCatalogOverviewOrderStatusBreakdownDTO, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, &model.PatientCatalogOverviewOrderStatusBreakdownDTO{
			Status: row.Status,
			Count:  row.Count,
		})
	}
	return result, nil
}

func (r *orderRepository) queryPatientOrderStatusBreakdown(ctx context.Context, deptID int, scopeWhere string, args []any) ([]*model.PatientOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	query := fmt.Sprintf(`
SELECT
	%s AS status,
	COUNT(*) AS count
FROM orders o
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND %s
GROUP BY %s
ORDER BY count DESC, status ASC
`, orderStatusExpr, scopeWhere, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.PatientOverviewOrderStatusBreakdownDTO, 0)
	for rows.Next() {
		row := &model.PatientOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getPatientCatalogOverviewPatientLoads(ctx context.Context, deptID int) ([]*model.PatientCatalogOverviewPatientLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH patient_base AS (
	SELECT
		p.id AS patient_id,
		NULLIF(p.name, '') AS patient_name,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s = 'completed') AS completed_orders,
		COUNT(DISTINCT o.id) AS lifetime_orders
	FROM patients p
	LEFT JOIN orders o
		ON o.patient_id = p.id
	   AND o.department_id = $1
	   AND o.deleted_at IS NULL
	WHERE p.deleted_at IS NULL
	GROUP BY p.id, p.name
),
patient_process AS (
	SELECT
		o.patient_id,
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.patient_id IS NOT NULL
	GROUP BY o.patient_id
)
SELECT
	pb.patient_id,
	pb.patient_name,
	pb.open_orders,
	pb.in_production_orders,
	pb.completed_orders,
	pb.lifetime_orders,
	COALESCE(ROUND(100.0 * pp.completed_processes / NULLIF(pp.total_processes, 0)), 0) AS completion_percent
FROM patient_base pb
LEFT JOIN patient_process pp
	ON pp.patient_id = pb.patient_id
WHERE pb.lifetime_orders > 0
ORDER BY pb.open_orders DESC, pb.in_production_orders DESC, pb.lifetime_orders DESC, pb.patient_id ASC
LIMIT 5
`, normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.PatientCatalogOverviewPatientLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.PatientCatalogOverviewPatientLoadDTO{}
		var patientName stdsql.NullString
		if err := rows.Scan(
			&row.PatientID,
			&patientName,
			&row.OpenOrders,
			&row.InProductionOrders,
			&row.CompletedOrders,
			&row.LifetimeOrders,
			&row.CompletionPercent,
		); err != nil {
			return nil, err
		}
		if patientName.Valid {
			row.PatientName = &patientName.String
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getPatientOverviewProcessLoad(ctx context.Context, deptID int, patientID int) ([]*model.PatientOverviewProcessLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
SELECT
	COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
	MIN(op.step_number) AS step_number,
	COUNT(*) FILTER (WHERE %s = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE %s = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE %s = 'qc') AS qc,
	COUNT(*) FILTER (WHERE %s = 'rework') AS rework,
	COUNT(*) FILTER (WHERE %s = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT op.order_id) FILTER (WHERE %s IN ('waiting', 'in_progress', 'qc', 'rework')) AS active_orders
FROM order_item_processes op
JOIN orders o
	ON o.id = op.order_id
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND o.patient_id = $2
GROUP BY LOWER(BTRIM(COALESCE(NULLIF(op.process_name, ''), 'Công đoạn'))), COALESCE(NULLIF(op.process_name, ''), 'Công đoạn')
ORDER BY active_orders DESC, total DESC, step_number ASC, process_name ASC
LIMIT 5
`, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.PatientOverviewProcessLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.PatientOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getPatientOverviewRecentOrders(ctx context.Context, deptID int, patientID int) ([]*model.PatientOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		MIN(COALESCE(NULLIF(o.code_latest, ''), NULLIF(o.code, ''))) AS order_code,
		%s AS order_status,
		MIN(NULLIF(o.clinic_name, '')) AS clinic_name,
		MIN(NULLIF(o.dentist_name, '')) AS dentist_name,
		COALESCE(MAX(o.updated_at), MAX(o.created_at)) AS updated_at
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.patient_id = $2
	GROUP BY o.id, %s
),
latest_process AS (
	SELECT DISTINCT ON (op.order_id)
		op.order_id,
		COALESCE(NULLIF(op.process_name, ''), NULLIF(o.process_name_latest, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	   AND o.patient_id = $2
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	ORDER BY
		op.order_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	so.order_id,
	so.order_code,
	so.order_status,
	so.clinic_name,
	so.dentist_name,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, so.updated_at) AS latest_checkpoint_at
FROM scoped_orders so
LEFT JOIN latest_process lp
	ON lp.order_id = so.order_id
ORDER BY COALESCE(lp.latest_checkpoint_at, so.updated_at) DESC, so.order_id DESC
LIMIT 5
`, orderStatusExpr, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.PatientOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.PatientOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			status             stdsql.NullString
			clinicName         stdsql.NullString
			dentistName        stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)
		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&status,
			&clinicName,
			&dentistName,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}
		if orderCode.Valid {
			row.OrderCode = &orderCode.String
		}
		if status.Valid {
			row.Status = &status.String
		}
		if clinicName.Valid {
			row.ClinicName = &clinicName.String
		}
		if dentistName.Valid {
			row.DentistName = &dentistName.String
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = &currentProcessName.String
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = &latestCheckpointAt.Time
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) resolveClinicOverviewScope(ctx context.Context, deptID int, clinicID int) (*clinicOverviewScope, error) {
	query := `
SELECT
	c.id,
	NULLIF(c.name, '') AS clinic_name,
	NULLIF(c.phone_number, '') AS phone_number,
	COALESCE((
		SELECT COUNT(*)
		FROM clinic_dentists cd
		JOIN dentists d ON d.id = cd.dentist_id
		WHERE cd.clinic_id = c.id
		  AND d.deleted_at IS NULL
	), 0) AS dentist_count,
	COALESCE((
		SELECT COUNT(*)
		FROM clinic_patients cp
		JOIN patients p ON p.id = cp.patient_id
		WHERE cp.clinic_id = c.id
		  AND p.deleted_at IS NULL
	), 0) AS patient_count
FROM clinics c
WHERE c.department_id = $1
  AND c.id = $2
  AND c.deleted_at IS NULL
LIMIT 1
`

	scope := &clinicOverviewScope{ScopeLabel: clinicOverviewScopeLabel()}
	var clinicName, phoneNumber stdsql.NullString
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, clinicID).Scan(
		&scope.ClinicID,
		&clinicName,
		&phoneNumber,
		&scope.DentistCount,
		&scope.PatientCount,
	); err != nil {
		return nil, err
	}
	if clinicName.Valid {
		scope.ClinicName = &clinicName.String
	}
	if phoneNumber.Valid {
		scope.PhoneNumber = &phoneNumber.String
	}
	return scope, nil
}

func (r *orderRepository) getClinicCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM clinics c
		WHERE c.department_id = $1
		  AND c.deleted_at IS NULL
	), 0) AS total_clinics,
	COALESCE((
		SELECT COUNT(DISTINCT o.clinic_id)
		FROM orders o
		WHERE o.department_id = $1
		  AND o.deleted_at IS NULL
		  AND o.clinic_id IS NOT NULL
	), 0) AS clinics_with_orders
`

	dto := &model.ClinicCatalogOverviewCoverageDTO{ScopeLabel: clinicCatalogOverviewScopeLabel()}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(&dto.TotalClinics, &dto.ClinicsWithOrders); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getClinicOverviewSummary(ctx context.Context, deptID int, clinicID int) (*model.ClinicOverviewSummaryDTO, error) {
	return r.queryClinicSummary(ctx, "o.clinic_id = $2", []any{deptID, clinicID})
}

func (r *orderRepository) getClinicCatalogOverviewSummary(ctx context.Context, deptID int) (*model.ClinicCatalogOverviewSummaryDTO, error) {
	summary, err := r.queryClinicSummary(ctx, "o.clinic_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	return &model.ClinicCatalogOverviewSummaryDTO{
		OpenOrders:         summary.OpenOrders,
		InProductionOrders: summary.InProductionOrders,
		CompletedOrders:    summary.CompletedOrders,
		RemakeOrders:       summary.RemakeOrders,
		LifetimeOrders:     summary.LifetimeOrders,
		CompletionPercent:  summary.CompletionPercent,
	}, nil
}

func (r *orderRepository) queryClinicSummary(ctx context.Context, scopeWhere string, args []any) (*model.ClinicOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id,
		%s AS status
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
),
process_totals AS (
	SELECT
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM order_item_processes op
	JOIN orders o ON o.id = op.order_id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND %s
)
SELECT
	COUNT(*) FILTER (WHERE status IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
	COUNT(*) FILTER (WHERE status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
	COUNT(*) FILTER (WHERE status = 'rework') AS remake_orders,
	COUNT(*) AS lifetime_orders,
	COALESCE(ROUND(100.0 * (SELECT completed_processes FROM process_totals) / NULLIF((SELECT total_processes FROM process_totals), 0)), 0) AS completion_percent
FROM scoped_orders
`, orderStatusExpr, scopeWhere, processStatusExpr, scopeWhere)

	dto := &model.ClinicOverviewSummaryDTO{}
	if err := r.deps.DB.QueryRowContext(ctx, query, args...).Scan(
		&dto.OpenOrders,
		&dto.InProductionOrders,
		&dto.CompletedOrders,
		&dto.RemakeOrders,
		&dto.LifetimeOrders,
		&dto.CompletionPercent,
	); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *orderRepository) getClinicOverviewOrderStatusBreakdown(ctx context.Context, deptID int, clinicID int) ([]*model.ClinicOverviewOrderStatusBreakdownDTO, error) {
	return r.queryClinicOrderStatusBreakdown(ctx, deptID, "o.clinic_id = $2", []any{deptID, clinicID})
}

func (r *orderRepository) getClinicCatalogOverviewOrderStatusBreakdown(ctx context.Context, deptID int) ([]*model.ClinicCatalogOverviewOrderStatusBreakdownDTO, error) {
	rows, err := r.queryClinicOrderStatusBreakdown(ctx, deptID, "o.clinic_id IS NOT NULL", []any{deptID})
	if err != nil {
		return nil, err
	}
	result := make([]*model.ClinicCatalogOverviewOrderStatusBreakdownDTO, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		result = append(result, &model.ClinicCatalogOverviewOrderStatusBreakdownDTO{
			Status: row.Status,
			Count:  row.Count,
		})
	}
	return result, nil
}

func (r *orderRepository) queryClinicOrderStatusBreakdown(ctx context.Context, deptID int, scopeWhere string, args []any) ([]*model.ClinicOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	query := fmt.Sprintf(`
SELECT
	%s AS status,
	COUNT(*) AS count
FROM orders o
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND %s
GROUP BY %s
ORDER BY count DESC, status ASC
`, orderStatusExpr, scopeWhere, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ClinicOverviewOrderStatusBreakdownDTO, 0)
	for rows.Next() {
		row := &model.ClinicOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getClinicCatalogOverviewClinicLoads(ctx context.Context, deptID int) ([]*model.ClinicCatalogOverviewClinicLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH clinic_base AS (
	SELECT
		c.id AS clinic_id,
		NULLIF(c.name, '') AS clinic_name,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('received', 'in_progress', 'qc', 'rework')) AS open_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
		COUNT(DISTINCT o.id) FILTER (WHERE %s = 'completed') AS completed_orders,
		COUNT(DISTINCT o.id) AS lifetime_orders
	FROM clinics c
	LEFT JOIN orders o
		ON o.clinic_id = c.id
	   AND o.department_id = $1
	   AND o.deleted_at IS NULL
	WHERE c.department_id = $1
	  AND c.deleted_at IS NULL
	GROUP BY c.id, c.name
),
clinic_process AS (
	SELECT
		o.clinic_id,
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) AS total_processes
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.clinic_id IS NOT NULL
	GROUP BY o.clinic_id
)
SELECT
	cb.clinic_id,
	cb.clinic_name,
	cb.open_orders,
	cb.in_production_orders,
	cb.completed_orders,
	cb.lifetime_orders,
	COALESCE(ROUND(100.0 * cp.completed_processes / NULLIF(cp.total_processes, 0)), 0) AS completion_percent
FROM clinic_base cb
LEFT JOIN clinic_process cp
	ON cp.clinic_id = cb.clinic_id
WHERE cb.lifetime_orders > 0
ORDER BY cb.open_orders DESC, cb.in_production_orders DESC, cb.lifetime_orders DESC, cb.clinic_id ASC
LIMIT 5
`, normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), normalizedOrderStatusExpr("o"), processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ClinicCatalogOverviewClinicLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.ClinicCatalogOverviewClinicLoadDTO{}
		var clinicName stdsql.NullString
		if err := rows.Scan(
			&row.ClinicID,
			&clinicName,
			&row.OpenOrders,
			&row.InProductionOrders,
			&row.CompletedOrders,
			&row.LifetimeOrders,
			&row.CompletionPercent,
		); err != nil {
			return nil, err
		}
		if clinicName.Valid {
			row.ClinicName = &clinicName.String
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getClinicOverviewProcessLoad(ctx context.Context, deptID int, clinicID int) ([]*model.ClinicOverviewProcessLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
SELECT
	COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
	COALESCE(op.step_number, 0) AS step_number,
	COUNT(*) FILTER (WHERE %s = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE %s = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE %s = 'qc') AS qc,
	COUNT(*) FILTER (WHERE %s = 'rework') AS rework,
	COUNT(*) FILTER (WHERE %s = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT op.order_id) FILTER (WHERE %s IN ('waiting', 'in_progress', 'qc', 'rework')) AS active_orders
FROM order_item_processes op
JOIN orders o
	ON o.id = op.order_id
WHERE o.department_id = $1
  AND o.deleted_at IS NULL
  AND o.clinic_id = $2
GROUP BY COALESCE(NULLIF(op.process_name, ''), 'Công đoạn'), COALESCE(op.step_number, 0)
ORDER BY active_orders DESC, total DESC, step_number ASC, process_name ASC
LIMIT 5
`, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, clinicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ClinicOverviewProcessLoadDTO, 0, 5)
	for rows.Next() {
		row := &model.ClinicOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getClinicOverviewRecentOrders(ctx context.Context, deptID int, clinicID int) ([]*model.ClinicOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")
	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		MIN(COALESCE(NULLIF(o.code_latest, ''), NULLIF(o.code, ''))) AS order_code,
		%s AS order_status,
		MIN(NULLIF(o.patient_name, '')) AS patient_name,
		COALESCE(MAX(o.updated_at), MAX(o.created_at)) AS updated_at
	FROM orders o
	WHERE o.department_id = $1
	  AND o.deleted_at IS NULL
	  AND o.clinic_id = $2
	GROUP BY o.id, %s
),
latest_process AS (
	SELECT DISTINCT ON (op.order_id)
		op.order_id,
		COALESCE(NULLIF(op.process_name, ''), NULLIF(o.process_name_latest, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	   AND o.clinic_id = $2
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	ORDER BY
		op.order_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	so.order_id,
	so.order_code,
	so.order_status,
	so.patient_name,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, so.updated_at) AS latest_checkpoint_at
FROM scoped_orders so
LEFT JOIN latest_process lp
	ON lp.order_id = so.order_id
ORDER BY COALESCE(lp.latest_checkpoint_at, so.updated_at) DESC, so.order_id DESC
LIMIT 5
`, orderStatusExpr, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, clinicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ClinicOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.ClinicOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			status             stdsql.NullString
			patientName        stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)
		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&status,
			&patientName,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}
		if orderCode.Valid {
			row.OrderCode = &orderCode.String
		}
		if status.Valid {
			row.Status = &status.String
		}
		if patientName.Valid {
			row.PatientName = &patientName.String
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = &currentProcessName.String
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = &latestCheckpointAt.Time
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) GetSectionCatalogOverview(ctx context.Context, deptID int) (*model.SectionCatalogOverviewDTO, error) {
	coverage, err := r.getSectionCatalogOverviewCoverage(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary, err := r.getSectionCatalogOverviewSummary(ctx, deptID)
	if err != nil {
		return nil, err
	}

	orderStatusBreakdown, err := r.getSectionCatalogOverviewOrderStatusBreakdown(ctx, deptID)
	if err != nil {
		return nil, err
	}

	sectionLoads, err := r.getSectionCatalogOverviewSectionLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	return &model.SectionCatalogOverviewDTO{
		Coverage:             coverage,
		Summary:              summary,
		OrderStatusBreakdown: orderStatusBreakdown,
		SectionLoads:         sectionLoads,
	}, nil
}

type staffCatalogBaseRow struct {
	StaffID      int64
	Name         string
	Active       bool
	SectionNames []string
}

type staffCatalogMetricsRow struct {
	StaffID                  int64
	OpenProcesses            int
	WaitingCount             int
	InProgressCount          int
	QCCount                  int
	ReworkCount              int
	RecentCompletedProcesses int
	RecentOrders             int
	RecentRevenue            float64
}

func (r *orderRepository) GetStaffCatalogOverview(ctx context.Context, deptID int) (*model.StaffCatalogOverviewDTO, error) {
	staffs, err := r.getStaffCatalogOverviewBase(ctx, deptID)
	if err != nil {
		return nil, err
	}

	metricsByStaffID, backlogCounts, err := r.getStaffCatalogOverviewMetrics(ctx, deptID)
	if err != nil {
		return nil, err
	}

	sectionLoads, err := r.getStaffCatalogOverviewSectionLoads(ctx, deptID)
	if err != nil {
		return nil, err
	}

	workforceSections, err := r.getStaffCatalogOverviewWorkforceSections(ctx, deptID)
	if err != nil {
		return nil, err
	}

	summary := &model.StaffCatalogOverviewSummaryDTO{
		BacklogStatusCounts: map[string]int{
			"waiting":     backlogCounts["waiting"],
			"in_progress": backlogCounts["in_progress"],
			"qc":          backlogCounts["qc"],
			"rework":      backlogCounts["rework"],
			"completed":   0,
		},
		SectionLoads:      sectionLoads,
		WorkforceSections: workforceSections,
		Coverage: &model.StaffCatalogOverviewCoverageDTO{
			ExpectedStaffs:      len(staffs),
			StaffsWithOrderData: len(metricsByStaffID),
			FailedStaffs:        0,
		},
	}

	performers := make([]*model.StaffCatalogOverviewPerformerDTO, 0, len(staffs))

	for _, staff := range staffs {
		summary.TotalStaff += 1
		if staff.Active {
			summary.ActiveStaff += 1
		}

		if metric, ok := metricsByStaffID[staff.StaffID]; ok {
			if metric.OpenProcesses > 0 {
				summary.AssignedStaffCount += 1
			}
			summary.TotalOpenProcesses += metric.OpenProcesses
			summary.TotalRecentCompletedProcesses += metric.RecentCompletedProcesses
			summary.TotalRecentOrders += metric.RecentOrders
			summary.TotalRecentRevenue += metric.RecentRevenue

			performers = append(performers, &model.StaffCatalogOverviewPerformerDTO{
				StaffID:                  staff.StaffID,
				Name:                     staff.Name,
				OpenProcesses:            metric.OpenProcesses,
				RecentCompletedProcesses: metric.RecentCompletedProcesses,
				RecentOrders:             metric.RecentOrders,
				RecentRevenue:            metric.RecentRevenue,
			})
		}
	}

	summary.InactiveStaff = summary.TotalStaff - summary.ActiveStaff
	summary.IdleStaffCount = summary.TotalStaff - summary.AssignedStaffCount
	if summary.AssignedStaffCount > 0 {
		summary.AvgOpenProcessesPerAssigned = float64(summary.TotalOpenProcesses) / float64(summary.AssignedStaffCount)
	}
	if summary.ActiveStaff > 0 {
		summary.EngagementRate = (float64(summary.AssignedStaffCount) / float64(summary.ActiveStaff)) * 100
	}

	sort.Slice(performers, func(i, j int) bool {
		left := performers[i]
		right := performers[j]
		if left.RecentCompletedProcesses != right.RecentCompletedProcesses {
			return left.RecentCompletedProcesses > right.RecentCompletedProcesses
		}
		if left.RecentOrders != right.RecentOrders {
			return left.RecentOrders > right.RecentOrders
		}
		if left.RecentRevenue != right.RecentRevenue {
			return left.RecentRevenue > right.RecentRevenue
		}
		if left.OpenProcesses != right.OpenProcesses {
			return left.OpenProcesses > right.OpenProcesses
		}
		return strings.Compare(left.Name, right.Name) < 0
	})
	if len(performers) > 5 {
		performers = performers[:5]
	}
	summary.TopPerformers = performers

	return &model.StaffCatalogOverviewDTO{Summary: summary}, nil
}

func (r *orderRepository) GetStaffOverview(ctx context.Context, deptID int, staffID int64) (*model.StaffOverviewDTO, error) {
	query := `
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		COALESCE(o.total_price, 0) AS total_revenue,
		MAX(op.completed_at) AS latest_completed_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE op.assigned_id = $2
	  AND op.completed_at IS NOT NULL
	  AND op.order_id IS NOT NULL
	GROUP BY o.id, o.total_price
)
SELECT
	COUNT(*) AS lifetime_orders,
	COALESCE(SUM(total_revenue), 0) AS lifetime_revenue,
	COALESCE(AVG(total_revenue), 0) AS average_order_value,
	COUNT(*) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '1 month') AS orders_1m,
	COALESCE(SUM(total_revenue) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '1 month'), 0) AS revenue_1m,
	COUNT(*) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '3 months') AS orders_3m,
	COALESCE(SUM(total_revenue) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '3 months'), 0) AS revenue_3m,
	COUNT(*) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '6 months') AS orders_6m,
	COALESCE(SUM(total_revenue) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '6 months'), 0) AS revenue_6m,
	COUNT(*) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '12 months') AS orders_12m,
	COALESCE(SUM(total_revenue) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '12 months'), 0) AS revenue_12m
FROM scoped_orders
`

	var (
		summary   model.StaffOverviewSummaryDTO
		orders1   int
		orders3   int
		orders6   int
		orders12  int
		revenue1  float64
		revenue3  float64
		revenue6  float64
		revenue12 float64
	)

	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, staffID).Scan(
		&summary.LifetimeOrders,
		&summary.LifetimeRevenue,
		&summary.AverageOrderValue,
		&orders1,
		&revenue1,
		&orders3,
		&revenue3,
		&orders6,
		&revenue6,
		&orders12,
		&revenue12,
	); err != nil {
		return nil, err
	}

	summary.RecentOrderCount = orders1
	summary.RecentRevenue = revenue1

	return &model.StaffOverviewDTO{
		StaffID: staffID,
		Summary: &summary,
		RevenueWindows: []*model.StaffOverviewRevenueWindowDTO{
			{Key: "1m", Label: "1 tháng", Months: 1, OrderCount: orders1, TotalRevenue: revenue1},
			{Key: "3m", Label: "3 tháng", Months: 3, OrderCount: orders3, TotalRevenue: revenue3},
			{Key: "6m", Label: "6 tháng", Months: 6, OrderCount: orders6, TotalRevenue: revenue6},
			{Key: "12m", Label: "12 tháng", Months: 12, OrderCount: orders12, TotalRevenue: revenue12},
		},
	}, nil
}

func (r *orderRepository) getStaffCatalogOverviewBase(ctx context.Context, deptID int) ([]staffCatalogBaseRow, error) {
	query := `
SELECT
	s.user_staff,
	u.name,
	COALESCE(u.active, FALSE) AS active,
	COALESCE(s.section_names, '') AS section_names
FROM staffs s
JOIN users u
	ON u.id = s.user_staff
WHERE s.department_id = $1
ORDER BY s.id ASC
`

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]staffCatalogBaseRow, 0)
	for rows.Next() {
		var (
			row             staffCatalogBaseRow
			sectionNamesRaw string
		)
		if err := rows.Scan(&row.StaffID, &row.Name, &row.Active, &sectionNamesRaw); err != nil {
			return nil, err
		}
		if strings.TrimSpace(sectionNamesRaw) == "" {
			row.SectionNames = []string{"Chưa gán bộ phận"}
		} else {
			row.SectionNames = strings.Split(sectionNamesRaw, "|")
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func (r *orderRepository) getStaffCatalogOverviewMetrics(ctx context.Context, deptID int) (map[int64]*staffCatalogMetricsRow, map[string]int, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_processes AS (
	SELECT
		op.assigned_id AS staff_id,
		%s AS process_status,
		op.completed_at,
		o.id AS order_id,
		COALESCE(o.total_price, 0) AS total_revenue
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN staffs s
		ON s.user_staff = op.assigned_id
	   AND s.department_id = $1
	WHERE op.assigned_id IS NOT NULL
),
recent_orders AS (
	SELECT
		staff_id,
		COUNT(*) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '30 day') AS recent_orders,
		COALESCE(SUM(total_revenue) FILTER (WHERE latest_completed_at >= NOW() - INTERVAL '30 day'), 0) AS recent_revenue
	FROM (
		SELECT
			staff_id,
			order_id,
			MAX(completed_at) AS latest_completed_at,
			MAX(total_revenue) AS total_revenue
		FROM scoped_processes
		WHERE completed_at IS NOT NULL
		GROUP BY staff_id, order_id
	) order_totals
	GROUP BY staff_id
)
SELECT
	sp.staff_id,
	COUNT(*) FILTER (WHERE sp.process_status <> 'completed') AS open_processes,
	COUNT(*) FILTER (WHERE sp.process_status = 'waiting') AS waiting_count,
	COUNT(*) FILTER (WHERE sp.process_status = 'in_progress') AS in_progress_count,
	COUNT(*) FILTER (WHERE sp.process_status = 'qc') AS qc_count,
	COUNT(*) FILTER (WHERE sp.process_status = 'rework') AS rework_count,
	COUNT(*) FILTER (WHERE sp.completed_at >= NOW() - INTERVAL '30 day') AS recent_completed_processes,
	COALESCE(ro.recent_orders, 0) AS recent_orders,
	COALESCE(ro.recent_revenue, 0) AS recent_revenue
FROM scoped_processes sp
LEFT JOIN recent_orders ro
	ON ro.staff_id = sp.staff_id
GROUP BY sp.staff_id, ro.recent_orders, ro.recent_revenue
`, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	metricsByStaffID := make(map[int64]*staffCatalogMetricsRow)
	backlogCounts := map[string]int{
		"waiting":     0,
		"in_progress": 0,
		"qc":          0,
		"rework":      0,
	}

	for rows.Next() {
		row := &staffCatalogMetricsRow{}
		if err := rows.Scan(
			&row.StaffID,
			&row.OpenProcesses,
			&row.WaitingCount,
			&row.InProgressCount,
			&row.QCCount,
			&row.ReworkCount,
			&row.RecentCompletedProcesses,
			&row.RecentOrders,
			&row.RecentRevenue,
		); err != nil {
			return nil, nil, err
		}

		backlogCounts["waiting"] += row.WaitingCount
		backlogCounts["in_progress"] += row.InProgressCount
		backlogCounts["qc"] += row.QCCount
		backlogCounts["rework"] += row.ReworkCount
		metricsByStaffID[row.StaffID] = row
	}

	return metricsByStaffID, backlogCounts, rows.Err()
}

func (r *orderRepository) getStaffCatalogOverviewSectionLoads(ctx context.Context, deptID int) ([]*model.StaffCatalogOverviewSectionLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_processes AS (
	SELECT
		op.assigned_id AS staff_id,
		COALESCE(NULLIF(op.section_name, ''), 'Chưa gán bộ phận') AS section_name,
		%s AS process_status
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN staffs s
		ON s.user_staff = op.assigned_id
	   AND s.department_id = $1
	WHERE op.assigned_id IS NOT NULL
)
SELECT
	section_name,
	COUNT(DISTINCT staff_id) AS staff_count,
	COUNT(*) AS open_processes
FROM scoped_processes
WHERE process_status <> 'completed'
GROUP BY section_name
ORDER BY open_processes DESC, staff_count DESC, section_name ASC
`, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.StaffCatalogOverviewSectionLoadDTO, 0)
	for rows.Next() {
		row := &model.StaffCatalogOverviewSectionLoadDTO{}
		if err := rows.Scan(&row.SectionName, &row.StaffCount, &row.OpenProcesses); err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func (r *orderRepository) getStaffCatalogOverviewWorkforceSections(ctx context.Context, deptID int) ([]*model.StaffCatalogOverviewSectionLoadDTO, error) {
	query := `
WITH expanded_sections AS (
	SELECT
		s.user_staff AS staff_id,
		UNNEST(
			CASE
				WHEN COALESCE(NULLIF(s.section_names, ''), '') = '' THEN ARRAY['Chưa gán bộ phận']
				ELSE string_to_array(s.section_names, '|')
			END
		) AS section_name
	FROM staffs s
	WHERE s.department_id = $1
)
SELECT
	section_name,
	COUNT(DISTINCT staff_id) AS staff_count
FROM expanded_sections
GROUP BY section_name
ORDER BY staff_count DESC, section_name ASC
`

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.StaffCatalogOverviewSectionLoadDTO, 0)
	for rows.Next() {
		row := &model.StaffCatalogOverviewSectionLoadDTO{}
		if err := rows.Scan(&row.SectionName, &row.StaffCount); err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	return result, rows.Err()
}

func (r *orderRepository) resolveSectionOverviewScope(ctx context.Context, deptID int, sectionID int) (*sectionOverviewScope, error) {
	query := `
SELECT
	s.id,
	COALESCE(NULLIF(s.name, ''), NULLIF(s.code, ''), 'Phòng ban') AS section_name,
	NULLIF(s.leader_name, '') AS leader_name
FROM sections s
WHERE s.id = $1
  AND s.department_id = $2
  AND s.deleted_at IS NULL
`

	scope := &sectionOverviewScope{
		ScopeLabel: sectionOverviewScopeLabel(),
	}
	if err := r.deps.DB.QueryRowContext(ctx, query, sectionID, deptID).Scan(
		&scope.SectionID,
		&scope.SectionName,
		&scope.LeaderName,
	); err != nil {
		return nil, err
	}

	return scope, nil
}

func (r *orderRepository) resolveProductOverviewScope(ctx context.Context, deptID int, productID int) (*productOverviewScope, error) {
	query := `
SELECT
	p.id,
	COALESCE(NULLIF(p.name, ''), NULLIF(p.code, ''), 'Sản phẩm') AS root_product_name,
	p.is_template
FROM products p
WHERE p.id = $1
  AND p.department_id = $2
  AND p.deleted_at IS NULL
`

	scope := &productOverviewScope{}
	if err := r.deps.DB.QueryRowContext(ctx, query, productID, deptID).Scan(
		&scope.RootProductID,
		&scope.RootProductName,
		&scope.IsTemplate,
	); err != nil {
		return nil, err
	}

	if !scope.IsTemplate {
		scope.ScopedProductIDs = []int{scope.RootProductID}
		scope.ScopeLabel = productOverviewScopeLabel(false, 0)
		return scope, nil
	}

	rows, err := r.deps.DB.QueryContext(ctx, `
SELECT p.id
FROM products p
WHERE p.department_id = $1
  AND p.deleted_at IS NULL
  AND (p.id = $2 OR p.template_id = $2)
ORDER BY CASE WHEN p.id = $2 THEN 0 ELSE 1 END, p.id ASC
`, deptID, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]int, 0, 8)
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		ids = []int{scope.RootProductID}
	}

	scope.ScopedProductIDs = ids
	if len(ids) > 1 {
		scope.VariantCount = len(ids) - 1
	}
	scope.IncludesVariants = scope.VariantCount > 0
	scope.ScopeLabel = productOverviewScopeLabel(true, scope.VariantCount)
	return scope, nil
}

func (r *orderRepository) resolveMaterialOverviewScope(ctx context.Context, deptID int, materialID int) (*materialOverviewScope, error) {
	query := `
SELECT
	m.id,
	NULLIF(m.code, '') AS material_code,
	NULLIF(m.name, '') AS material_name,
	NULLIF(m.type, '') AS material_type,
	COALESCE(m.is_implant, FALSE) AS is_implant
FROM materials m
WHERE m.id = $1
  AND m.department_id = $2
  AND m.deleted_at IS NULL
`

	scope := &materialOverviewScope{}
	var (
		materialCode stdsql.NullString
		materialName stdsql.NullString
		materialType stdsql.NullString
	)
	if err := r.deps.DB.QueryRowContext(ctx, query, materialID, deptID).Scan(
		&scope.MaterialID,
		&materialCode,
		&materialName,
		&materialType,
		&scope.IsImplant,
	); err != nil {
		return nil, err
	}

	if materialCode.Valid {
		scope.MaterialCode = utils.Ptr(materialCode.String)
	}
	if materialName.Valid {
		scope.MaterialName = utils.Ptr(materialName.String)
	}
	if materialType.Valid {
		scope.Type = utils.Ptr(materialType.String)
	}
	scope.ScopeLabel = materialOverviewScopeLabel(scope.Type, scope.IsImplant)
	return scope, nil
}

func (r *orderRepository) getProductOverviewSummary(ctx context.Context, deptID int, scopedProductIDs []int) (*model.ProductOverviewSummaryDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status,
		COALESCE(SUM(COALESCE(oip.quantity, 0)), 0) AS quantity,
		COALESCE(MAX(o.remake_count), 0) AS remake_count
	FROM orders o
	JOIN order_items oi
		ON oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN order_item_products oip
		ON oip.order_id = o.id
	   AND oip.order_item_id = oi.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND oip.product_id = ANY($2)
	GROUP BY o.id, %s
),
open_order_processes AS (
	SELECT
		COUNT(*) AS total_processes,
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) FILTER (WHERE %s <> 'completed') AS open_processes
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE op.product_id = ANY($2)
	  AND %s <> 'completed'
)
SELECT
	COUNT(*) AS lifetime_orders,
	COALESCE(SUM(quantity), 0) AS lifetime_quantity,
	COUNT(*) FILTER (WHERE order_status <> 'completed') AS open_orders,
	COUNT(*) FILTER (WHERE order_status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COALESCE(SUM(quantity) FILTER (WHERE order_status <> 'completed'), 0) AS open_quantity,
	COUNT(*) FILTER (WHERE order_status = 'completed') AS completed_orders,
	COUNT(*) FILTER (WHERE remake_count > 0) AS remake_orders,
	COALESCE((SELECT open_processes FROM open_order_processes), 0) AS open_processes,
	COALESCE((SELECT total_processes FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT completed_processes FROM open_order_processes), 0) AS completed_processes
FROM scoped_orders
`, orderStatusExpr, orderStatusExpr, processStatusExpr, processStatusExpr, orderStatusExpr)

	summary := &model.ProductOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, pq.Array(scopedProductIDs)).Scan(
		&summary.LifetimeOrders,
		&summary.LifetimeQuantity,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.OpenQuantity,
		&summary.CompletedOrders,
		&summary.RemakeOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getProductCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.ProductCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM products p
		WHERE p.department_id = $1
		  AND p.deleted_at IS NULL
	), 0) AS total_catalog_products,
	COALESCE((
		SELECT COUNT(DISTINCT oip.product_id)
		FROM order_item_products oip
		JOIN orders o
			ON o.id = oip.order_id
		   AND o.deleted_at IS NULL
		   AND o.department_id = $1
		JOIN products p
			ON p.id = oip.product_id
		   AND p.department_id = $1
		   AND p.deleted_at IS NULL
	), 0) AS products_with_orders
`

	coverage := &model.ProductCatalogOverviewCoverageDTO{
		ScopeLabel: productCatalogOverviewScopeLabel(),
	}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&coverage.TotalCatalogProducts,
		&coverage.ProductsWithOrders,
	); err != nil {
		return nil, err
	}

	return coverage, nil
}

func (r *orderRepository) getSectionCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.SectionCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM sections s
		WHERE s.department_id = $1
		  AND s.deleted_at IS NULL
	), 0) AS total_sections,
	COALESCE((
		SELECT COUNT(DISTINCT op.section_id)
		FROM order_item_processes op
		JOIN orders o
			ON o.id = op.order_id
		   AND o.deleted_at IS NULL
		   AND o.department_id = $1
		JOIN sections s
			ON s.id = op.section_id
		   AND s.department_id = $1
		   AND s.deleted_at IS NULL
		WHERE op.section_id IS NOT NULL
	), 0) AS sections_with_orders
`

	coverage := &model.SectionCatalogOverviewCoverageDTO{
		ScopeLabel: sectionCatalogOverviewScopeLabel(),
	}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&coverage.TotalSections,
		&coverage.SectionsWithOrders,
	); err != nil {
		return nil, err
	}

	return coverage, nil
}

func (r *orderRepository) getProductCatalogOverviewSummary(ctx context.Context, deptID int) (*model.ProductCatalogOverviewSummaryDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status,
		COALESCE(SUM(COALESCE(oip.quantity, 0)), 0) AS quantity,
		COALESCE(MAX(o.remake_count), 0) AS remake_count
	FROM orders o
	JOIN order_items oi
		ON oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN order_item_products oip
		ON oip.order_id = o.id
	   AND oip.order_item_id = oi.id
	JOIN products p
		ON p.id = oip.product_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	GROUP BY o.id, %s
),
	open_order_processes AS (
	SELECT
		COUNT(*) AS total_processes,
		COUNT(*) FILTER (WHERE %s = 'completed') AS completed_processes,
		COUNT(*) FILTER (WHERE %s <> 'completed') AS open_processes
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN products p
		ON p.id = op.product_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	WHERE %s <> 'completed'
)
SELECT
	COUNT(*) AS lifetime_orders,
	COUNT(*) FILTER (WHERE order_status <> 'completed') AS open_orders,
	COUNT(*) FILTER (WHERE order_status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COALESCE(SUM(quantity) FILTER (WHERE order_status <> 'completed'), 0) AS open_quantity,
	COUNT(*) FILTER (WHERE order_status = 'completed') AS completed_orders,
	COUNT(*) FILTER (WHERE remake_count > 0) AS remake_orders,
	COALESCE((SELECT open_processes FROM open_order_processes), 0) AS open_processes,
	COALESCE((SELECT total_processes FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT completed_processes FROM open_order_processes), 0) AS completed_processes
FROM scoped_orders
`, orderStatusExpr, orderStatusExpr, processStatusExpr, processStatusExpr, orderStatusExpr)

	summary := &model.ProductCatalogOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.OpenQuantity,
		&summary.CompletedOrders,
		&summary.RemakeOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getSectionOverviewSummary(ctx context.Context, deptID int, sectionID int) (*model.SectionOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status,
		COALESCE(MAX(o.remake_count), 0) AS remake_count
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND op.section_id = $2
	GROUP BY o.id, %s
),
	open_order_processes AS (
	SELECT
		%s AS process_status
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE op.section_id = $2
	  AND %s <> 'completed'
)
SELECT
	COALESCE((SELECT COUNT(*) FROM scoped_orders), 0) AS lifetime_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status <> 'completed'), 0) AS open_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status IN ('in_progress', 'qc', 'rework')), 0) AS in_production_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status = 'completed'), 0) AS completed_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE remake_count > 0), 0) AS remake_orders,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status <> 'completed'), 0) AS open_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status = 'completed'), 0) AS completed_processes
`, orderStatusExpr, orderStatusExpr, processStatusExpr, orderStatusExpr)

	summary := &model.SectionOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, sectionID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.CompletedOrders,
		&summary.RemakeOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getSectionCatalogOverviewSummary(ctx context.Context, deptID int) (*model.SectionCatalogOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status,
		COALESCE(MAX(o.remake_count), 0) AS remake_count
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	JOIN sections s
		ON s.id = op.section_id
	   AND s.department_id = $1
	   AND s.deleted_at IS NULL
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	GROUP BY o.id, %s
),
	open_order_processes AS (
	SELECT
		%s AS process_status
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN sections s
		ON s.id = op.section_id
	   AND s.department_id = $1
	   AND s.deleted_at IS NULL
	WHERE %s <> 'completed'
)
SELECT
	COALESCE((SELECT COUNT(*) FROM scoped_orders), 0) AS lifetime_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status <> 'completed'), 0) AS open_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status IN ('in_progress', 'qc', 'rework')), 0) AS in_production_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status = 'completed'), 0) AS completed_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE remake_count > 0), 0) AS remake_orders,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status <> 'completed'), 0) AS open_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status = 'completed'), 0) AS completed_processes
`, orderStatusExpr, orderStatusExpr, processStatusExpr, orderStatusExpr)

	summary := &model.SectionCatalogOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.CompletedOrders,
		&summary.RemakeOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getProcessCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewCoverageDTO, error) {
	query := fmt.Sprintf(`
WITH %s
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM processes p
		WHERE p.department_id = $1
		  AND p.deleted_at IS NULL
	), 0) AS total_processes,
	COALESCE((
		SELECT COUNT(DISTINCT p.id)
		FROM catalog_process_map cpm
		JOIN order_item_processes op
			ON op.product_id = cpm.product_id
		   AND op.step_number = cpm.step_number
		JOIN orders o
			ON o.id = op.order_id
		   AND o.deleted_at IS NULL
		   AND o.department_id = $1
		JOIN processes p
			ON p.id = cpm.process_id
		   AND p.department_id = $1
		   AND p.deleted_at IS NULL
	), 0) AS processes_with_orders
`, catalogProcessMapCTE())

	coverage := &model.ProcessCatalogOverviewCoverageDTO{
		ScopeLabel: processCatalogOverviewScopeLabel(),
	}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&coverage.TotalProcesses,
		&coverage.ProcessesWithOrders,
	); err != nil {
		return nil, err
	}

	return coverage, nil
}

func (r *orderRepository) getProcessCatalogOverviewSummary(ctx context.Context, deptID int) (*model.ProcessCatalogOverviewSummaryDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH %s,
scoped_processes AS (
	SELECT
		op.id,
		op.order_id,
		%s AS order_status,
		%s AS process_status,
		COALESCE(MAX(o.remake_count), 0) AS remake_count
	FROM catalog_process_map cpm
	JOIN order_item_processes op
		ON op.product_id = cpm.product_id
	   AND op.step_number = cpm.step_number
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN processes p
		ON p.id = cpm.process_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	GROUP BY op.id, op.order_id, %s, %s
),
scoped_orders AS (
	SELECT
		order_id,
		MAX(order_status) AS order_status,
		MAX(remake_count) AS remake_count
	FROM scoped_processes
	GROUP BY order_id
)
SELECT
	COALESCE((SELECT COUNT(*) FROM scoped_orders), 0) AS lifetime_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status <> 'completed'), 0) AS open_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status IN ('in_progress', 'qc', 'rework')), 0) AS in_production_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status = 'completed'), 0) AS completed_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE remake_count > 0), 0) AS remake_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_processes WHERE process_status <> 'completed'), 0) AS open_processes,
	COALESCE((SELECT COUNT(*) FROM scoped_processes), 0) AS total_processes,
	COALESCE((SELECT COUNT(*) FROM scoped_processes WHERE process_status = 'completed'), 0) AS completed_processes
`, catalogProcessMapCTE(), orderStatusExpr, processStatusExpr, orderStatusExpr, processStatusExpr)

	summary := &model.ProcessCatalogOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.CompletedOrders,
		&summary.RemakeOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getMaterialOverviewSummary(ctx context.Context, deptID int, materialID int) (*model.MaterialOverviewSummaryDTO, error) {
	materialStatusExpr := normalizedMaterialStatusExpr("om")
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH material_rows AS (
	SELECT
		om.order_id,
		om.order_item_id,
		COALESCE(om.quantity, 0) AS quantity,
		%s AS material_status,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	WHERE om.material_id = $2
	  AND om.type = 'loaner'
	  AND om.is_cloneable IS NULL
),
scoped_orders AS (
	SELECT
		order_id,
		MAX(order_status) AS order_status,
		COALESCE(SUM(quantity), 0) AS quantity,
		BOOL_OR(material_status = 'partial_returned') AS has_partial_returned,
		BOOL_OR(material_status = 'returned') AS has_returned
	FROM material_rows
	GROUP BY order_id
),
material_targets AS (
	SELECT DISTINCT
		order_id,
		order_item_id,
		order_status
	FROM material_rows
),
open_order_processes AS (
	SELECT
		%s AS process_status
	FROM order_item_processes op
	JOIN material_targets mt
		ON mt.order_id = op.order_id
	   AND mt.order_item_id = op.order_item_id
	WHERE mt.order_status <> 'completed'
)
SELECT
	COALESCE((SELECT COUNT(*) FROM scoped_orders), 0) AS lifetime_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status <> 'completed'), 0) AS open_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status IN ('in_progress', 'qc', 'rework')), 0) AS in_production_orders,
	COALESCE((SELECT SUM(quantity) FROM material_rows WHERE material_status IN ('on_loan', 'partial_returned')), 0) AS on_loan_quantity,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE has_returned), 0) AS returned_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE has_partial_returned), 0) AS partial_returned_orders,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status <> 'completed'), 0) AS open_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status = 'completed'), 0) AS completed_processes
`, materialStatusExpr, orderStatusExpr, processStatusExpr)

	summary := &model.MaterialOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID, materialID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.OnLoanQuantity,
		&summary.ReturnedOrders,
		&summary.PartialReturnedOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getMaterialCatalogOverviewCoverage(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewCoverageDTO, error) {
	query := `
SELECT
	COALESCE((
		SELECT COUNT(*)
		FROM materials m
		WHERE m.department_id = $1
		  AND m.deleted_at IS NULL
	), 0) AS total_catalog_materials,
	COALESCE((
		SELECT COUNT(DISTINCT om.material_id)
		FROM order_item_materials om
		JOIN orders o
			ON o.id = om.order_id
		   AND o.deleted_at IS NULL
		   AND o.department_id = $1
		JOIN materials m
			ON m.id = om.material_id
		   AND m.department_id = $1
		   AND m.deleted_at IS NULL
		WHERE om.type = 'loaner'
		  AND om.is_cloneable IS NULL
	), 0) AS materials_with_orders
`

	coverage := &model.MaterialCatalogOverviewCoverageDTO{
		ScopeLabel: materialCatalogOverviewScopeLabel(),
	}
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&coverage.TotalCatalogMaterials,
		&coverage.MaterialsWithOrders,
	); err != nil {
		return nil, err
	}

	return coverage, nil
}

func (r *orderRepository) getMaterialCatalogOverviewSummary(ctx context.Context, deptID int) (*model.MaterialCatalogOverviewSummaryDTO, error) {
	materialStatusExpr := normalizedMaterialStatusExpr("om")
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH material_rows AS (
	SELECT
		om.order_id,
		om.order_item_id,
		COALESCE(om.quantity, 0) AS quantity,
		%s AS material_status,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN materials m
		ON m.id = om.material_id
	   AND m.department_id = $1
	   AND m.deleted_at IS NULL
	WHERE om.type = 'loaner'
	  AND om.is_cloneable IS NULL
),
scoped_orders AS (
	SELECT
		order_id,
		MAX(order_status) AS order_status,
		COALESCE(SUM(quantity), 0) AS quantity,
		BOOL_OR(material_status = 'partial_returned') AS has_partial_returned,
		BOOL_OR(material_status = 'returned') AS has_returned
	FROM material_rows
	GROUP BY order_id
),
material_targets AS (
	SELECT DISTINCT
		order_id,
		order_item_id,
		order_status
	FROM material_rows
),
open_order_processes AS (
	SELECT
		%s AS process_status
	FROM order_item_processes op
	JOIN material_targets mt
		ON mt.order_id = op.order_id
	   AND mt.order_item_id = op.order_item_id
	WHERE mt.order_status <> 'completed'
)
SELECT
	COALESCE((SELECT COUNT(*) FROM scoped_orders), 0) AS lifetime_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status <> 'completed'), 0) AS open_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE order_status IN ('in_progress', 'qc', 'rework')), 0) AS in_production_orders,
	COALESCE((SELECT SUM(quantity) FROM material_rows WHERE material_status IN ('on_loan', 'partial_returned')), 0) AS on_loan_quantity,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE has_returned), 0) AS returned_orders,
	COALESCE((SELECT COUNT(*) FROM scoped_orders WHERE has_partial_returned), 0) AS partial_returned_orders,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status <> 'completed'), 0) AS open_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes), 0) AS total_processes,
	COALESCE((SELECT COUNT(*) FROM open_order_processes WHERE process_status = 'completed'), 0) AS completed_processes
`, materialStatusExpr, orderStatusExpr, processStatusExpr)

	summary := &model.MaterialCatalogOverviewSummaryDTO{}
	var totalProcesses int
	var completedProcesses int
	if err := r.deps.DB.QueryRowContext(ctx, query, deptID).Scan(
		&summary.LifetimeOrders,
		&summary.OpenOrders,
		&summary.InProductionOrders,
		&summary.OnLoanQuantity,
		&summary.ReturnedOrders,
		&summary.PartialReturnedOrders,
		&summary.OpenProcesses,
		&totalProcesses,
		&completedProcesses,
	); err != nil {
		return nil, err
	}

	if totalProcesses > 0 {
		summary.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
	}

	return summary, nil
}

func (r *orderRepository) getProductOverviewStatusBreakdown(
	ctx context.Context,
	deptID int,
	scopedProductIDs []int,
) ([]*model.ProductOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status
	FROM orders o
	JOIN order_items oi
		ON oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN order_item_products oip
		ON oip.order_id = o.id
	   AND oip.order_item_id = oi.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND oip.product_id = ANY($2)
	GROUP BY o.id, %s
)
SELECT order_status, COUNT(*) AS total
FROM scoped_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, pq.Array(scopedProductIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.ProductOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProductCatalogOverviewStatusBreakdown(
	ctx context.Context,
	deptID int,
) ([]*model.ProductCatalogOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status
	FROM orders o
	JOIN order_items oi
		ON oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN order_item_products oip
		ON oip.order_id = o.id
	   AND oip.order_item_id = oi.id
	JOIN products p
		ON p.id = oip.product_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	GROUP BY o.id, %s
)
SELECT order_status, COUNT(*) AS total
FROM scoped_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductCatalogOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.ProductCatalogOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getSectionOverviewOrderStatusBreakdown(
	ctx context.Context,
	deptID int,
	sectionID int,
) ([]*model.SectionOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND op.section_id = $2
	GROUP BY o.id, %s
)
SELECT order_status, COUNT(*) AS total
FROM scoped_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.SectionOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.SectionOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getSectionCatalogOverviewOrderStatusBreakdown(
	ctx context.Context,
	deptID int,
) ([]*model.SectionCatalogOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	JOIN sections s
		ON s.id = op.section_id
	   AND s.department_id = $1
	   AND s.deleted_at IS NULL
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	GROUP BY o.id, %s
)
SELECT order_status, COUNT(*) AS total
FROM scoped_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.SectionCatalogOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.SectionCatalogOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProcessCatalogOverviewOrderStatusBreakdown(
	ctx context.Context,
	deptID int,
) ([]*model.ProcessCatalogOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH %s,
scoped_orders AS (
	SELECT
		o.id AS order_id,
		%s AS order_status
	FROM catalog_process_map cpm
	JOIN order_item_processes op
		ON op.product_id = cpm.product_id
	   AND op.step_number = cpm.step_number
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN processes p
		ON p.id = cpm.process_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	GROUP BY o.id, %s
)
SELECT order_status, COUNT(*) AS total
FROM scoped_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, catalogProcessMapCTE(), orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProcessCatalogOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.ProcessCatalogOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialOverviewOrderStatusBreakdown(
	ctx context.Context,
	deptID int,
	materialID int,
) ([]*model.MaterialOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH material_orders AS (
	SELECT
		om.order_id,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	WHERE om.material_id = $2
	  AND om.type = 'loaner'
	  AND om.is_cloneable IS NULL
	GROUP BY om.order_id, %s
)
SELECT order_status, COUNT(*) AS total
FROM material_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.MaterialOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialOverviewMaterialStatusBreakdown(
	ctx context.Context,
	deptID int,
	materialID int,
) ([]*model.MaterialOverviewMaterialStatusBreakdownDTO, error) {
	materialStatusExpr := normalizedMaterialStatusExpr("om")

	query := fmt.Sprintf(`
SELECT
	%s AS material_status,
	COUNT(*) AS total
FROM order_item_materials om
JOIN orders o
	ON o.id = om.order_id
   AND o.deleted_at IS NULL
   AND o.department_id = $1
JOIN order_items oi
	ON oi.id = om.order_item_id
   AND oi.order_id = o.id
   AND oi.deleted_at IS NULL
WHERE om.material_id = $2
  AND om.type = 'loaner'
  AND om.is_cloneable IS NULL
GROUP BY material_status
ORDER BY total DESC, material_status ASC
`, materialStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialOverviewMaterialStatusBreakdownDTO, 0, 3)
	for rows.Next() {
		row := &model.MaterialOverviewMaterialStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialCatalogOverviewOrderStatusBreakdown(
	ctx context.Context,
	deptID int,
) ([]*model.MaterialCatalogOverviewOrderStatusBreakdownDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH material_orders AS (
	SELECT
		om.order_id,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN materials m
		ON m.id = om.material_id
	   AND m.department_id = $1
	   AND m.deleted_at IS NULL
	WHERE om.type = 'loaner'
	  AND om.is_cloneable IS NULL
	GROUP BY om.order_id, %s
)
SELECT order_status, COUNT(*) AS total
FROM material_orders
WHERE order_status <> 'completed'
GROUP BY order_status
ORDER BY total DESC, order_status ASC
`, orderStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialCatalogOverviewOrderStatusBreakdownDTO, 0, 4)
	for rows.Next() {
		row := &model.MaterialCatalogOverviewOrderStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialCatalogOverviewMaterialStatusBreakdown(
	ctx context.Context,
	deptID int,
) ([]*model.MaterialCatalogOverviewMaterialStatusBreakdownDTO, error) {
	materialStatusExpr := normalizedMaterialStatusExpr("om")

	query := fmt.Sprintf(`
SELECT
	%s AS material_status,
	COUNT(*) AS total
FROM order_item_materials om
JOIN orders o
	ON o.id = om.order_id
   AND o.deleted_at IS NULL
   AND o.department_id = $1
JOIN order_items oi
	ON oi.id = om.order_item_id
   AND oi.order_id = o.id
   AND oi.deleted_at IS NULL
JOIN materials m
	ON m.id = om.material_id
   AND m.department_id = $1
   AND m.deleted_at IS NULL
WHERE om.type = 'loaner'
  AND om.is_cloneable IS NULL
GROUP BY material_status
ORDER BY total DESC, material_status ASC
`, materialStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialCatalogOverviewMaterialStatusBreakdownDTO, 0, 3)
	for rows.Next() {
		row := &model.MaterialCatalogOverviewMaterialStatusBreakdownDTO{}
		if err := rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProductOverviewProcessLoad(
	ctx context.Context,
	deptID int,
	scopedProductIDs []int,
) ([]*model.ProductOverviewProcessLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH open_product_processes AS (
	SELECT
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
		op.step_number,
		%s AS process_status,
		op.order_id
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE op.product_id = ANY($2)
	  AND %s <> 'completed'
)
SELECT
	process_name,
	step_number,
	COUNT(*) FILTER (WHERE process_status = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE process_status = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE process_status = 'qc') AS qc,
	COUNT(*) FILTER (WHERE process_status = 'rework') AS rework,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT order_id) AS active_orders
FROM open_product_processes
GROUP BY step_number, process_name
ORDER BY step_number ASC, process_name ASC
`, processStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, pq.Array(scopedProductIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductOverviewProcessLoadDTO, 0, 8)
	for rows.Next() {
		row := &model.ProductOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProductCatalogOverviewProcessLoad(
	ctx context.Context,
	deptID int,
) ([]*model.ProductCatalogOverviewProcessLoadDTO, error) {
	processStatusExpr := normalizedProcessStatusExpr("op")
	orderStatusExpr := normalizedOrderStatusExpr("o")

	query := fmt.Sprintf(`
WITH open_product_processes AS (
	SELECT
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
		COALESCE(op.step_number, 0) AS step_number,
		%s AS process_status,
		op.order_id
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN products p
		ON p.id = op.product_id
	   AND p.department_id = $1
	   AND p.deleted_at IS NULL
	WHERE %s <> 'completed'
)
SELECT
	process_name,
	step_number,
	COUNT(*) FILTER (WHERE process_status = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE process_status = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE process_status = 'qc') AS qc,
	COUNT(*) FILTER (WHERE process_status = 'rework') AS rework,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT order_id) AS active_orders
FROM open_product_processes
GROUP BY step_number, process_name
ORDER BY total DESC, active_orders DESC, step_number ASC, process_name ASC
LIMIT 6
`, processStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductCatalogOverviewProcessLoadDTO, 0, 6)
	for rows.Next() {
		row := &model.ProductCatalogOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getSectionOverviewProcessLoad(
	ctx context.Context,
	deptID int,
	sectionID int,
) ([]*model.SectionOverviewProcessLoadDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH process_rows AS (
	SELECT
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
		COALESCE(op.step_number, 0) AS step_number,
		%s AS process_status,
		op.order_id
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE op.section_id = $2
	  AND %s <> 'completed'
)
SELECT
	process_name,
	step_number,
	COUNT(*) FILTER (WHERE process_status = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE process_status = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE process_status = 'qc') AS qc,
	COUNT(*) FILTER (WHERE process_status = 'rework') AS rework,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT order_id) AS active_orders
FROM process_rows
GROUP BY step_number, process_name
ORDER BY step_number ASC, process_name ASC
`, processStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.SectionOverviewProcessLoadDTO, 0, 8)
	for rows.Next() {
		row := &model.SectionOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getSectionCatalogOverviewSectionLoads(
	ctx context.Context,
	deptID int,
) ([]*model.SectionCatalogOverviewSectionLoadDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH process_rows AS (
	SELECT
		s.id AS section_id,
		COALESCE(NULLIF(s.name, ''), NULLIF(s.code, ''), 'Phòng ban') AS section_name,
		NULLIF(s.leader_name, '') AS leader_name,
		o.id AS order_id,
		%s AS order_status,
		%s AS process_status
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN sections s
		ON s.id = op.section_id
	   AND s.department_id = $1
	   AND s.deleted_at IS NULL
	WHERE %s <> 'completed'
)
SELECT
	section_id,
	section_name,
	leader_name,
	COUNT(DISTINCT order_id) AS active_orders,
	COUNT(DISTINCT order_id) FILTER (WHERE order_status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COUNT(*) FILTER (WHERE process_status <> 'completed') AS open_processes,
	COUNT(*) AS total_processes,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed_processes
FROM process_rows
GROUP BY section_id, section_name, leader_name
ORDER BY open_processes DESC, active_orders DESC, section_name ASC
LIMIT 6
`, orderStatusExpr, processStatusExpr, orderStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.SectionCatalogOverviewSectionLoadDTO, 0, 6)
	for rows.Next() {
		row := &model.SectionCatalogOverviewSectionLoadDTO{}
		var (
			sectionName        stdsql.NullString
			leaderName         stdsql.NullString
			totalProcesses     int
			completedProcesses int
		)
		if err := rows.Scan(
			&row.SectionID,
			&sectionName,
			&leaderName,
			&row.ActiveOrders,
			&row.InProductionOrders,
			&row.OpenProcesses,
			&totalProcesses,
			&completedProcesses,
		); err != nil {
			return nil, err
		}
		if sectionName.Valid {
			row.SectionName = &sectionName.String
		}
		if leaderName.Valid {
			row.LeaderName = &leaderName.String
		}
		if totalProcesses > 0 {
			row.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialOverviewProcessLoad(
	ctx context.Context,
	deptID int,
	materialID int,
) ([]*model.MaterialOverviewProcessLoadDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH material_targets AS (
	SELECT DISTINCT
		om.order_id,
		om.order_item_id,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	WHERE om.material_id = $2
	  AND om.type = 'loaner'
	  AND om.is_cloneable IS NULL
),
process_rows AS (
	SELECT
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
		COALESCE(op.step_number, 0) AS step_number,
		%s AS process_status,
		op.order_id
	FROM order_item_processes op
	JOIN material_targets mt
		ON mt.order_id = op.order_id
	   AND mt.order_item_id = op.order_item_id
	WHERE mt.order_status <> 'completed'
)
SELECT
	process_name,
	step_number,
	COUNT(*) FILTER (WHERE process_status = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE process_status = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE process_status = 'qc') AS qc,
	COUNT(*) FILTER (WHERE process_status = 'rework') AS rework,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT order_id) AS active_orders
FROM process_rows
GROUP BY step_number, process_name
ORDER BY step_number ASC, process_name ASC
`, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialOverviewProcessLoadDTO, 0, 8)
	for rows.Next() {
		row := &model.MaterialOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProcessCatalogOverviewProcessLoads(
	ctx context.Context,
	deptID int,
) ([]*model.ProcessCatalogOverviewProcessLoadDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH %s,
process_rows AS (
	SELECT
		p.id AS process_id,
		NULLIF(p.code, '') AS process_code,
		COALESCE(NULLIF(p.name, ''), NULLIF(p.code, ''), 'Công đoạn') AS process_name,
		NULLIF(p.section_name, '') AS section_name,
		o.id AS order_id,
		%s AS order_status,
		%s AS process_status
	FROM catalog_process_map cpm
	JOIN order_item_processes op
		ON op.product_id = cpm.product_id
	   AND op.step_number = cpm.step_number
	JOIN processes p
		ON p.id = cpm.process_id
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	WHERE p.department_id = $1
	  AND p.deleted_at IS NULL
)
SELECT
	process_id,
	process_code,
	process_name,
	section_name,
	COUNT(DISTINCT order_id) AS active_orders,
	COUNT(DISTINCT order_id) FILTER (WHERE order_status IN ('in_progress', 'qc', 'rework')) AS in_production_orders,
	COUNT(*) FILTER (WHERE process_status <> 'completed') AS open_processes,
	COUNT(*) AS total_processes,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed_processes
FROM process_rows
GROUP BY process_id, process_code, process_name, section_name
ORDER BY open_processes DESC, active_orders DESC, process_name ASC
LIMIT 6
`, catalogProcessMapCTE(), orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProcessCatalogOverviewProcessLoadDTO, 0, 6)
	for rows.Next() {
		row := &model.ProcessCatalogOverviewProcessLoadDTO{}
		var (
			processCode        stdsql.NullString
			processName        stdsql.NullString
			sectionName        stdsql.NullString
			totalProcesses     int
			completedProcesses int
		)
		if err := rows.Scan(
			&row.ProcessID,
			&processCode,
			&processName,
			&sectionName,
			&row.ActiveOrders,
			&row.InProductionOrders,
			&row.OpenProcesses,
			&totalProcesses,
			&completedProcesses,
		); err != nil {
			return nil, err
		}
		if processCode.Valid {
			row.ProcessCode = &processCode.String
		}
		if processName.Valid {
			row.ProcessName = &processName.String
		}
		if sectionName.Valid {
			row.SectionName = &sectionName.String
		}
		if totalProcesses > 0 {
			row.CompletionPercent = int(math.Round((float64(completedProcesses) / float64(totalProcesses)) * 100))
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialCatalogOverviewProcessLoad(
	ctx context.Context,
	deptID int,
) ([]*model.MaterialCatalogOverviewProcessLoadDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH material_targets AS (
	SELECT DISTINCT
		om.order_id,
		om.order_item_id,
		%s AS order_status
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN materials m
		ON m.id = om.material_id
	   AND m.department_id = $1
	   AND m.deleted_at IS NULL
	WHERE om.type = 'loaner'
	  AND om.is_cloneable IS NULL
),
process_rows AS (
	SELECT
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS process_name,
		COALESCE(op.step_number, 0) AS step_number,
		%s AS process_status,
		op.order_id
	FROM order_item_processes op
	JOIN material_targets mt
		ON mt.order_id = op.order_id
	   AND mt.order_item_id = op.order_item_id
	WHERE mt.order_status <> 'completed'
)
SELECT
	process_name,
	step_number,
	COUNT(*) FILTER (WHERE process_status = 'waiting') AS waiting,
	COUNT(*) FILTER (WHERE process_status = 'in_progress') AS in_progress,
	COUNT(*) FILTER (WHERE process_status = 'qc') AS qc,
	COUNT(*) FILTER (WHERE process_status = 'rework') AS rework,
	COUNT(*) FILTER (WHERE process_status = 'completed') AS completed,
	COUNT(*) AS total,
	COUNT(DISTINCT order_id) AS active_orders
FROM process_rows
GROUP BY step_number, process_name
ORDER BY total DESC, active_orders DESC, step_number ASC, process_name ASC
LIMIT 6
`, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialCatalogOverviewProcessLoadDTO, 0, 6)
	for rows.Next() {
		row := &model.MaterialCatalogOverviewProcessLoadDTO{}
		if err := rows.Scan(
			&row.ProcessName,
			&row.StepNumber,
			&row.Waiting,
			&row.InProgress,
			&row.QC,
			&row.Rework,
			&row.Completed,
			&row.Total,
			&row.ActiveOrders,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProductOverviewFallbackProcessLoad(
	ctx context.Context,
	scopedProductIDs []int,
) ([]*model.ProductOverviewProcessLoadDTO, error) {
	query := fmt.Sprintf(`
WITH product_categories AS (
	SELECT
		id AS product_id,
		category_id
	FROM products
	WHERE id = ANY($1)
	  AND deleted_at IS NULL
),
process_candidates AS (
	SELECT
		pc.product_id,
		cp.process_id,
		1 AS source_priority,
		COALESCE(cp.display_order, 0) AS display_order
	FROM product_categories pc
	JOIN %s cp
		ON cp.category_id = pc.category_id

	UNION ALL

	SELECT
		pc.product_id,
		pp.process_id,
		2 AS source_priority,
		COALESCE(pp.display_order, 0) AS display_order
	FROM product_categories pc
	JOIN %s pp
		ON pp.product_id = pc.product_id
),
ranked_processes AS (
	SELECT
		product_id,
		process_id,
		source_priority,
		display_order,
		ROW_NUMBER() OVER (
			PARTITION BY product_id, process_id
			ORDER BY source_priority ASC, display_order ASC, process_id ASC
		) AS rn
	FROM process_candidates
),
unique_processes AS (
	SELECT
		p.id AS process_id,
		COALESCE(NULLIF(p.name, ''), NULLIF(p.code, ''), 'Công đoạn') AS process_name,
		MIN(rp.source_priority) AS source_priority,
		MIN(rp.display_order) AS display_order
	FROM ranked_processes rp
	JOIN processes p
		ON p.id = rp.process_id
	WHERE rp.rn = 1
	  AND p.deleted_at IS NULL
	GROUP BY p.id, process_name
)
SELECT process_name
FROM unique_processes
ORDER BY source_priority ASC, display_order ASC, process_id ASC
`, categoryprocess.Table, productprocess.Table)

	rows, err := r.deps.DB.QueryContext(ctx, query, pq.Array(scopedProductIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductOverviewProcessLoadDTO, 0, 8)
	stepNumber := 1
	for rows.Next() {
		row := &model.ProductOverviewProcessLoadDTO{}
		if err := rows.Scan(&row.ProcessName); err != nil {
			return nil, err
		}
		row.StepNumber = stepNumber
		stepNumber++
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getProductOverviewRecentOrders(
	ctx context.Context,
	deptID int,
	scopedProductIDs []int,
) ([]*model.ProductOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		MIN(NULLIF(o.code_latest, '')) AS order_code,
		%s AS order_status,
		COALESCE(SUM(COALESCE(oip.quantity, 0)), 0) AS quantity,
		COALESCE(MAX(o.updated_at), MAX(o.created_at)) AS updated_at
	FROM orders o
	JOIN order_items oi
		ON oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	JOIN order_item_products oip
		ON oip.order_id = o.id
	   AND oip.order_item_id = oi.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND oip.product_id = ANY($2)
	GROUP BY o.id, %s
),
latest_process AS (
	SELECT DISTINCT ON (op.order_id)
		op.order_id,
		COALESCE(NULLIF(op.process_name, ''), NULLIF(o.process_name_latest, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	WHERE op.product_id = ANY($2)
	ORDER BY
		op.order_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	so.order_id,
	so.order_code,
	so.order_status,
	so.quantity,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, so.updated_at) AS latest_checkpoint_at
FROM scoped_orders so
LEFT JOIN latest_process lp
	ON lp.order_id = so.order_id
ORDER BY COALESCE(lp.latest_checkpoint_at, so.updated_at) DESC, so.order_id DESC
LIMIT 5
`, orderStatusExpr, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, pq.Array(scopedProductIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.ProductOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.ProductOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			status             stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)

		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&status,
			&row.Quantity,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}

		if orderCode.Valid {
			row.OrderCode = &orderCode.String
		}
		if status.Valid {
			row.Status = &status.String
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = &currentProcessName.String
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = &latestCheckpointAt.Time
		}

		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getSectionOverviewRecentOrders(
	ctx context.Context,
	deptID int,
	sectionID int,
) ([]*model.SectionOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")

	query := fmt.Sprintf(`
WITH scoped_orders AS (
	SELECT
		o.id AS order_id,
		MIN(COALESCE(NULLIF(o.code_latest, ''), NULLIF(o.code, ''))) AS order_code,
		%s AS order_status,
		MIN(NULLIF(o.clinic_name, '')) AS clinic_name,
		MIN(NULLIF(o.patient_name, '')) AS patient_name,
		COALESCE(MAX(o.updated_at), MAX(o.created_at)) AS updated_at
	FROM orders o
	JOIN order_item_processes op
		ON op.order_id = o.id
	WHERE o.deleted_at IS NULL
	  AND o.department_id = $1
	  AND op.section_id = $2
	GROUP BY o.id, %s
),
	latest_process AS (
	SELECT DISTINCT ON (op.order_id)
		op.order_id,
		COALESCE(NULLIF(op.process_name, ''), NULLIF(o.process_name_latest, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	WHERE op.section_id = $2
	ORDER BY
		op.order_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	so.order_id,
	so.order_code,
	so.order_status,
	so.clinic_name,
	so.patient_name,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, so.updated_at) AS latest_checkpoint_at
FROM scoped_orders so
LEFT JOIN latest_process lp
	ON lp.order_id = so.order_id
ORDER BY COALESCE(lp.latest_checkpoint_at, so.updated_at) DESC, so.order_id DESC
LIMIT 5
`, orderStatusExpr, orderStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.SectionOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.SectionOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			status             stdsql.NullString
			clinicName         stdsql.NullString
			patientName        stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)
		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&status,
			&clinicName,
			&patientName,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}
		if orderCode.Valid {
			row.OrderCode = &orderCode.String
		}
		if status.Valid {
			row.Status = &status.String
		}
		if clinicName.Valid {
			row.ClinicName = &clinicName.String
		}
		if patientName.Valid {
			row.PatientName = &patientName.String
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = &currentProcessName.String
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = &latestCheckpointAt.Time
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) getMaterialOverviewRecentOrders(
	ctx context.Context,
	deptID int,
	materialID int,
) ([]*model.MaterialOverviewRecentOrderDTO, error) {
	orderStatusExpr := normalizedOrderStatusExpr("o")
	processStatusExpr := normalizedProcessStatusExpr("op")
	materialStatusExpr := normalizedMaterialStatusExpr("om")

	query := fmt.Sprintf(`
WITH material_rows AS (
	SELECT DISTINCT ON (om.order_item_id)
		om.id AS material_row_id,
		om.order_id,
		om.order_item_id,
		COALESCE(NULLIF(o.code_latest, ''), NULLIF(o.code, '')) AS order_code,
		COALESCE(NULLIF(oi.code, ''), NULLIF(o.code_latest, ''), NULLIF(o.code, '')) AS order_item_code,
		%s AS order_status,
		%s AS material_status,
		COALESCE(om.quantity, 0) AS quantity,
		om.clinic_name,
		om.patient_name,
		COALESCE(om.returned_at, om.on_loan_at, o.updated_at, o.created_at) AS material_checkpoint_at
	FROM order_item_materials om
	JOIN orders o
		ON o.id = om.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN order_items oi
		ON oi.id = om.order_item_id
	   AND oi.order_id = o.id
	   AND oi.deleted_at IS NULL
	WHERE om.material_id = $2
	  AND om.type = 'loaner'
	  AND om.is_cloneable IS NULL
	ORDER BY om.order_item_id, COALESCE(om.returned_at, om.on_loan_at, o.updated_at, o.created_at) DESC, om.id DESC
),
latest_process AS (
	SELECT DISTINCT ON (op.order_id, op.order_item_id)
		op.order_id,
		op.order_item_id,
		COALESCE(NULLIF(op.process_name, ''), 'Công đoạn') AS current_process_name,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) AS latest_checkpoint_at
	FROM order_item_processes op
	JOIN orders o
		ON o.id = op.order_id
	   AND o.deleted_at IS NULL
	   AND o.department_id = $1
	JOIN material_rows mr
		ON mr.order_id = op.order_id
	   AND mr.order_item_id = op.order_item_id
	LEFT JOIN LATERAL (
		SELECT
			ip.completed_at,
			ip.started_at,
			ip.created_at
		FROM order_item_process_in_progresses ip
		WHERE ip.process_id = op.id
		ORDER BY COALESCE(ip.completed_at, ip.started_at, ip.created_at) DESC, ip.id DESC
		LIMIT 1
	) ip ON TRUE
	ORDER BY
		op.order_id,
		op.order_item_id,
		CASE %s
			WHEN 'in_progress' THEN 1
			WHEN 'qc' THEN 2
			WHEN 'rework' THEN 3
			WHEN 'waiting' THEN 4
			WHEN 'completed' THEN 5
			ELSE 6
		END,
		COALESCE(ip.completed_at, ip.started_at, op.completed_at, op.started_at, o.updated_at, o.created_at) DESC,
		op.step_number ASC,
		op.id DESC
)
SELECT
	mr.order_id,
	mr.order_code,
	mr.order_item_id,
	mr.order_item_code,
	mr.order_status,
	mr.material_status,
	mr.quantity,
	mr.clinic_name,
	mr.patient_name,
	lp.current_process_name,
	COALESCE(lp.latest_checkpoint_at, mr.material_checkpoint_at) AS latest_checkpoint_at
FROM material_rows mr
LEFT JOIN latest_process lp
	ON lp.order_id = mr.order_id
   AND lp.order_item_id = mr.order_item_id
ORDER BY COALESCE(lp.latest_checkpoint_at, mr.material_checkpoint_at) DESC, mr.order_id DESC, mr.order_item_id DESC
LIMIT 5
`, orderStatusExpr, materialStatusExpr, processStatusExpr)

	rows, err := r.deps.DB.QueryContext(ctx, query, deptID, materialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*model.MaterialOverviewRecentOrderDTO, 0, 5)
	for rows.Next() {
		row := &model.MaterialOverviewRecentOrderDTO{}
		var (
			orderCode          stdsql.NullString
			orderItemCode      stdsql.NullString
			status             stdsql.NullString
			materialStatus     stdsql.NullString
			clinicName         stdsql.NullString
			patientName        stdsql.NullString
			currentProcessName stdsql.NullString
			latestCheckpointAt stdsql.NullTime
		)

		if err := rows.Scan(
			&row.OrderID,
			&orderCode,
			&row.OrderItemID,
			&orderItemCode,
			&status,
			&materialStatus,
			&row.Quantity,
			&clinicName,
			&patientName,
			&currentProcessName,
			&latestCheckpointAt,
		); err != nil {
			return nil, err
		}

		if orderCode.Valid {
			row.OrderCode = utils.Ptr(orderCode.String)
		}
		if orderItemCode.Valid {
			row.OrderItemCode = utils.Ptr(orderItemCode.String)
		}
		if status.Valid {
			row.Status = utils.Ptr(status.String)
		}
		if materialStatus.Valid {
			row.MaterialStatus = utils.Ptr(materialStatus.String)
		}
		if clinicName.Valid {
			row.ClinicName = utils.Ptr(clinicName.String)
		}
		if patientName.Valid {
			row.PatientName = utils.Ptr(patientName.String)
		}
		if currentProcessName.Valid {
			row.CurrentProcessName = utils.Ptr(currentProcessName.String)
		}
		if latestCheckpointAt.Valid {
			row.LatestCheckpointAt = utils.Ptr(latestCheckpointAt.Time)
		}

		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *orderRepository) buildAdvancedSearchScope(filter model.OrderAdvancedSearchFilter) orderAdvancedSearchScope {
	scope := orderAdvancedSearchScope{
		Predicates: []predicate.Order{
			order.DeletedAtIsNil(),
		},
	}

	clauses := []string{"o.deleted_at IS NULL"}
	args := make([]any, 0, 12)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}

	if filter.DepartmentID != nil && *filter.DepartmentID > 0 {
		scope.Predicates = append(scope.Predicates, order.DepartmentIDEQ(*filter.DepartmentID))
		clauses = append(clauses, fmt.Sprintf("o.department_id = %s", addArg(*filter.DepartmentID)))
	}

	if len(filter.CategoryIDs) > 0 {
		scope.Predicates = append(scope.Predicates, order.HasItemsWith(
			orderitem.DeletedAtIsNil(),
			orderitem.HasProductsWith(
				orderitemproduct.HasProductWith(
					product.CategoryIDIn(filter.CategoryIDs...),
				),
			),
		))
		clauses = append(clauses, fmt.Sprintf(`
EXISTS (
	SELECT 1
	FROM order_items oi
	JOIN order_item_products oip ON oip.order_item_id = oi.id
	JOIN products p ON p.id = oip.product_id
	WHERE oi.order_id = o.id
	  AND oi.deleted_at IS NULL
	  AND p.category_id = ANY(%s)
)`, addArg(pq.Array(filter.CategoryIDs))))
	}

	if len(filter.ProductIDs) > 0 {
		scope.Predicates = append(scope.Predicates, order.HasItemsWith(
			orderitem.DeletedAtIsNil(),
			orderitem.HasProductsWith(
				orderitemproduct.ProductIDIn(filter.ProductIDs...),
			),
		))
		clauses = append(clauses, fmt.Sprintf(`
EXISTS (
	SELECT 1
	FROM order_items oi
	JOIN order_item_products oip ON oip.order_item_id = oi.id
	WHERE oi.order_id = o.id
	  AND oi.deleted_at IS NULL
	  AND oip.product_id = ANY(%s)
)`, addArg(pq.Array(filter.ProductIDs))))
	}

	if filter.OrderCode != nil && strings.TrimSpace(*filter.OrderCode) != "" {
		trimmed := strings.TrimSpace(*filter.OrderCode)
		pattern := "%" + trimmed + "%"
		scope.Predicates = append(scope.Predicates, order.Or(
			order.CodeLatestContainsFold(trimmed),
			order.CodeContainsFold(trimmed),
			order.HasItemsWith(
				orderitem.DeletedAtIsNil(),
				orderitem.CodeContainsFold(trimmed),
			),
		))
		clauses = append(clauses, fmt.Sprintf(`(
	o.code_latest ILIKE %s
	OR o.code ILIKE %s
	OR EXISTS (
		SELECT 1
		FROM order_items oi
		WHERE oi.order_id = o.id
		  AND oi.deleted_at IS NULL
		  AND oi.code ILIKE %s
	)
)`, addArg(pattern), addArg(pattern), addArg(pattern)))
	}

	if filter.ClinicName != nil && strings.TrimSpace(*filter.ClinicName) != "" {
		pattern := "%" + strings.TrimSpace(*filter.ClinicName) + "%"
		scope.Predicates = append(scope.Predicates, order.ClinicNameContainsFold(strings.TrimSpace(*filter.ClinicName)))
		clauses = append(clauses, fmt.Sprintf("o.clinic_name ILIKE %s", addArg(pattern)))
	}

	if filter.DentistName != nil && strings.TrimSpace(*filter.DentistName) != "" {
		pattern := "%" + strings.TrimSpace(*filter.DentistName) + "%"
		scope.Predicates = append(scope.Predicates, order.DentistNameContainsFold(strings.TrimSpace(*filter.DentistName)))
		clauses = append(clauses, fmt.Sprintf("o.dentist_name ILIKE %s", addArg(pattern)))
	}

	if filter.PatientName != nil && strings.TrimSpace(*filter.PatientName) != "" {
		pattern := "%" + strings.TrimSpace(*filter.PatientName) + "%"
		scope.Predicates = append(scope.Predicates, order.PatientNameContainsFold(strings.TrimSpace(*filter.PatientName)))
		clauses = append(clauses, fmt.Sprintf("o.patient_name ILIKE %s", addArg(pattern)))
	}

	if filter.CreatedYear != nil {
		scope.Predicates = append(scope.Predicates, yearPredicate(order.FieldCreatedAt, *filter.CreatedYear))
		clauses = append(clauses, fmt.Sprintf("EXTRACT(YEAR FROM o.created_at) = %s", addArg(*filter.CreatedYear)))
	}

	if filter.CreatedMonth != nil {
		scope.Predicates = append(scope.Predicates, monthPredicate(order.FieldCreatedAt, *filter.CreatedMonth))
		clauses = append(clauses, fmt.Sprintf("EXTRACT(MONTH FROM o.created_at) = %s", addArg(*filter.CreatedMonth)))
	}

	if filter.DeliveryYear != nil {
		scope.Predicates = append(scope.Predicates, yearPredicate(order.FieldDeliveryDate, *filter.DeliveryYear))
		clauses = append(clauses, fmt.Sprintf("o.delivery_date IS NOT NULL AND EXTRACT(YEAR FROM o.delivery_date) = %s", addArg(*filter.DeliveryYear)))
	}

	if filter.DeliveryMonth != nil {
		scope.Predicates = append(scope.Predicates, monthPredicate(order.FieldDeliveryDate, *filter.DeliveryMonth))
		clauses = append(clauses, fmt.Sprintf("o.delivery_date IS NOT NULL AND EXTRACT(MONTH FROM o.delivery_date) = %s", addArg(*filter.DeliveryMonth)))
	}

	scope.WhereSQL = strings.Join(clauses, " AND ")
	scope.Args = args

	return scope
}

func yearPredicate(field string, year int) predicate.Order {
	return predicate.Order(func(s *sql.Selector) {
		s.Where(sql.ExprP(fmt.Sprintf("EXTRACT(YEAR FROM %s) = ?", s.C(field)), year))
	})
}

func monthPredicate(field string, month int) predicate.Order {
	return predicate.Order(func(s *sql.Selector) {
		s.Where(sql.ExprP(fmt.Sprintf("EXTRACT(MONTH FROM %s) = ?", s.C(field)), month))
	})
}

func (r *orderRepository) Delete(ctx context.Context, id int64) error {
	hasItems, err := r.db.OrderItem.
		Query().
		Where(
			orderitem.OrderID(id),
			orderitem.DeletedAtIsNil(),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if hasItems {
		return fmt.Errorf("cannot delete order %d because it still has order items", id)
	}
	return r.db.Order.UpdateOneID(id).
		SetDeletedAt(time.Now()).
		Exec(ctx)
}

func (r *orderRepository) GetAllOrderProducts(ctx context.Context, orderID int64) ([]*model.OrderItemProductDTO, error) {
	products, err := r.db.OrderItemProduct.
		Query().
		Where(
			orderitemproduct.OrderIDEQ(orderID),
			orderitemproduct.HasOrderItemWith(orderitem.DeletedAtIsNil()),
		).
		Select(
			orderitemproduct.FieldID,
			orderitemproduct.FieldOrderID,
			orderitemproduct.FieldOrderItemID,
			orderitemproduct.FieldOriginalOrderItemID,
			orderitemproduct.FieldProductID,
			orderitemproduct.FieldProductCode,
			orderitemproduct.FieldQuantity,
			orderitemproduct.FieldRetailPrice,
		).
		WithOrderItem(func(q *generated.OrderItemQuery) {
			q.Select(orderitem.FieldID, orderitem.FieldCode)
		}).
		WithProduct(func(q *generated.ProductQuery) {
			q.Select(product.FieldID, product.FieldCode, product.FieldName)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}
	if len(products) == 0 {
		return nil, nil
	}

	out := make([]*model.OrderItemProductDTO, 0, len(products))
	for _, it := range products {
		dto := &model.OrderItemProductDTO{
			ID:                  it.ID,
			ProductCode:         it.ProductCode,
			ProductID:           it.ProductID,
			OrderItemID:         it.OrderItemID,
			OriginalOrderItemID: it.OriginalOrderItemID,
			OrderID:             it.OrderID,
			Quantity:            it.Quantity,
			Note:                it.Note,
			RetailPrice:         it.RetailPrice,
			TeethPosition:       it.TeethPosition,
		}
		if it.Edges.OrderItem != nil {
			dto.OrderItemCode = it.Edges.OrderItem.Code
		}
		if it.Edges.Product != nil {
			dto.ProductName = it.Edges.Product.Name
			if dto.ProductCode == nil {
				dto.ProductCode = it.Edges.Product.Code
			}
		}
		out = append(out, dto)
	}

	return out, nil
}

func (r *orderRepository) GetAllOrderMaterials(ctx context.Context, orderID int64) ([]*model.OrderItemMaterialDTO, error) {
	materials, err := r.db.OrderItemMaterial.
		Query().
		Where(
			orderitemmaterial.OrderIDEQ(orderID),
			orderitemmaterial.HasOrderItemWith(orderitem.DeletedAtIsNil()),
		).
		Select(
			orderitemmaterial.FieldID,
			orderitemmaterial.FieldOrderID,
			orderitemmaterial.FieldOrderItemID,
			orderitemmaterial.FieldMaterialID,
			orderitemmaterial.FieldMaterialCode,
			orderitemmaterial.FieldQuantity,
			orderitemmaterial.FieldRetailPrice,
			orderitemmaterial.FieldType,
			orderitemmaterial.FieldNote,
		).
		WithOrderItem(func(q *generated.OrderItemQuery) {
			q.Select(orderitem.FieldID, orderitem.FieldCode)
		}).
		WithMaterial(func(q *generated.MaterialQuery) {
			q.Select(material.FieldID, material.FieldCode, material.FieldName)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}
	if len(materials) == 0 {
		return nil, nil
	}

	out := make([]*model.OrderItemMaterialDTO, 0, len(materials))
	for _, it := range materials {
		dto := &model.OrderItemMaterialDTO{
			ID:           it.ID,
			MaterialCode: it.MaterialCode,
			MaterialID:   it.MaterialID,
			OrderItemID:  it.OrderItemID,
			OrderID:      it.OrderID,
			Quantity:     it.Quantity,
			Note:         it.Note,
			RetailPrice:  it.RetailPrice,
			Type:         it.Type,
		}
		if it.Edges.OrderItem != nil {
			dto.OrderItemCode = it.Edges.OrderItem.Code
		}
		if it.Edges.Material != nil {
			dto.MaterialName = it.Edges.Material.Name
			if dto.MaterialCode == nil {
				dto.MaterialCode = it.Edges.Material.Code
			}
		}
		out = append(out, dto)
	}

	return out, nil
}

func (r *orderRepository) GetAllOrderProductsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemProductDTO, error) {
	products, err := r.db.OrderItemProduct.
		Query().
		Where(
			orderitemproduct.OrderItemIDEQ(orderItemID),
			orderitemproduct.HasOrderItemWith(orderitem.DeletedAtIsNil()),
		).
		Select(
			orderitemproduct.FieldID,
			orderitemproduct.FieldOrderID,
			orderitemproduct.FieldOrderItemID,
			orderitemproduct.FieldOriginalOrderItemID,
			orderitemproduct.FieldProductID,
			orderitemproduct.FieldProductCode,
			orderitemproduct.FieldQuantity,
			orderitemproduct.FieldRetailPrice,
			orderitemproduct.FieldNote,
			orderitemproduct.FieldIsCloneable,
			orderitemproduct.FieldTeethPosition,
		).
		WithOrderItem(func(q *generated.OrderItemQuery) {
			q.Select(orderitem.FieldID, orderitem.FieldCode)
		}).
		WithProduct(func(q *generated.ProductQuery) {
			q.Select(product.FieldID, product.FieldCode, product.FieldName)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}
	if len(products) == 0 {
		return nil, nil
	}

	out := make([]*model.OrderItemProductDTO, 0, len(products))
	for _, it := range products {
		dto := &model.OrderItemProductDTO{
			ID:                  it.ID,
			ProductCode:         it.ProductCode,
			ProductID:           it.ProductID,
			OrderItemID:         it.OrderItemID,
			OriginalOrderItemID: it.OriginalOrderItemID,
			OrderID:             it.OrderID,
			Quantity:            it.Quantity,
			Note:                it.Note,
			RetailPrice:         it.RetailPrice,
			IsCloneable:         it.IsCloneable,
			TeethPosition:       it.TeethPosition,
		}
		if it.Edges.OrderItem != nil {
			dto.OrderItemCode = it.Edges.OrderItem.Code
		}
		if it.Edges.Product != nil {
			dto.ProductName = it.Edges.Product.Name
			if dto.ProductCode == nil {
				dto.ProductCode = it.Edges.Product.Code
			}
		}
		out = append(out, dto)
	}

	return out, nil
}

func (r *orderRepository) GetAllOrderMaterialsByOrderItemID(ctx context.Context, orderItemID int64) ([]*model.OrderItemMaterialDTO, error) {
	materials, err := r.db.OrderItemMaterial.
		Query().
		Where(
			orderitemmaterial.OrderItemIDEQ(orderItemID),
			orderitemmaterial.HasOrderItemWith(orderitem.DeletedAtIsNil()),
		).
		Select(
			orderitemmaterial.FieldID,
			orderitemmaterial.FieldOrderID,
			orderitemmaterial.FieldOrderItemID,
			orderitemmaterial.FieldMaterialID,
			orderitemmaterial.FieldMaterialCode,
			orderitemmaterial.FieldQuantity,
			orderitemmaterial.FieldRetailPrice,
			orderitemmaterial.FieldType,
			orderitemmaterial.FieldNote,
			orderitemmaterial.FieldIsCloneable,
		).
		WithOrderItem(func(q *generated.OrderItemQuery) {
			q.Select(orderitem.FieldID, orderitem.FieldCode)
		}).
		WithMaterial(func(q *generated.MaterialQuery) {
			q.Select(material.FieldID, material.FieldCode, material.FieldName)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}
	if len(materials) == 0 {
		return nil, nil
	}

	out := make([]*model.OrderItemMaterialDTO, 0, len(materials))
	for _, it := range materials {
		dto := &model.OrderItemMaterialDTO{
			ID:           it.ID,
			MaterialCode: it.MaterialCode,
			MaterialID:   it.MaterialID,
			OrderItemID:  it.OrderItemID,
			OrderID:      it.OrderID,
			Quantity:     it.Quantity,
			Note:         it.Note,
			RetailPrice:  it.RetailPrice,
			Type:         it.Type,
			IsCloneable:  it.IsCloneable,
		}
		if it.Edges.OrderItem != nil {
			dto.OrderItemCode = it.Edges.OrderItem.Code
		}
		if it.Edges.Material != nil {
			dto.MaterialName = it.Edges.Material.Name
			if dto.MaterialCode == nil {
				dto.MaterialCode = it.Edges.Material.Code
			}
		}
		out = append(out, dto)
	}

	return out, nil
}
