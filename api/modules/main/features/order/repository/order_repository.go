package repository

import (
	"context"
	stdsql "database/sql"
	"fmt"
	"math"
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
	GetProductOverview(ctx context.Context, deptID int, productID int) (*model.ProductOverviewDTO, error)
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

func productOverviewScopeLabel(isTemplate bool, variantCount int) string {
	if !isTemplate {
		return "Biến thể hiện tại"
	}
	if variantCount <= 0 {
		return "Template"
	}
	return fmt.Sprintf("Template + %d biến thể", variantCount)
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
