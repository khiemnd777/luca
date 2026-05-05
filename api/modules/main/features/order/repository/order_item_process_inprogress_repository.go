package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/order"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitem"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemprocess"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemprocessdentistreview"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemprocessinprogress"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/predicate"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/section"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/sectionprocess"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type OrderItemProcessInProgressRepository interface {
	PrepareCheckInOrOut(ctx context.Context, tx *generated.Tx, orderItemID int64, orderID *int64) (*model.OrderItemProcessInProgressDTO, error)
	PrepareCheckInOrOutByCode(ctx context.Context, code string) (*model.OrderItemProcessInProgressDTO, error)
	CheckInOrOut(ctx context.Context, userID int, checkInOrOutData *model.OrderItemProcessInProgressDTO) (*model.OrderItemProcessInProgressDTO, *string, *string, *generated.OrderItem, error)
	Assign(ctx context.Context, inprogressID int64, assignedID *int64, assignedName *string, note *string) (*model.OrderItemProcessInProgressDTO, *string, *string, *generated.OrderItem, error)
	CheckIn(ctx context.Context, tx *generated.Tx, orderItemID int64, orderID *int64, note *string) (*model.OrderItemProcessInProgressDTO, error)
	CheckOut(ctx context.Context, tx *generated.Tx, orderItemID int64, note *string) (*model.OrderItemProcessInProgressDTO, error)
	ResolveDentistReview(ctx context.Context, deptID int, reviewID int64, result string, note *string, resolvedBy int) (*model.OrderItemProcessDentistReviewDTO, *model.OrderItemProcessInProgressDTO, *string, *generated.OrderItem, error)
	GetLatest(ctx context.Context, tx *generated.Tx, orderItemID int64) (*model.OrderItemProcessInProgressDTO, error)
	GetCheckoutLatest(ctx context.Context, tx *generated.Tx, orderItemID int64, productID *int) (*model.OrderItemProcessInProgressAndProcessDTO, error)
	GetInProgressesByOrderItemID(ctx context.Context, tx *generated.Tx, orderItemID int64) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)
	GetInProgressesByProcessID(ctx context.Context, tx *generated.Tx, processID int64) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)
	GetInProgressByID(ctx context.Context, tx *generated.Tx, inProgressID int64) (*model.OrderItemProcessInProgressAndProcessDTO, error)
	GetInProgressesByAssignedID(ctx context.Context, tx *generated.Tx, assignedID int64, query table.TableQuery) (table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO], error)
	GetInProgressesByStaffTimeline(ctx context.Context, tx *generated.Tx, staffID int64, from time.Time, to time.Time) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)
	ProcessInfoByProcessID(ctx context.Context, tx *generated.Tx, processID *int64) (*int, *string, *string, *string, error)
}

type orderItemProcessInProgressRepository struct {
	db                   *generated.Client
	orderItemProcessRepo OrderItemProcessRepository
}

func NewOrderItemProcessInProgressRepository(db *generated.Client, orderItemProcessRepo OrderItemProcessRepository) OrderItemProcessInProgressRepository {
	return &orderItemProcessInProgressRepository{db: db, orderItemProcessRepo: orderItemProcessRepo}
}

func (r *orderItemProcessInProgressRepository) GetInProgressesByProcessID(ctx context.Context, tx *generated.Tx, processID int64) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
	items, err := r.inprogressClient(tx).
		Query().
		Where(orderitemprocessinprogress.ProcessID(processID)).
		Order(orderitemprocessinprogress.ByCreatedAt(sql.OrderDesc())).
		Select(
			orderitemprocessinprogress.FieldID,
			orderitemprocessinprogress.FieldCheckInNote,
			orderitemprocessinprogress.FieldCheckOutNote,
			orderitemprocessinprogress.FieldProductID,
			orderitemprocessinprogress.FieldProductCode,
			orderitemprocessinprogress.FieldProductName,
			orderitemprocessinprogress.FieldAssignedID,
			orderitemprocessinprogress.FieldAssignedName,
			orderitemprocessinprogress.FieldStartedAt,
			orderitemprocessinprogress.FieldCompletedAt,
		).
		WithProcess(func(q *generated.OrderItemProcessQuery) {
			q.Select(
				orderitemprocess.FieldID,
				orderitemprocess.FieldProcessName,
				orderitemprocess.FieldSectionName,
				orderitemprocess.FieldColor,
			)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.OrderItemProcessInProgressAndProcessDTO, 0, len(items))
	for _, item := range items {
		proc, err := item.Edges.ProcessOrErr()
		if err != nil {
			return nil, err
		}
		out = append(out, &model.OrderItemProcessInProgressAndProcessDTO{
			ID:           item.ID,
			ProductID:    item.ProductID,
			ProductCode:  item.ProductCode,
			ProductName:  item.ProductName,
			CheckInNote:  item.CheckInNote,
			CheckOutNote: item.CheckOutNote,
			AssignedID:   item.AssignedID,
			AssignedName: item.AssignedName,
			StartedAt:    item.StartedAt,
			CompletedAt:  item.CompletedAt,
			ProcessName:  proc.ProcessName,
			SectionName:  proc.SectionName,
			SectionID:    proc.SectionID,
			Color:        proc.Color,
		})
	}

	return out, nil
}

func (r *orderItemProcessInProgressRepository) GetInProgressesByOrderItemID(ctx context.Context, tx *generated.Tx, orderItemID int64) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
	items, err := r.inprogressClient(tx).
		Query().
		Where(orderitemprocessinprogress.OrderItemID(orderItemID)).
		Order(orderitemprocessinprogress.ByCreatedAt(sql.OrderDesc())).
		Select(
			orderitemprocessinprogress.FieldID,
			orderitemprocessinprogress.FieldOrderID,
			orderitemprocessinprogress.FieldOrderItemID,
			orderitemprocessinprogress.FieldOrderItemCode,
			orderitemprocessinprogress.FieldProductID,
			orderitemprocessinprogress.FieldProductCode,
			orderitemprocessinprogress.FieldProductName,
			orderitemprocessinprogress.FieldCheckInNote,
			orderitemprocessinprogress.FieldCheckOutNote,
			orderitemprocessinprogress.FieldAssignedID,
			orderitemprocessinprogress.FieldAssignedName,
			orderitemprocessinprogress.FieldStartedAt,
			orderitemprocessinprogress.FieldCompletedAt,
		).
		WithProcess(func(q *generated.OrderItemProcessQuery) {
			q.Select(
				orderitemprocess.FieldID,
				orderitemprocess.FieldProcessName,
				orderitemprocess.FieldSectionName,
				orderitemprocess.FieldColor,
			)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.OrderItemProcessInProgressAndProcessDTO, 0, len(items))
	for _, item := range items {
		proc, err := item.Edges.ProcessOrErr()
		if err != nil {
			return nil, err
		}
		out = append(out, &model.OrderItemProcessInProgressAndProcessDTO{
			ID:            item.ID,
			OrderID:       item.OrderID,
			OrderItemID:   item.OrderItemID,
			OrderItemCode: item.OrderItemCode,
			ProductID:     item.ProductID,
			ProductCode:   item.ProductCode,
			ProductName:   item.ProductName,
			CheckInNote:   item.CheckInNote,
			CheckOutNote:  item.CheckOutNote,
			AssignedID:    item.AssignedID,
			AssignedName:  item.AssignedName,
			StartedAt:     item.StartedAt,
			CompletedAt:   item.CompletedAt,
			ProcessName:   proc.ProcessName,
			SectionName:   proc.SectionName,
			SectionID:     proc.SectionID,
			Color:         proc.Color,
		})
	}

	return out, nil
}

func (r *orderItemProcessInProgressRepository) GetInProgressByID(ctx context.Context, tx *generated.Tx, inProgressID int64) (*model.OrderItemProcessInProgressAndProcessDTO, error) {
	entity, err := r.inprogressClient(tx).
		Query().
		Where(orderitemprocessinprogress.ID(inProgressID)).
		WithProcess(func(q *generated.OrderItemProcessQuery) {
			q.Select(
				orderitemprocess.FieldID,
				orderitemprocess.FieldProcessName,
				orderitemprocess.FieldSectionName,
				orderitemprocess.FieldColor,
			)
		}).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	proc, err := entity.Edges.ProcessOrErr()
	if err != nil {
		return nil, err
	}

	return &model.OrderItemProcessInProgressAndProcessDTO{
		ID:           entity.ID,
		ProductID:    entity.ProductID,
		ProductCode:  entity.ProductCode,
		ProductName:  entity.ProductName,
		CheckInNote:  entity.CheckInNote,
		CheckOutNote: entity.CheckOutNote,
		AssignedID:   entity.AssignedID,
		AssignedName: entity.AssignedName,
		StartedAt:    entity.StartedAt,
		CompletedAt:  entity.CompletedAt,
		ProcessName:  proc.ProcessName,
		SectionName:  proc.SectionName,
		SectionID:    proc.SectionID,
		Color:        proc.Color,
	}, nil
}

func (r *orderItemProcessInProgressRepository) PrepareCheckInOrOutByCode(ctx context.Context, code string) (*model.OrderItemProcessInProgressDTO, error) {
	if code == "" {
		return nil, fmt.Errorf("code is required")
	}

	var err error
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

	orderItemEntity, err := tx.OrderItem.
		Query().
		Where(
			orderitem.CodeEQ(code),
			orderitem.DeletedAtIsNil(),
			orderitem.HasOrderWith(order.DeletedAtIsNil()),
		).
		Select(
			orderitem.FieldID,
			orderitem.FieldOrderID,
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	orderItemID := orderItemEntity.ID
	orderID := orderItemEntity.OrderID

	return r.PrepareCheckInOrOut(ctx, tx, orderItemID, &orderID)
}

func (r *orderItemProcessInProgressRepository) PrepareCheckInOrOut(ctx context.Context, tx *generated.Tx, orderItemID int64, orderID *int64) (*model.OrderItemProcessInProgressDTO, error) {
	var err error
	if tx == nil {
		tx, err = r.db.Tx(ctx)
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
	}

	targets, err := r.prepareTargets(ctx, tx, orderItemID, orderID)
	if err != nil {
		return nil, err
	}
	if len(targets) == 0 {
		return nil, fmt.Errorf("no processes found for order item %d", orderItemID)
	}

	selected := r.selectPrepareTarget(targets)
	selected.AvailableTargets = targets
	return selected, nil
}

func (r *orderItemProcessInProgressRepository) prepareTargets(
	ctx context.Context,
	tx *generated.Tx,
	orderItemID int64,
	orderID *int64,
) ([]*model.OrderItemProcessInProgressTargetDTO, error) {
	processes, err := r.getProcesses(ctx, tx, orderItemID, nil)
	if err != nil {
		return nil, err
	}
	if len(processes) == 0 {
		return []*model.OrderItemProcessInProgressTargetDTO{}, nil
	}

	orderItemEntity, err := tx.OrderItem.
		Query().
		Where(orderitem.IDEQ(orderItemID)).
		Select(orderitem.FieldCode).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	grouped := r.groupProcesses(processes)
	targets := make([]*model.OrderItemProcessInProgressTargetDTO, 0, len(grouped))

	for _, group := range grouped {
		if len(group) == 0 {
			continue
		}

		productID := group[0].ProductID
		latest, latestErr := r.latestEntity(ctx, tx, orderItemID, productID)
		if latestErr != nil && !generated.IsNotFound(latestErr) {
			return nil, latestErr
		}

		review, reviewErr := r.reviewForPrepare(ctx, tx, orderItemID, productID, latest)
		if reviewErr != nil {
			return nil, reviewErr
		}

		target, buildErr := r.buildPrepareTarget(group, latest, review, orderID, orderItemEntity.Code)
		if buildErr != nil {
			return nil, buildErr
		}
		targets = append(targets, target)
	}

	return targets, nil
}

func (r *orderItemProcessInProgressRepository) buildPrepareTarget(
	processes []*generated.OrderItemProcess,
	latest *generated.OrderItemProcessInProgress,
	review *generated.OrderItemProcessDentistReview,
	orderID *int64,
	orderItemCode *string,
) (*model.OrderItemProcessInProgressTargetDTO, error) {
	if len(processes) == 0 {
		return nil, fmt.Errorf("processes are required")
	}

	if review != nil && review.Status == "pending" {
		currentProcessID := processes[0].ID
		if review.ProcessID != nil {
			currentProcessID = *review.ProcessID
		} else if latest != nil && latest.ProcessID != nil {
			currentProcessID = *latest.ProcessID
		}
		targetProcess := r.findProcess(processes, currentProcessID)
		if targetProcess == nil {
			return nil, fmt.Errorf("process %d not found for pending dentist review", currentProcessID)
		}
		target := &model.OrderItemProcessInProgressTargetDTO{
			ProcessID:                 &currentProcessID,
			NextProcessID:             r.nextProcessID(processes, currentProcessID),
			OrderItemID:               targetProcess.OrderItemID,
			OrderID:                   r.pickOrderID(orderID, targetProcess),
			OrderItemCode:             orderItemCode,
			ProductID:                 targetProcess.ProductID,
			ProductCode:               targetProcess.ProductCode,
			ProductName:               targetProcess.ProductName,
			ProcessName:               targetProcess.ProcessName,
			AssignedID:                targetProcess.AssignedID,
			AssignedName:              targetProcess.AssignedName,
			SectionName:               targetProcess.SectionName,
			SectionID:                 targetProcess.SectionID,
			Mode:                      "dentist_review",
			DentistReviewID:           &review.ID,
			DentistReviewStatus:       &review.Status,
			DentistReviewRequestNote:  &review.RequestNote,
			DentistReviewResponseNote: review.ResponseNote,
		}
		if review.InProgressID != nil {
			target.ID = *review.InProgressID
		}
		if latest != nil {
			target.ID = latest.ID
			target.PrevProcessID = latest.PrevProcessID
			target.CheckInNote = latest.CheckInNote
			target.CheckOutNote = latest.CheckOutNote
			target.StartedAt = latest.StartedAt
			target.CompletedAt = latest.CompletedAt
		}
		return target, nil
	}

	// Checkout target for the product currently in progress.
	if latest != nil && latest.CompletedAt == nil {
		currentProcessID := processes[0].ID
		if latest.ProcessID != nil {
			currentProcessID = *latest.ProcessID
		}
		targetProcess := r.findProcess(processes, currentProcessID)
		if targetProcess == nil {
			return nil, fmt.Errorf("process %d not found for order item %d", currentProcessID, latest.OrderItemID)
		}

		return &model.OrderItemProcessInProgressTargetDTO{
			ID:            latest.ID,
			ProcessID:     &currentProcessID,
			PrevProcessID: latest.PrevProcessID,
			NextProcessID: r.nextProcessID(processes, currentProcessID),
			OrderItemID:   latest.OrderItemID,
			OrderID:       r.pickOrderID(latest.OrderID, targetProcess),
			OrderItemCode: orderItemCode,
			ProductID:     targetProcess.ProductID,
			ProductCode:   targetProcess.ProductCode,
			ProductName:   targetProcess.ProductName,
			ProcessName:   targetProcess.ProcessName,
			AssignedID:    targetProcess.AssignedID,
			AssignedName:  targetProcess.AssignedName,
			SectionName:   targetProcess.SectionName,
			SectionID:     targetProcess.SectionID,
			CheckInNote:   latest.CheckInNote,
			CheckOutNote:  latest.CheckOutNote,
			StartedAt:     latest.StartedAt,
			CompletedAt:   latest.CompletedAt,
			Mode:          "check_out",
		}, nil
	}

	targetProcessID := processes[0].ID
	var prevProcessID *int64

	if latest != nil {
		switch {
		case review != nil && review.Status == "rejected" && latest.ProcessID != nil:
			targetProcessID = *latest.ProcessID
			prevProcessID = latest.PrevProcessID
		case latest.NextProcessID != nil:
			targetProcessID = *latest.NextProcessID
			prevProcessID = latest.ProcessID
		case latest.ProcessID != nil:
			targetProcessID = *latest.ProcessID
			prevProcessID = latest.PrevProcessID
		}
	}

	targetProcess := r.findProcess(processes, targetProcessID)
	if targetProcess == nil {
		return nil, fmt.Errorf("process %d not found for order item %d", targetProcessID, processes[0].OrderItemID)
	}

	return &model.OrderItemProcessInProgressTargetDTO{
		ProcessID:     &targetProcessID,
		PrevProcessID: prevProcessID,
		OrderItemID:   targetProcess.OrderItemID,
		OrderID:       r.pickOrderID(orderID, targetProcess),
		OrderItemCode: orderItemCode,
		ProductID:     targetProcess.ProductID,
		ProductCode:   targetProcess.ProductCode,
		ProductName:   targetProcess.ProductName,
		ProcessName:   targetProcess.ProcessName,
		AssignedID:    targetProcess.AssignedID,
		AssignedName:  targetProcess.AssignedName,
		SectionName:   targetProcess.SectionName,
		SectionID:     targetProcess.SectionID,
		Mode:          "check_in",
	}, nil
}

func (r *orderItemProcessInProgressRepository) selectPrepareTarget(
	targets []*model.OrderItemProcessInProgressTargetDTO,
) *model.OrderItemProcessInProgressDTO {
	selected := targets[0]
	for _, target := range targets {
		if target != nil && target.Mode == "check_out" {
			selected = target
			break
		}
	}

	return &model.OrderItemProcessInProgressDTO{
		ID:            selected.ID,
		ProcessID:     selected.ProcessID,
		ProcessName:   selected.ProcessName,
		PrevProcessID: selected.PrevProcessID,
		NextProcessID: selected.NextProcessID,
		OrderItemID:   selected.OrderItemID,
		OrderID:       selected.OrderID,
		OrderItemCode: selected.OrderItemCode,
		ProductID:     selected.ProductID,
		ProductCode:   selected.ProductCode,
		ProductName:   selected.ProductName,
		AssignedID:    selected.AssignedID,
		AssignedName:  selected.AssignedName,
		CheckInNote:   selected.CheckInNote,
		CheckOutNote:  selected.CheckOutNote,
		StartedAt:     selected.StartedAt,
		CompletedAt:   selected.CompletedAt,
		SectionName:   selected.SectionName,
		SectionID:     selected.SectionID,
		Mode:          selected.Mode,

		DentistReviewID:           selected.DentistReviewID,
		DentistReviewStatus:       selected.DentistReviewStatus,
		DentistReviewRequestNote:  selected.DentistReviewRequestNote,
		DentistReviewResponseNote: selected.DentistReviewResponseNote,
	}
}

func (r *orderItemProcessInProgressRepository) Assign(
	ctx context.Context,
	inprogressID int64,
	assignedID *int64,
	assignedName *string,
	note *string,
) (*model.OrderItemProcessInProgressDTO, *string, *string, *generated.OrderItem, error) {

	var err error
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	now := time.Now()

	// Load current inprogress
	current, err := r.inprogressClient(tx).
		Query().
		Where(orderitemprocessinprogress.ID(inprogressID)).
		Only(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	if current.ProcessID == nil {
		return nil, nil, nil, nil, fmt.Errorf("process id is required for inprogress %d", inprogressID)
	}

	// Resolve process status
	proc, err := r.processClient(tx).
		Query().
		Where(orderitemprocess.IDEQ(*current.ProcessID)).
		Select(
			orderitemprocess.FieldCustomFields,
			orderitemprocess.FieldStatus,
		).
		Only(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	status := proc.Status
	if v, ok := proc.CustomFields["status"]; ok {
		if s, ok := v.(string); ok && s != "" {
			status = s
		}
	}
	if status == "" {
		status = "in_progress"
	}

	// Update when same assigned
	if sameAssigned(current.AssignedID, assignedID) {
		updated, err := r.inprogressClient(tx).
			UpdateOneID(current.ID).
			SetNillableAssignedName(assignedName).
			SetNillableCheckInNote(note).
			Save(ctx)
		if err != nil {
			return nil, nil, nil, nil, err
		}

		dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](updated)
		return dto, &status, nil, nil, nil
	}

	// Close current
	// Then, assign it to the other one
	checkoutNote := fmt.Sprintf("➡ Đã giao cho kỹ thuật viên %s", utils.SafeString(assignedName))

	if _, err := r.inprogressClient(tx).
		UpdateOneID(current.ID).
		// SetCompletedAt(now).
		SetCheckOutNote(checkoutNote).
		Save(ctx); err != nil {
		return nil, nil, nil, nil, err
	}

	// Create new inprogress
	entity, err := r.inprogressClient(tx).
		Create().
		SetNillableProcessID(current.ProcessID).
		SetNillablePrevProcessID(current.PrevProcessID).
		SetNillableNextProcessID(current.NextProcessID).
		SetOrderItemID(current.OrderItemID).
		SetNillableOrderID(current.OrderID).
		SetNillableOrderItemCode(current.OrderItemCode).
		SetNillableProductID(current.ProductID).
		SetNillableProductCode(current.ProductCode).
		SetNillableProductName(current.ProductName).
		SetNillableAssignedID(assignedID).
		SetNillableAssignedName(assignedName).
		SetNillableSectionName(current.SectionName).
		SetNillableCheckInNote(note).
		SetStartedAt(now).
		Save(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// Sync process status
	if err := r.updateProcessStatusAndAssign(
		ctx,
		tx,
		*current.ProcessID,
		status,
		assignedID,
		assignedName,
	); err != nil {
		return nil, nil, nil, nil, err
	}

	// sync status back to order and order item
	orderstatus, orderitem, err := r.syncOrderAndItemStatus(ctx, tx, current.OrderItemID, current.OrderID, nil)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)
	return dto, &status, orderstatus, orderitem, nil
}

func (r *orderItemProcessInProgressRepository) CheckInOrOut(
	ctx context.Context,
	userID int,
	checkInOrOutData *model.OrderItemProcessInProgressDTO,
) (
	*model.OrderItemProcessInProgressDTO,
	*string,
	*string,
	*generated.OrderItem,
	error,
) {
	if checkInOrOutData == nil {
		return nil, nil, nil, nil, fmt.Errorf("checkInOrOutData is required")
	}

	var err error
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	// ---	Checkout
	if checkInOrOutData.ID > 0 {
		if checkInOrOutData.ProcessID == nil {
			err = fmt.Errorf("process id is required for checkout of order item process %d", checkInOrOutData.ID)
			return nil, nil, nil, nil, err
		}

		requiresDentistReview := checkInOrOutData.RequiresDentistReview
		nextProcessID := checkInOrOutData.NextProcessID

		leaderID, leaderName, sectionName, processName, err := r.ProcessInfoByProcessID(ctx, tx, nextProcessID)
		if err != nil {
			return nil, nil, nil, nil, err
		}

		completedAt := time.Now()
		entity, err := r.inprogressClient(tx).
			UpdateOneID(checkInOrOutData.ID).
			SetProcessID(*checkInOrOutData.ProcessID).
			SetNillableNextProcessID(nextProcessID).
			SetNillableNextProcessName(processName).
			SetNillableNextSectionName(sectionName).
			SetNillableNextLeaderID(leaderID).
			SetNillableNextLeaderName(leaderName).
			SetNillableOrderID(checkInOrOutData.OrderID).
			SetNillableOrderItemCode(checkInOrOutData.OrderItemCode).
			SetNillableProductID(checkInOrOutData.ProductID).
			SetNillableProductCode(checkInOrOutData.ProductCode).
			SetNillableProductName(checkInOrOutData.ProductName).
			SetNillableCheckOutNote(checkInOrOutData.CheckOutNote).
			SetCompletedAt(completedAt).
			Save(ctx)
		if err != nil {
			return nil, nil, nil, nil, err
		}

		processStatus := "completed"
		if requiresDentistReview {
			processStatus = "waiting_dentist_review"
			var requestedBy *int
			if userID > 0 {
				requestedBy = &userID
			}
			review, reviewErr := r.createDentistReview(ctx, tx, entity, checkInOrOutData.ProcessName, checkInOrOutData.DentistReviewRequestNote, requestedBy)
			if reviewErr != nil {
				return nil, nil, nil, nil, reviewErr
			}
			checkInOrOutData.DentistReviewID = &review.ID
			checkInOrOutData.DentistReviewStatus = &review.Status
		}

		if err := r.updateProcessStatus(ctx, tx, *checkInOrOutData.ProcessID, processStatus); err != nil {
			return nil, nil, nil, nil, err
		}

		// sync status back to order and order item
		orderstatus, ordercreatedat, err := r.syncOrderAndItemStatus(ctx, tx, checkInOrOutData.OrderItemID, checkInOrOutData.OrderID, &completedAt)
		if err != nil {
			return nil, nil, nil, nil, err
		}

		// sync process to order
		if err := r.syncOrderProcessLatest(ctx, tx, *checkInOrOutData.ProcessID, checkInOrOutData.OrderItemID, checkInOrOutData.OrderID); err != nil {
			return nil, nil, nil, nil, err
		}

		dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)
		dto.RequiresDentistReview = requiresDentistReview
		dto.DentistReviewID = checkInOrOutData.DentistReviewID
		dto.DentistReviewStatus = checkInOrOutData.DentistReviewStatus

		// Get current section and process's name
		_, _, sectionName, processName, err = r.ProcessInfoByProcessID(ctx, tx, checkInOrOutData.ProcessID)
		if err == nil {
			dto.SectionName = sectionName
			dto.ProcessName = processName
		}
		return dto, &processStatus, orderstatus, ordercreatedat, nil
	}

	if checkInOrOutData.ProcessID == nil {
		err = fmt.Errorf("process id is required for checkin of order item %d", checkInOrOutData.OrderItemID)
		return nil, nil, nil, nil, err
	}

	proc, err := r.processClient(tx).
		Query().
		Where(orderitemprocess.IDEQ(*checkInOrOutData.ProcessID)).
		Select(
			orderitemprocess.FieldProcessName,
			orderitemprocess.FieldSectionName,
			orderitemprocess.FieldSectionID,
			orderitemprocess.FieldProductID,
			orderitemprocess.FieldProductCode,
			orderitemprocess.FieldProductName,
		).
		Only(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	checkInOrOutData.SectionName = proc.SectionName
	checkInOrOutData.SectionID = proc.SectionID
	checkInOrOutData.ProductID = proc.ProductID
	checkInOrOutData.ProductCode = proc.ProductCode
	checkInOrOutData.ProductName = proc.ProductName
	checkInOrOutData.ProcessName = proc.ProcessName

	// ---	Checkin
	startedAt := time.Now()
	entity, err := r.inprogressClient(tx).
		Create().
		SetNillableProcessID(checkInOrOutData.ProcessID).
		SetNillablePrevProcessID(checkInOrOutData.PrevProcessID).
		SetOrderItemID(checkInOrOutData.OrderItemID).
		SetNillableOrderID(checkInOrOutData.OrderID).
		SetNillableOrderItemCode(checkInOrOutData.OrderItemCode).
		SetNillableProductID(checkInOrOutData.ProductID).
		SetNillableProductCode(checkInOrOutData.ProductCode).
		SetNillableProductName(checkInOrOutData.ProductName).
		SetNillableAssignedID(checkInOrOutData.AssignedID).
		SetNillableAssignedName(checkInOrOutData.AssignedName).
		SetNillableSectionName(checkInOrOutData.SectionName).
		SetNillableSectionID(checkInOrOutData.SectionID).
		SetNillableCheckInNote(checkInOrOutData.CheckInNote).
		SetStartedAt(startedAt).
		Save(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// process's status
	rework, err := r.hasCompletedProcess(ctx, tx, *checkInOrOutData.ProcessID)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	status := "in_progress"
	if rework {
		status = "rework"
	}
	if err := r.updateProcessStatusAndAssign(
		ctx,
		tx,
		*checkInOrOutData.ProcessID,
		status,
		checkInOrOutData.AssignedID,
		checkInOrOutData.AssignedName,
	); err != nil {
		return nil, nil, nil, nil, err
	}

	// sync status back to order and order item
	orderstatus, orderitem, err := r.syncOrderAndItemStatus(ctx, tx, checkInOrOutData.OrderItemID, checkInOrOutData.OrderID, nil)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// sync process to order
	if err := r.syncOrderProcessLatest(ctx, tx, *checkInOrOutData.ProcessID, checkInOrOutData.OrderItemID, checkInOrOutData.OrderID); err != nil {
		return nil, nil, nil, nil, err
	}

	dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)

	// Get current section and process's name
	_, _, sectionName, processName, err := r.ProcessInfoByProcessID(ctx, tx, checkInOrOutData.ProcessID)
	if err == nil {
		dto.SectionName = sectionName
		dto.ProcessName = processName
	}
	return dto, &status, orderstatus, orderitem, nil
}

func (r *orderItemProcessInProgressRepository) CheckIn(ctx context.Context, tx *generated.Tx, orderItemID int64, orderID *int64, note *string) (*model.OrderItemProcessInProgressDTO, error) {
	prepared, err := r.PrepareCheckInOrOut(ctx, tx, orderItemID, orderID)
	if err != nil {
		return nil, err
	}
	prepared.CheckInNote = note
	_, _, _, _, err = r.CheckInOrOut(ctx, 0, prepared)
	if err != nil {
		return nil, err
	}
	return prepared, nil
}

func (r *orderItemProcessInProgressRepository) CheckOut(ctx context.Context, tx *generated.Tx, orderItemID int64, note *string) (*model.OrderItemProcessInProgressDTO, error) {
	prepared, err := r.PrepareCheckInOrOut(ctx, tx, orderItemID, nil)
	if err != nil {
		return nil, err
	}
	prepared.CheckOutNote = note
	if prepared.ID == 0 {
		return nil, fmt.Errorf("no checkout target found for order item %d", orderItemID)
	}
	_, _, _, _, err = r.CheckInOrOut(ctx, 0, prepared)
	if err != nil {
		return nil, err
	}
	return prepared, nil
}

func (r *orderItemProcessInProgressRepository) GetLatest(ctx context.Context, tx *generated.Tx, orderItemID int64) (*model.OrderItemProcessInProgressDTO, error) {
	entity, err := r.latestEntity(ctx, tx, orderItemID, nil)
	if err != nil {
		return nil, err
	}
	dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)
	return dto, nil
}

func (r *orderItemProcessInProgressRepository) ResolveDentistReview(
	ctx context.Context,
	deptID int,
	reviewID int64,
	result string,
	note *string,
	resolvedBy int,
) (*model.OrderItemProcessDentistReviewDTO, *model.OrderItemProcessInProgressDTO, *string, *generated.OrderItem, error) {
	result = strings.TrimSpace(result)
	if result != "approved" && result != "rejected" {
		return nil, nil, nil, nil, fmt.Errorf("invalid dentist review result")
	}

	var err error
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	review, err := tx.OrderItemProcessDentistReview.
		Query().
		Where(
			orderitemprocessdentistreview.ID(reviewID),
			orderitemprocessdentistreview.HasOrderItemWith(
				orderitem.HasOrderWith(order.DepartmentIDEQ(deptID)),
			),
		).
		Only(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	if review.Status != "pending" {
		return nil, nil, nil, nil, fmt.Errorf("dentist review %d is already %s", reviewID, review.Status)
	}
	if review.ProcessID == nil {
		return nil, nil, nil, nil, fmt.Errorf("process id is required for dentist review %d", reviewID)
	}

	now := time.Now()
	reviewStatus := result
	review, err = tx.OrderItemProcessDentistReview.
		UpdateOneID(review.ID).
		SetStatus(reviewStatus).
		SetNillableResponseNote(note).
		SetResolvedBy(resolvedBy).
		SetResolvedAt(now).
		Save(ctx)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	processStatus := "completed"
	completedAt := &now
	if result == "rejected" {
		processStatus = "rework"
		completedAt = nil
	}
	if err := r.updateProcessStatus(ctx, tx, *review.ProcessID, processStatus); err != nil {
		return nil, nil, nil, nil, err
	}

	orderStatus, orderItem, err := r.syncOrderAndItemStatus(ctx, tx, review.OrderItemID, review.OrderID, completedAt)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	if err := r.syncOrderProcessLatest(ctx, tx, *review.ProcessID, review.OrderItemID, review.OrderID); err != nil {
		return nil, nil, nil, nil, err
	}

	var inprogressDTO *model.OrderItemProcessInProgressDTO
	if review.InProgressID != nil {
		inprogress, latestErr := tx.OrderItemProcessInProgress.Get(ctx, *review.InProgressID)
		if latestErr != nil {
			return nil, nil, nil, nil, latestErr
		}
		inprogressDTO = mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](inprogress)
	}

	return mapDentistReview(review), inprogressDTO, orderStatus, orderItem, nil
}

func (r *orderItemProcessInProgressRepository) GetCheckoutLatest(ctx context.Context, tx *generated.Tx, orderItemID int64, productID *int) (*model.OrderItemProcessInProgressAndProcessDTO, error) {
	predicates := []predicate.OrderItemProcessInProgress{
		orderitemprocessinprogress.OrderItemID(orderItemID),
		orderitemprocessinprogress.CompletedAtNotNil(),
	}
	if productID != nil {
		predicates = append(predicates, orderitemprocessinprogress.ProductIDEQ(*productID))
	}

	entity, err := r.inprogressClient(tx).
		Query().
		Where(predicates...).
		Order(orderitemprocessinprogress.ByCreatedAt(sql.OrderDesc())).
		Select(
			orderitemprocessinprogress.FieldID,
			orderitemprocessinprogress.FieldOrderID,
			orderitemprocessinprogress.FieldOrderItemID,
			orderitemprocessinprogress.FieldOrderItemCode,
			orderitemprocessinprogress.FieldProductID,
			orderitemprocessinprogress.FieldProductCode,
			orderitemprocessinprogress.FieldProductName,
			orderitemprocessinprogress.FieldCheckInNote,
			orderitemprocessinprogress.FieldCheckOutNote,
			orderitemprocessinprogress.FieldAssignedID,
			orderitemprocessinprogress.FieldAssignedName,
			orderitemprocessinprogress.FieldStartedAt,
			orderitemprocessinprogress.FieldCompletedAt,
		).
		WithProcess(func(q *generated.OrderItemProcessQuery) {
			q.Select(
				orderitemprocess.FieldID,
				orderitemprocess.FieldProcessName,
				orderitemprocess.FieldSectionName,
				orderitemprocess.FieldColor,
			)
		}).
		First(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}

	proc := entity.Edges.Process
	if proc == nil {
		return nil, fmt.Errorf("process edge is missing for in_progress id=%d", entity.ID)
	}

	return &model.OrderItemProcessInProgressAndProcessDTO{
		ID:            entity.ID,
		OrderID:       entity.OrderID,
		OrderItemID:   entity.OrderItemID,
		OrderItemCode: entity.OrderItemCode,
		ProductID:     entity.ProductID,
		ProductCode:   entity.ProductCode,
		ProductName:   entity.ProductName,
		CheckInNote:   entity.CheckInNote,
		CheckOutNote:  entity.CheckOutNote,
		AssignedID:    entity.AssignedID,
		AssignedName:  entity.AssignedName,
		StartedAt:     entity.StartedAt,
		CompletedAt:   entity.CompletedAt,
		ProcessName:   proc.ProcessName,
		SectionName:   proc.SectionName,
		SectionID:     proc.SectionID,
		Color:         proc.Color,
	}, nil
}

func (r *orderItemProcessInProgressRepository) latestEntity(ctx context.Context, tx *generated.Tx, orderItemID int64, productID *int) (*generated.OrderItemProcessInProgress, error) {
	predicates := []predicate.OrderItemProcessInProgress{
		orderitemprocessinprogress.OrderItemID(orderItemID),
	}
	if productID != nil {
		predicates = append(predicates, orderitemprocessinprogress.ProductIDEQ(*productID))
	}

	q := r.inprogressClient(tx).
		Query().
		Where(predicates...).
		Order(orderitemprocessinprogress.ByCreatedAt(sql.OrderDesc()))

	entity, err := q.First(ctx)
	if err != nil {
		return nil, err
	}
	return entity, nil
}

func (r *orderItemProcessInProgressRepository) reviewForPrepare(
	ctx context.Context,
	tx *generated.Tx,
	orderItemID int64,
	productID *int,
	latest *generated.OrderItemProcessInProgress,
) (*generated.OrderItemProcessDentistReview, error) {
	pendingPredicates := []predicate.OrderItemProcessDentistReview{
		orderitemprocessdentistreview.OrderItemID(orderItemID),
		orderitemprocessdentistreview.StatusEQ("pending"),
	}
	if productID != nil {
		pendingPredicates = append(pendingPredicates, orderitemprocessdentistreview.ProductIDEQ(*productID))
	}
	review, err := r.dentistReviewClient(tx).
		Query().
		Where(pendingPredicates...).
		Order(orderitemprocessdentistreview.ByCreatedAt(sql.OrderDesc())).
		First(ctx)
	if err == nil {
		return review, nil
	}
	if !generated.IsNotFound(err) {
		return nil, err
	}
	if latest == nil || latest.CompletedAt == nil {
		return nil, nil
	}

	rejectedPredicates := []predicate.OrderItemProcessDentistReview{
		orderitemprocessdentistreview.StatusEQ("rejected"),
	}
	if latest.ID > 0 {
		rejectedPredicates = append(rejectedPredicates, orderitemprocessdentistreview.InProgressIDEQ(latest.ID))
	} else {
		return nil, nil
	}

	review, err = r.dentistReviewClient(tx).
		Query().
		Where(rejectedPredicates...).
		Order(orderitemprocessdentistreview.ByUpdatedAt(sql.OrderDesc())).
		First(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return review, nil
}

func (r *orderItemProcessInProgressRepository) createDentistReview(
	ctx context.Context,
	tx *generated.Tx,
	inprogress *generated.OrderItemProcessInProgress,
	processName *string,
	note *string,
	requestedBy *int,
) (*generated.OrderItemProcessDentistReview, error) {
	if inprogress == nil {
		return nil, fmt.Errorf("in-progress checkpoint is required")
	}
	requestNote := strings.TrimSpace(utils.SafeString(note))
	if requestNote == "" {
		return nil, fmt.Errorf("dentist review request note is required")
	}

	existing, err := r.dentistReviewClient(tx).
		Query().
		Where(
			orderitemprocessdentistreview.InProgressID(inprogress.ID),
			orderitemprocessdentistreview.StatusEQ("pending"),
		).
		Only(ctx)
	if err == nil {
		return existing, nil
	}
	if !generated.IsNotFound(err) {
		return nil, err
	}

	return r.dentistReviewClient(tx).
		Create().
		SetNillableOrderID(inprogress.OrderID).
		SetOrderItemID(inprogress.OrderItemID).
		SetNillableOrderItemCode(inprogress.OrderItemCode).
		SetNillableProductID(inprogress.ProductID).
		SetNillableProductCode(inprogress.ProductCode).
		SetNillableProductName(inprogress.ProductName).
		SetNillableProcessID(inprogress.ProcessID).
		SetNillableProcessName(processName).
		SetInProgressID(inprogress.ID).
		SetRequestNote(requestNote).
		SetNillableRequestedBy(requestedBy).
		Save(ctx)
}

func (r *orderItemProcessInProgressRepository) getProcesses(ctx context.Context, tx *generated.Tx, orderItemID int64, productID *int) ([]*generated.OrderItemProcess, error) {
	predicates := []predicate.OrderItemProcess{
		orderitemprocess.OrderItemID(orderItemID),
	}
	if productID != nil {
		predicates = append(predicates, orderitemprocess.ProductIDEQ(*productID))
	}

	q := r.processClient(tx).
		Query().
		Where(predicates...).
		Order(
			orderitemprocess.ByProductName(sql.OrderAsc()),
			orderitemprocess.ByStepNumber(sql.OrderAsc()),
		)
	return q.All(ctx)
}

func (r *orderItemProcessInProgressRepository) groupProcesses(
	processes []*generated.OrderItemProcess,
) [][]*generated.OrderItemProcess {
	groups := make([][]*generated.OrderItemProcess, 0)
	indexByKey := map[string]int{}

	for _, process := range processes {
		if process == nil {
			continue
		}

		key := "legacy"
		if process.ProductID != nil {
			key = fmt.Sprintf("product:%d", *process.ProductID)
		}

		groupIdx, ok := indexByKey[key]
		if !ok {
			groupIdx = len(groups)
			indexByKey[key] = groupIdx
			groups = append(groups, []*generated.OrderItemProcess{})
		}

		groups[groupIdx] = append(groups[groupIdx], process)
	}

	return groups
}

func (r *orderItemProcessInProgressRepository) nextProcessID(processes []*generated.OrderItemProcess, currentID int64) *int64 {
	for i, p := range processes {
		if p.ID == currentID && i+1 < len(processes) {
			nextID := processes[i+1].ID
			return &nextID
		}
	}
	return nil
}

func (r *orderItemProcessInProgressRepository) findProcess(processes []*generated.OrderItemProcess, processID int64) *generated.OrderItemProcess {
	for _, p := range processes {
		if p.ID == processID {
			return p
		}
	}
	return nil
}

func (r *orderItemProcessInProgressRepository) pickOrderID(orderID *int64, proc *generated.OrderItemProcess) *int64 {
	if orderID != nil {
		return orderID
	}
	return proc.OrderID
}

func (r *orderItemProcessInProgressRepository) hasCompletedProcess(ctx context.Context, tx *generated.Tx, processID int64) (bool, error) {
	return r.inprogressClient(tx).
		Query().
		Where(
			orderitemprocessinprogress.ProcessID(processID),
			orderitemprocessinprogress.CompletedAtNotNil(),
		).
		Exist(ctx)
}

func (r *orderItemProcessInProgressRepository) updateProcessStatus(
	ctx context.Context,
	tx *generated.Tx,
	processID int64,
	status string,
) error {
	if r.orderItemProcessRepo == nil {
		return fmt.Errorf("order item process repository is required")
	}

	_, err := r.orderItemProcessRepo.UpdateStatus(
		ctx,
		tx,
		processID,
		status,
	)
	return err
}

func (r *orderItemProcessInProgressRepository) updateProcessStatusAndAssign(
	ctx context.Context,
	tx *generated.Tx,
	processID int64,
	status string,
	assignedID *int64,
	assignedName *string,
) error {
	if r.orderItemProcessRepo == nil {
		return fmt.Errorf("order item process repository is required")
	}

	_, err := r.orderItemProcessRepo.UpdateStatusAndAssign(
		ctx,
		tx,
		processID,
		status,
		assignedID,
		assignedName,
	)
	return err
}

func (r *orderItemProcessInProgressRepository) syncOrderAndItemStatus(
	ctx context.Context,
	tx *generated.Tx,
	orderItemID int64,
	orderID *int64,
	completedAt *time.Time,
) (*string, *generated.OrderItem, error) {
	processes, err := r.processClient(tx).
		Query().
		Where(orderitemprocess.OrderItemID(orderItemID)).
		Select(orderitemprocess.FieldCustomFields).
		All(ctx)
	if err != nil {
		return nil, nil, err
	}
	if len(processes) == 0 {
		return nil, nil, fmt.Errorf("no processes found for order item %d", orderItemID)
	}

	allWaiting := true
	allCompleted := true
	anyInProgress := false

	for _, p := range processes {
		status := utils.SafeGetString(p.CustomFields, "status")
		if status != "waiting" {
			allWaiting = false
		}
		if status != "completed" {
			allCompleted = false
		}
		switch status {
		case "in_progress", "qc", "rework", "waiting_dentist_review":
			anyInProgress = true
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

	orderItem, err := tx.OrderItem.
		Query().
		Where(orderitem.IDEQ(orderItemID)).
		Select(
			orderitem.FieldCreatedAt,
			orderitem.FieldCustomFields,
			orderitem.FieldOrderID,
			orderitem.FieldRemakeCount,
		).
		Only(ctx)
	if err != nil {
		return nil, nil, err
	}

	cf := utils.CloneOrInit(orderItem.CustomFields)
	cf["status"] = orderStatus

	qoi := tx.OrderItem.
		UpdateOneID(orderItemID).
		SetCustomFields(cf).
		SetStatus(orderStatus)

	if orderStatus == "completed" && completedAt != nil {
		qoi = qoi.SetNillableCompletedAt(completedAt)
	}

	if _, err := qoi.
		Save(ctx); err != nil {
		return nil, nil, err
	}

	if orderID == nil {
		oid := orderItem.OrderID
		orderID = &oid
	}

	if orderID != nil {
		if _, err := tx.Order.UpdateOneID(*orderID).
			SetNillableStatusLatest(&orderStatus).
			Save(ctx); err != nil {
			return nil, nil, err
		}
	}

	return &orderStatus, orderItem, nil
}

func (r *orderItemProcessInProgressRepository) syncOrderProcessLatest(
	ctx context.Context,
	tx *generated.Tx,
	processID int64,
	orderItemID int64,
	orderID *int64,
) error {
	if orderID == nil {
		orderItem, err := tx.OrderItem.
			Query().
			Where(orderitem.IDEQ(orderItemID)).
			Select(orderitem.FieldOrderID).
			Only(ctx)
		if err != nil {
			return err
		}
		oid := orderItem.OrderID
		orderID = &oid
	}

	if orderID == nil {
		return nil
	}

	process, err := r.processClient(tx).
		Query().
		Where(orderitemprocess.IDEQ(processID)).
		Select(orderitemprocess.FieldProcessName).
		Only(ctx)
	if err != nil {
		return err
	}

	processIDLatest := int(processID)
	if _, err := tx.Order.UpdateOneID(*orderID).
		SetProcessIDLatest(processIDLatest).
		SetNillableProcessNameLatest(process.ProcessName).
		Save(ctx); err != nil {
		return err
	}

	return nil
}

func (r *orderItemProcessInProgressRepository) checkinWithData(ctx context.Context, tx *generated.Tx, latest *generated.OrderItemProcessInProgress, processes []*generated.OrderItemProcess, orderItemID int64, orderID *int64, note *string) (*model.OrderItemProcessInProgressDTO, error) {
	var prevProcessID *int64
	targetProcessID := processes[0].ID

	if latest != nil {
		switch {
		case latest.NextProcessID != nil:
			targetProcessID = *latest.NextProcessID
			prevProcessID = latest.ProcessID
		case latest.ProcessID != nil:
			targetProcessID = *latest.ProcessID
			prevProcessID = latest.PrevProcessID
		}
	}

	targetProcess := r.findProcess(processes, targetProcessID)
	if targetProcess == nil {
		return nil, fmt.Errorf("process %d not found for order item %d", targetProcessID, orderItemID)
	}

	startedAt := time.Now()
	entity, err := r.inprogressClient(tx).
		Create().
		SetNillableProcessID(&targetProcessID).
		SetNillablePrevProcessID(prevProcessID).
		SetOrderItemID(orderItemID).
		SetNillableOrderID(r.pickOrderID(orderID, targetProcess)).
		SetNillableAssignedID(targetProcess.AssignedID).
		SetNillableAssignedName(targetProcess.AssignedName).
		SetNillableCheckInNote(note).
		SetStartedAt(startedAt).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)
	return dto, nil
}

func (r *orderItemProcessInProgressRepository) checkoutWithData(ctx context.Context, tx *generated.Tx, latest *generated.OrderItemProcessInProgress, processes []*generated.OrderItemProcess, note *string) (*model.OrderItemProcessInProgressDTO, error) {
	currentProcessID := processes[0].ID
	if latest.ProcessID != nil {
		currentProcessID = *latest.ProcessID
	}

	nextProcessID := r.nextProcessID(processes, currentProcessID)
	targetProcess := r.findProcess(processes, currentProcessID)
	if targetProcess == nil {
		return nil, fmt.Errorf("process %d not found for order item %d", currentProcessID, latest.OrderItemID)
	}

	completedAt := time.Now()
	entity, err := r.inprogressClient(tx).
		UpdateOneID(latest.ID).
		SetProcessID(currentProcessID).
		SetNillableNextProcessID(nextProcessID).
		SetNillableOrderID(r.pickOrderID(latest.OrderID, targetProcess)).
		SetNillableCheckOutNote(note).
		SetCompletedAt(completedAt).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.OrderItemProcessInProgress, *model.OrderItemProcessInProgressDTO](entity)
	return dto, nil
}

func (r *orderItemProcessInProgressRepository) processInfoFromSection(ctx context.Context, tx *generated.Tx, processID *int64) (*int, *string, *string, *string, error) {
	if processID == nil {
		return nil, nil, nil, nil, nil
	}

	sectionClient := r.db.SectionProcess
	if tx != nil {
		sectionClient = tx.SectionProcess
	}

	sectionProc, err := sectionClient.
		Query().
		Where(sectionprocess.ProcessIDEQ(int(*processID))).
		Select(sectionprocess.FieldSectionName).
		WithSection(func(q *generated.SectionQuery) {
			q.Select(section.FieldLeaderID)
		}).
		First(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, nil, nil, nil, nil
		}
		return nil, nil, nil, nil, err
	}

	var leaderID *int
	var leaderName *string
	var sectionName *string
	var processName *string
	if sectionProc.Edges.Section != nil {
		if sectionProc.Edges.Section.LeaderID != nil {
			leaderID = sectionProc.Edges.Section.LeaderID
		}
		if sectionProc.Edges.Section.LeaderName != nil {
			leaderName = sectionProc.Edges.Section.LeaderName
		}
		sectionName = &sectionProc.Edges.Section.Name
		processName = sectionProc.ProcessName
	}

	return leaderID, leaderName, sectionName, processName, nil
}

func (r *orderItemProcessInProgressRepository) ProcessInfoByProcessID(
	ctx context.Context,
	tx *generated.Tx,
	processID *int64,
) (*int, *string, *string, *string, error) {

	if processID == nil {
		return nil, nil, nil, nil, nil
	}

	client := r.db.OrderItemProcess
	if tx != nil {
		client = tx.OrderItemProcess
	}

	oip, err := client.
		Query().
		Where(
			orderitemprocess.IDEQ(*processID),
		).
		Order(generated.Desc(orderitemprocess.FieldID)).
		First(ctx)

	if err != nil {
		if generated.IsNotFound(err) {
			return nil, nil, nil, nil, nil
		}
		return nil, nil, nil, nil, err
	}

	var (
		leaderID    *int
		leaderName  *string
		sectionName *string
		processName *string
	)

	if oip.LeaderID != nil {
		leaderID = oip.LeaderID
	}
	if oip.LeaderName != nil {
		leaderName = oip.LeaderName
	}
	if oip.SectionName != nil {
		sectionName = oip.SectionName
	}
	if oip.ProcessName != nil {
		processName = oip.ProcessName
	}

	if leaderID == nil || leaderName == nil || sectionName == nil || processName == nil {
		fallbackLeaderID, fallbackLeaderName, fallbackSectionName, fallbackProcessName, err := r.processInfoFromSection(ctx, tx, processID)
		if err != nil {
			return nil, nil, nil, nil, err
		}
		if leaderID == nil {
			leaderID = fallbackLeaderID
		}
		if leaderName == nil {
			leaderName = fallbackLeaderName
		}
		if sectionName == nil {
			sectionName = fallbackSectionName
		}
		if processName == nil {
			processName = fallbackProcessName
		}
	}

	return leaderID, leaderName, sectionName, processName, nil
}

func (r *orderItemProcessInProgressRepository) inprogressClient(tx *generated.Tx) *generated.OrderItemProcessInProgressClient {
	if tx != nil {
		return tx.OrderItemProcessInProgress
	}
	return r.db.OrderItemProcessInProgress
}

func (r *orderItemProcessInProgressRepository) processClient(tx *generated.Tx) *generated.OrderItemProcessClient {
	if tx != nil {
		return tx.OrderItemProcess
	}
	return r.db.OrderItemProcess
}

func (r *orderItemProcessInProgressRepository) dentistReviewClient(tx *generated.Tx) *generated.OrderItemProcessDentistReviewClient {
	if tx != nil {
		return tx.OrderItemProcessDentistReview
	}
	return r.db.OrderItemProcessDentistReview
}

func mapDentistReview(review *generated.OrderItemProcessDentistReview) *model.OrderItemProcessDentistReviewDTO {
	if review == nil {
		return nil
	}
	return &model.OrderItemProcessDentistReviewDTO{
		ID:            review.ID,
		OrderID:       review.OrderID,
		OrderItemID:   review.OrderItemID,
		OrderItemCode: review.OrderItemCode,
		ProductID:     review.ProductID,
		ProductCode:   review.ProductCode,
		ProductName:   review.ProductName,
		ProcessID:     review.ProcessID,
		ProcessName:   review.ProcessName,
		InProgressID:  review.InProgressID,
		Status:        review.Status,
		RequestNote:   review.RequestNote,
		ResponseNote:  review.ResponseNote,
		RequestedBy:   review.RequestedBy,
		ResolvedBy:    review.ResolvedBy,
		RequestedAt:   review.RequestedAt,
		ResolvedAt:    review.ResolvedAt,
		CreatedAt:     review.CreatedAt,
		UpdatedAt:     review.UpdatedAt,
	}
}

func sameAssigned(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func (r *orderItemProcessInProgressRepository) GetInProgressesByAssignedID(
	ctx context.Context,
	tx *generated.Tx,
	assignedID int64,
	query table.TableQuery,
) (table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO], error) {

	base := r.inprogressClient(tx).
		Query().
		Where(
			orderitemprocessinprogress.AssignedID(assignedID),
		)

	list, err := table.TableListV2[
		generated.OrderItemProcessInProgress,
		generated.OrderItemProcessInProgress,
	](
		ctx,
		base,
		query,
		orderitemprocessinprogress.Table,
		orderitemprocessinprogress.FieldID,
		orderitemprocessinprogress.FieldStartedAt,

		func(q *generated.OrderItemProcessInProgressQuery) *generated.OrderItemProcessInProgressQuery {
			return q.
				Select(
					orderitemprocessinprogress.FieldID,
					orderitemprocessinprogress.FieldOrderID,
					orderitemprocessinprogress.FieldOrderItemID,
					orderitemprocessinprogress.FieldOrderItemCode,
					orderitemprocessinprogress.FieldProductID,
					orderitemprocessinprogress.FieldProductCode,
					orderitemprocessinprogress.FieldProductName,
					orderitemprocessinprogress.FieldCheckInNote,
					orderitemprocessinprogress.FieldCheckOutNote,
					orderitemprocessinprogress.FieldAssignedID,
					orderitemprocessinprogress.FieldAssignedName,
					orderitemprocessinprogress.FieldStartedAt,
					orderitemprocessinprogress.FieldCompletedAt,
				).
				WithProcess(func(pq *generated.OrderItemProcessQuery) {
					pq.Select(
						orderitemprocess.FieldID,
						orderitemprocess.FieldProcessName,
						orderitemprocess.FieldSectionName,
						orderitemprocess.FieldColor,
					)
				})
		},
		nil,
	)
	if err != nil {
		var zero table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO]
		return zero, err
	}

	out := make([]*model.OrderItemProcessInProgressAndProcessDTO, 0, len(list.Items))
	for _, item := range list.Items {
		proc, err := item.Edges.ProcessOrErr()
		if err != nil {
			var zero table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO]
			return zero, err
		}

		out = append(out, &model.OrderItemProcessInProgressAndProcessDTO{
			ID:            item.ID,
			OrderID:       item.OrderID,
			OrderItemID:   item.OrderItemID,
			OrderItemCode: item.OrderItemCode,
			ProductID:     item.ProductID,
			ProductCode:   item.ProductCode,
			ProductName:   item.ProductName,
			CheckInNote:   item.CheckInNote,
			CheckOutNote:  item.CheckOutNote,
			AssignedID:    item.AssignedID,
			AssignedName:  item.AssignedName,
			StartedAt:     item.StartedAt,
			CompletedAt:   item.CompletedAt,
			ProcessName:   proc.ProcessName,
			SectionName:   proc.SectionName,
			SectionID:     proc.SectionID,
			Color:         proc.Color,
		})
	}

	return table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO]{
		Items: out,
		Total: list.Total,
	}, nil
}

func (r *orderItemProcessInProgressRepository) GetInProgressesByStaffTimeline(
	ctx context.Context,
	tx *generated.Tx,
	staffID int64,
	from time.Time,
	to time.Time,
) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {

	items, err := r.inprogressClient(tx).
		Query().
		Where(
			orderitemprocessinprogress.AssignedID(staffID),
			orderitemprocessinprogress.StartedAtGTE(from),
			orderitemprocessinprogress.StartedAtLT(to),
		).
		Order(orderitemprocessinprogress.ByStartedAt(sql.OrderAsc())).
		Select(
			orderitemprocessinprogress.FieldID,
			orderitemprocessinprogress.FieldOrderID,
			orderitemprocessinprogress.FieldOrderItemID,
			orderitemprocessinprogress.FieldOrderItemCode,
			orderitemprocessinprogress.FieldProductID,
			orderitemprocessinprogress.FieldProductCode,
			orderitemprocessinprogress.FieldProductName,
			orderitemprocessinprogress.FieldCheckInNote,
			orderitemprocessinprogress.FieldCheckOutNote,
			orderitemprocessinprogress.FieldAssignedID,
			orderitemprocessinprogress.FieldAssignedName,
			orderitemprocessinprogress.FieldStartedAt,
			orderitemprocessinprogress.FieldCompletedAt,
		).
		WithProcess(func(q *generated.OrderItemProcessQuery) {
			q.Select(
				orderitemprocess.FieldID,
				orderitemprocess.FieldProcessName,
				orderitemprocess.FieldSectionName,
				orderitemprocess.FieldColor,
			)
		}).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.OrderItemProcessInProgressAndProcessDTO, 0, len(items))
	for _, item := range items {
		proc, err := item.Edges.ProcessOrErr()
		if err != nil {
			return nil, err
		}

		out = append(out, &model.OrderItemProcessInProgressAndProcessDTO{
			ID:            item.ID,
			OrderID:       item.OrderID,
			OrderItemID:   item.OrderItemID,
			OrderItemCode: item.OrderItemCode,
			ProductID:     item.ProductID,
			ProductCode:   item.ProductCode,
			ProductName:   item.ProductName,
			CheckInNote:   item.CheckInNote,
			CheckOutNote:  item.CheckOutNote,
			AssignedID:    item.AssignedID,
			AssignedName:  item.AssignedName,
			StartedAt:     item.StartedAt,
			CompletedAt:   item.CompletedAt,
			ProcessName:   proc.ProcessName,
			SectionName:   proc.SectionName,
			SectionID:     proc.SectionID,
			Color:         proc.Color,
		})
	}

	return out, nil
}
