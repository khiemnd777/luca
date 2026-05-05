package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/order/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	auditlogmodel "github.com/khiemnd777/noah_api/shared/modules/auditlog/model"
	"github.com/khiemnd777/noah_api/shared/modules/notification"
	"github.com/khiemnd777/noah_api/shared/modules/realtime"
	"github.com/khiemnd777/noah_api/shared/pubsub"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type OrderItemProcessService interface {
	GetRawProcessesByProductID(ctx context.Context, productID int) ([]*model.ProcessDTO, error)

	GetProcessesByOrderItemID(
		ctx context.Context,
		orderID int64,
		orderItemID int64,
	) ([]*model.OrderItemProcessDTO, error)

	GetProcessesByAssignedID(
		ctx context.Context,
		deptID int,
		assignedID int64,
	) ([]*model.OrderItemProcessDTO, error)
	GetProcessesByStaffTimeline(
		ctx context.Context,
		deptID int,
		staffID int64,
		from time.Time,
		to time.Time,
	) ([]*model.OrderItemProcessDTO, error)

	GetInProgressByID(
		ctx context.Context,
		inProgressID int64,
	) (*model.OrderItemProcessInProgressAndProcessDTO, error)

	GetInProgressesByProcessID(
		ctx context.Context,
		processID int64,
	) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)

	GetInProgressesByOrderItemID(
		ctx context.Context,
		orderID int64,
		orderItemID int64,
	) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)

	GetInProgressesByAssignedID(
		ctx context.Context,
		assignedID int64,
		query table.TableQuery,
	) (table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO], error)
	GetInProgressesByStaffTimeline(
		ctx context.Context,
		staffID int64,
		from time.Time,
		to time.Time,
	) ([]*model.OrderItemProcessInProgressAndProcessDTO, error)
	GetCheckoutLatest(
		ctx context.Context,
		orderItemID int64,
		productID *int,
	) (*model.OrderItemProcessInProgressAndProcessDTO, error)

	PrepareCheckInOrOut(
		ctx context.Context,
		orderID int64,
		orderItemID int64,
	) (*model.OrderItemProcessInProgressDTO, error)

	PrepareCheckInOrOutByCode(
		ctx context.Context,
		code string,
	) (*model.OrderItemProcessInProgressDTO, error)

	CheckInOrOut(
		ctx context.Context,
		deptID int,
		userID int,
		checkInOrOutData *model.OrderItemProcessInProgressDTO,
	) (*model.OrderItemProcessInProgressDTO, error)
	ResolveDentistReview(
		ctx context.Context,
		deptID int,
		userID int,
		reviewID int64,
		payload *model.OrderItemProcessDentistReviewResolveDTO,
	) (*model.OrderItemProcessDentistReviewDTO, error)
	Assign(
		ctx context.Context,
		deptID,
		userID int,
		inprogressID int64,
		assignedID *int64,
		assignedName *string,
		note *string,
	) (*model.OrderItemProcessInProgressDTO, error)

	Update(
		ctx context.Context,
		deptID int,
		input *model.OrderItemProcessUpsertDTO,
	) (*model.OrderItemProcessDTO, error)
}

type orderItemProcessService struct {
	repo           repository.OrderItemProcessRepository
	inprogressRepo repository.OrderItemProcessInProgressRepository
	deps           *module.ModuleDeps[config.ModuleConfig]
	cfMgr          *customfields.Manager
}

func NewOrderItemProcessService(
	repo repository.OrderItemProcessRepository,
	inprogressRepo repository.OrderItemProcessInProgressRepository,
	deps *module.ModuleDeps[config.ModuleConfig],
	cfMgr *customfields.Manager,
) OrderItemProcessService {
	return &orderItemProcessService{
		repo:           repo,
		inprogressRepo: inprogressRepo,
		deps:           deps,
		cfMgr:          cfMgr,
	}
}

func kAssignedInProgressList(assignedID int64, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("order:assigned:%d:inprogresses:l%d:p%d:o%s:d%s", assignedID, q.Limit, q.Page, orderBy, q.Direction)
}

func (s *orderItemProcessService) getDepartmentCorporateAdminID(ctx context.Context, deptID int) (*int, error) {
	if deptID <= 0 {
		return nil, nil
	}

	dept, err := s.deps.Ent.(*generated.Client).Department.
		Query().
		Where(department.IDEQ(deptID)).
		Select(department.FieldCorporateAdministratorID).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	if dept.CorporateAdministratorID == nil || *dept.CorporateAdministratorID <= 0 {
		return nil, nil
	}

	return dept.CorporateAdministratorID, nil
}

func (s *orderItemProcessService) GetRawProcessesByProductID(ctx context.Context, productID int) ([]*model.ProcessDTO, error) {
	return cache.GetList(fmt.Sprintf("product:id:%d:processes", productID), cache.TTLMedium, func() ([]*model.ProcessDTO, error) {
		return s.repo.GetRawProcessesByProductID(ctx, productID)
	})
}

func (s *orderItemProcessService) GetProcessesByOrderItemID(
	ctx context.Context,
	orderID int64,
	orderItemID int64,
) ([]*model.OrderItemProcessDTO, error) {
	return cache.GetList(fmt.Sprintf("order:id:%d:oid:%d:processes", orderID, orderItemID), cache.TTLShort, func() ([]*model.OrderItemProcessDTO, error) {
		return s.repo.GetProcessesByOrderItemID(ctx, nil, orderItemID)
	})
}

func (s *orderItemProcessService) GetProcessesByAssignedID(
	ctx context.Context,
	deptID int,
	assignedID int64,
) ([]*model.OrderItemProcessDTO, error) {
	return cache.GetList(fmt.Sprintf("order:assigned:dpt%d:%d:processes", deptID, assignedID), cache.TTLShort, func() ([]*model.OrderItemProcessDTO, error) {
		return s.repo.GetProcessesByAssignedID(ctx, nil, deptID, assignedID)
	})
}

func (s *orderItemProcessService) GetProcessesByStaffTimeline(
	ctx context.Context,
	deptID int,
	staffID int64,
	from time.Time,
	to time.Time,
) ([]*model.OrderItemProcessDTO, error) {
	key := fmt.Sprintf("order:assigned:dpt%d:%d:timeline:%d:%d", deptID, staffID, from.Unix(), to.Unix())
	return cache.GetList(key, cache.TTLShort, func() ([]*model.OrderItemProcessDTO, error) {
		return s.repo.GetProcessesByStaffTimeline(ctx, nil, deptID, staffID, from, to)
	})
}

func (s *orderItemProcessService) GetInProgressByID(ctx context.Context, inProgressID int64) (*model.OrderItemProcessInProgressAndProcessDTO, error) {
	return cache.Get(fmt.Sprintf("order:process:inprogress:id%d", inProgressID), cache.TTLMedium, func() (*model.OrderItemProcessInProgressAndProcessDTO, error) {
		return s.inprogressRepo.GetInProgressByID(ctx, nil, inProgressID)
	})
}

func (s *orderItemProcessService) GetInProgressesByProcessID(ctx context.Context, processID int64) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
	return cache.GetList(fmt.Sprintf("order:process:id%d:inprogresses", processID), cache.TTLMedium, func() ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
		return s.inprogressRepo.GetInProgressesByProcessID(ctx, nil, processID)
	})
}

func (s *orderItemProcessService) GetInProgressesByOrderItemID(
	ctx context.Context,
	orderID int64,
	orderItemID int64,
) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
	return cache.GetList(fmt.Sprintf("order:id:%d:oid:%d:inprogresses", orderID, orderItemID), cache.TTLShort, func() ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
		return s.inprogressRepo.GetInProgressesByOrderItemID(ctx, nil, orderItemID)
	})
}

func (s *orderItemProcessService) GetInProgressesByAssignedID(
	ctx context.Context,
	assignedID int64,
	query table.TableQuery,
) (table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO], error) {
	type boxed = table.TableListResult[model.OrderItemProcessInProgressAndProcessDTO]
	key := kAssignedInProgressList(assignedID, query)

	ptr, err := cache.Get(key, cache.TTLShort, func() (*boxed, error) {
		res, e := s.inprogressRepo.GetInProgressesByAssignedID(ctx, nil, assignedID, query)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *orderItemProcessService) GetInProgressesByStaffTimeline(
	ctx context.Context,
	staffID int64,
	from time.Time,
	to time.Time,
) ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
	key := fmt.Sprintf("order:assigned:%d:inprogresses:timeline:%d:%d", staffID, from.Unix(), to.Unix())
	return cache.GetList(key, cache.TTLShort, func() ([]*model.OrderItemProcessInProgressAndProcessDTO, error) {
		return s.inprogressRepo.GetInProgressesByStaffTimeline(ctx, nil, staffID, from, to)
	})
}

func (s *orderItemProcessService) GetCheckoutLatest(ctx context.Context, orderItemID int64, productID *int) (*model.OrderItemProcessInProgressAndProcessDTO, error) {
	cacheKey := fmt.Sprintf("order:process:checkout:latest:oid:%d", orderItemID)
	if productID != nil {
		cacheKey = fmt.Sprintf("%s:pid:%d", cacheKey, *productID)
	}
	return cache.Get(cacheKey, cache.TTLShort, func() (*model.OrderItemProcessInProgressAndProcessDTO, error) {
		return s.inprogressRepo.GetCheckoutLatest(ctx, nil, orderItemID, productID)
	})
}

func (s *orderItemProcessService) PrepareCheckInOrOut(ctx context.Context, orderID int64, orderItemID int64) (*model.OrderItemProcessInProgressDTO, error) {
	return s.inprogressRepo.PrepareCheckInOrOut(ctx, nil, orderItemID, &orderID)
}

func (s *orderItemProcessService) PrepareCheckInOrOutByCode(ctx context.Context, code string) (*model.OrderItemProcessInProgressDTO, error) {
	return s.inprogressRepo.PrepareCheckInOrOutByCode(ctx, code)
}

// TODO: remove all orderID, orderItemID
func (s *orderItemProcessService) CheckInOrOut(
	ctx context.Context,
	deptID,
	userID int,
	checkInOrOutData *model.OrderItemProcessInProgressDTO,
) (*model.OrderItemProcessInProgressDTO, error) {
	if checkInOrOutData != nil && checkInOrOutData.ID > 0 && checkInOrOutData.RequiresDentistReview {
		if strings.TrimSpace(utils.SafeString(checkInOrOutData.DentistReviewRequestNote)) == "" {
			return nil, fmt.Errorf("dentist review request note is required")
		}
	}

	var err error
	dto, processStatus, orderstatus, orderitem, err := s.inprogressRepo.CheckInOrOut(ctx, userID, checkInOrOutData)
	if err != nil {
		return nil, err
	}

	orderItemID := dto.OrderItemID
	if orderItemID == 0 && checkInOrOutData != nil {
		orderItemID = checkInOrOutData.OrderItemID
	}
	orderID := dto.OrderID
	if orderID == nil && checkInOrOutData != nil {
		orderID = checkInOrOutData.OrderID
	}

	var keys []string
	if orderID != nil {
		keys = append(keys, kOrderByID(*orderID), kOrderByIDAll(*orderID))
		if orderItemID > 0 {
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:processes", *orderID, orderItemID))
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:inprogresses", *orderID, orderItemID))
		}
	}

	if orderItemID > 0 {
		keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d", orderItemID))
		if dto.ProductID != nil {
			keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d:pid:%d", orderItemID, *dto.ProductID))
		}
	}

	keys = append(keys, fmt.Sprintf("order:process:inprogress:id%d", dto.ID))
	if dto.ProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.ProcessID))
	}
	if dto.PrevProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.PrevProcessID))
	}
	if dto.NextProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.NextProcessID))
	}
	if dto.AssignedID != nil {
		keys = append(keys, fmt.Sprintf("order:assigned:dpt%d:%d:*", deptID, *dto.AssignedID))
	}

	cache.InvalidateKeys(keys...)
	cache.InvalidateKeys(kOrderAll(deptID)...)

	shouldNotifyNextLeader := !dto.RequiresDentistReview && dto.CompletedAt != nil && dto.NextProcessID != nil && dto.NextLeaderID != nil
	shouldNotifyDepartmentAdmin := !dto.RequiresDentistReview && dto.CompletedAt != nil && dto.NextProcessID == nil

	// notify to next process's leader
	if shouldNotifyNextLeader {
		notification.Notify(*dto.NextLeaderID, userID, notification.TypeOrderCheckoutToLeader, map[string]any{
			"leader_id":       dto.NextLeaderID,
			"leader_name":     dto.NextLeaderName,
			"order_item_id":   dto.OrderItemID,
			"order_item_code": dto.OrderItemCode,
			"product_id":      dto.ProductID,
			"product_code":    dto.ProductCode,
			"product_name":    dto.ProductName,
			"section_name":    dto.NextSectionName,
			"process_name":    dto.NextProcessName,
		})
	} else if dto.CompletedAt != nil && dto.NextProcessID != nil {
		logger.Warn(
			"order_checkout_notification_skipped_missing_next_leader",
			"order_id", dto.OrderID,
			"order_item_id", dto.OrderItemID,
			"process_id", dto.ProcessID,
			"next_process_id", dto.NextProcessID,
		)
	}
	if shouldNotifyDepartmentAdmin {
		corporateAdminID, corporateAdminErr := s.getDepartmentCorporateAdminID(ctx, deptID)
		if corporateAdminErr != nil {
			logger.Warn(
				"order_checkout_final_notification_corporate_admin_lookup_failed",
				"dept_id", deptID,
				"order_id", dto.OrderID,
				"order_item_id", dto.OrderItemID,
				"process_id", dto.ProcessID,
				"error", corporateAdminErr.Error(),
			)
		} else if corporateAdminID != nil {
			notification.Notify(*corporateAdminID, userID, notification.TypeOrderProcessCompleted, map[string]any{
				"department_id":      deptID,
				"corporate_admin_id": corporateAdminID,
				"order_id":           dto.OrderID,
				"order_item_id":      dto.OrderItemID,
				"order_item_code":    dto.OrderItemCode,
				"product_id":         dto.ProductID,
				"product_code":       dto.ProductCode,
				"product_name":       dto.ProductName,
				"section_name":       dto.SectionName,
				"process_name":       dto.ProcessName,
				"is_final_process":   true,
			})
		} else {
			logger.Warn(
				"order_checkout_final_notification_skipped_missing_department_corporate_admin",
				"dept_id", deptID,
				"order_id", dto.OrderID,
				"order_item_id", dto.OrderItemID,
				"process_id", dto.ProcessID,
			)
		}
	}

	if !dto.RequiresDentistReview && dto.CompletedAt != nil && dto.NextProcessID != nil && orderstatus != nil && "completed" == *orderstatus && orderitem != nil {
		pubsub.PublishAsync("dashboard:daily:turnaround:stats", &model.CaseDailyStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
			ReceivedAt:   orderitem.CreatedAt,
		})

		realtime.BroadcastToDept(deptID, "dashboard:daily:turnaround:stats", nil)

		pubsub.PublishAsync("dashboard:daily:remake:stats", &model.CaseDailyRemakeStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
			IsRemake:     orderitem.RemakeCount > 0,
		})

		realtime.BroadcastToDept(deptID, "dashboard:daily:remake:stats", nil)

		pubsub.PublishAsync("dashboard:daily:completed:stats", &model.CaseDailyCompletedStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
		})

		realtime.BroadcastToDept(deptID, "dashboard:daily:completed:stats", nil)

		pubsub.PublishAsync("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
			DepartmentID: deptID,
			StatAt:       time.Now(),
		})

		realtime.BroadcastToDept(deptID, "dashboard:daily:active:stats", nil)
	}

	realtime.BroadcastAll("order:inprogress", nil)
	realtime.BroadcastToDept(deptID, "dashboard:statuses", nil)
	realtime.BroadcastToDept(deptID, "dashboard:due_today", nil)
	realtime.BroadcastToDept(deptID, "dashboard:active_today", nil)
	realtime.BroadcastToDept(deptID, "dashboard:production_planning", nil)
	realtime.BroadcastToDept(deptID, "order:changed", nil)

	if dto.RequiresDentistReview && dto.DentistReviewID != nil {
		pubsub.PublishAsync("log:create", auditlogmodel.AuditLogRequest{
			UserID:   userID,
			Module:   "order",
			Action:   "dentist_review:create",
			TargetID: *dto.OrderID,
			Data: map[string]any{
				"order_id":            dto.OrderID,
				"order_item_id":       dto.OrderItemID,
				"user_id":             userID,
				"review_id":           dto.DentistReviewID,
				"order_item_code":     dto.OrderItemCode,
				"product_id":          dto.ProductID,
				"product_code":        dto.ProductCode,
				"product_name":        dto.ProductName,
				"section_id":          dto.SectionID,
				"section_name":        dto.SectionName,
				"process_id":          dto.ProcessID,
				"process_name":        dto.ProcessName,
				"status":              processStatus,
				"review_status":       dto.DentistReviewStatus,
				"review_request_note": dto.DentistReviewRequestNote,
			},
		})
	} else if dto.CompletedAt != nil && dto.NextProcessID != nil {
		pubsub.PublishAsync("log:create", auditlogmodel.AuditLogRequest{
			UserID:   userID,
			Module:   "order",
			Action:   "inprogress:checkout",
			TargetID: *dto.OrderID,
			Data: map[string]any{
				"order_id":          dto.OrderID,
				"order_item_id":     dto.OrderItemID,
				"user_id":           userID,
				"order_item_code":   dto.OrderItemCode,
				"product_id":        dto.ProductID,
				"product_code":      dto.ProductCode,
				"product_name":      dto.ProductName,
				"section_id":        dto.SectionID,
				"section_name":      dto.SectionName,
				"process_id":        dto.ProcessID,
				"process_name":      dto.ProcessName,
				"next_section_id":   dto.NextSectionID,
				"next_section_name": dto.NextSectionName,
				"next_process_id":   dto.NextProcessID,
				"next_process_name": dto.NextProcessName,
				"status":            orderstatus,
			},
		})
	} else {
		pubsub.PublishAsync("log:create", auditlogmodel.AuditLogRequest{
			UserID:   userID,
			Module:   "order",
			Action:   "inprogress:checkin",
			TargetID: *dto.OrderID,
			Data: map[string]any{
				"order_id":        dto.OrderID,
				"order_item_id":   dto.OrderItemID,
				"user_id":         userID,
				"order_item_code": dto.OrderItemCode,
				"product_id":      dto.ProductID,
				"product_code":    dto.ProductCode,
				"product_name":    dto.ProductName,
				"section_id":      dto.SectionID,
				"section_name":    dto.SectionName,
				"process_id":      dto.ProcessID,
				"process_name":    dto.ProcessName,
				"assigned_id":     dto.AssignedID,
				"assigned_name":   dto.AssignedName,
				"status":          orderstatus,
			},
		})
	}

	return dto, nil
}

func (s *orderItemProcessService) ResolveDentistReview(
	ctx context.Context,
	deptID int,
	userID int,
	reviewID int64,
	payload *model.OrderItemProcessDentistReviewResolveDTO,
) (*model.OrderItemProcessDentistReviewDTO, error) {
	if reviewID <= 0 {
		return nil, fmt.Errorf("invalid dentist review id")
	}
	if payload == nil {
		return nil, fmt.Errorf("payload is required")
	}
	result := strings.TrimSpace(payload.Result)
	if result != "approved" && result != "rejected" {
		return nil, fmt.Errorf("invalid dentist review result")
	}

	review, dto, orderstatus, orderitem, err := s.inprogressRepo.ResolveDentistReview(ctx, deptID, reviewID, result, payload.Note, userID)
	if err != nil {
		return nil, err
	}

	s.invalidateOrderProcessCaches(deptID, review, dto)

	if result == "approved" && dto != nil && dto.CompletedAt != nil && dto.NextProcessID != nil && orderstatus != nil && "completed" == *orderstatus && orderitem != nil {
		pubsub.PublishAsync("dashboard:daily:turnaround:stats", &model.CaseDailyStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
			ReceivedAt:   orderitem.CreatedAt,
		})
		realtime.BroadcastToDept(deptID, "dashboard:daily:turnaround:stats", nil)

		pubsub.PublishAsync("dashboard:daily:remake:stats", &model.CaseDailyRemakeStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
			IsRemake:     orderitem.RemakeCount > 0,
		})
		realtime.BroadcastToDept(deptID, "dashboard:daily:remake:stats", nil)

		pubsub.PublishAsync("dashboard:daily:completed:stats", &model.CaseDailyCompletedStatsUpsert{
			DepartmentID: deptID,
			CompletedAt:  *dto.CompletedAt,
		})
		realtime.BroadcastToDept(deptID, "dashboard:daily:completed:stats", nil)

		pubsub.PublishAsync("dashboard:daily:active:stats", &model.CaseDailyActiveStatsUpsert{
			DepartmentID: deptID,
			StatAt:       time.Now(),
		})
		realtime.BroadcastToDept(deptID, "dashboard:daily:active:stats", nil)
	}

	realtime.BroadcastAll("order:inprogress", nil)
	realtime.BroadcastToDept(deptID, "dashboard:statuses", nil)
	realtime.BroadcastToDept(deptID, "dashboard:due_today", nil)
	realtime.BroadcastToDept(deptID, "dashboard:active_today", nil)
	realtime.BroadcastToDept(deptID, "dashboard:production_planning", nil)
	realtime.BroadcastToDept(deptID, "order:changed", nil)

	var targetID int64
	if review.OrderID != nil {
		targetID = *review.OrderID
	}
	pubsub.PublishAsync("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "dentist_review:resolve",
		TargetID: targetID,
		Data: map[string]any{
			"order_id":        review.OrderID,
			"order_item_id":   review.OrderItemID,
			"user_id":         userID,
			"review_id":       review.ID,
			"result":          result,
			"order_item_code": review.OrderItemCode,
			"product_id":      review.ProductID,
			"product_code":    review.ProductCode,
			"product_name":    review.ProductName,
			"process_id":      review.ProcessID,
			"process_name":    review.ProcessName,
			"review_status":   review.Status,
			"response_note":   review.ResponseNote,
			"order_status":    orderstatus,
		},
	})

	return review, nil
}

func (s *orderItemProcessService) invalidateOrderProcessCaches(
	deptID int,
	review *model.OrderItemProcessDentistReviewDTO,
	dto *model.OrderItemProcessInProgressDTO,
) {
	var keys []string
	if review != nil && review.OrderID != nil {
		keys = append(keys, kOrderByID(*review.OrderID), kOrderByIDAll(*review.OrderID))
		if review.OrderItemID > 0 {
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:processes", *review.OrderID, review.OrderItemID))
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:inprogresses", *review.OrderID, review.OrderItemID))
		}
	}
	if review != nil && review.OrderItemID > 0 {
		keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d", review.OrderItemID))
		if review.ProductID != nil {
			keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d:pid:%d", review.OrderItemID, *review.ProductID))
		}
	}
	if dto != nil {
		keys = append(keys, fmt.Sprintf("order:process:inprogress:id%d", dto.ID))
		if dto.AssignedID != nil {
			keys = append(keys, fmt.Sprintf("order:assigned:dpt%d:%d:*", deptID, *dto.AssignedID))
		}
	}
	if review != nil && review.ProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *review.ProcessID))
	}
	cache.InvalidateKeys(keys...)
	cache.InvalidateKeys(kOrderAll(deptID)...)
}

func (s *orderItemProcessService) Assign(ctx context.Context, deptID, userID int, inprogressID int64, assignedID *int64, assignedName *string, note *string) (*model.OrderItemProcessInProgressDTO, error) {
	dto, _, _, _, err := s.inprogressRepo.Assign(ctx, inprogressID, assignedID, assignedName, note)
	if err != nil {
		return nil, err
	}

	var keys []string
	if dto.OrderID != nil {
		keys = append(keys, kOrderByID(*dto.OrderID), kOrderByIDAll(*dto.OrderID))
		if dto.OrderItemID > 0 {
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:processes", *dto.OrderID, dto.OrderItemID))
			keys = append(keys, fmt.Sprintf("order:id:%d:oid:%d:inprogresses", *dto.OrderID, dto.OrderItemID))
		}
	}

	if dto.OrderItemID > 0 {
		keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d", dto.OrderItemID))
		if dto.ProductID != nil {
			keys = append(keys, fmt.Sprintf("order:process:checkout:latest:oid:%d:pid:%d", dto.OrderItemID, *dto.ProductID))
		}
	}

	keys = append(keys, fmt.Sprintf("order:process:inprogress:id%d", dto.ID))
	if dto.ProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.ProcessID))
	}
	if dto.PrevProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.PrevProcessID))
	}
	if dto.NextProcessID != nil {
		keys = append(keys, fmt.Sprintf("order:process:id%d:*", *dto.NextProcessID))
	}
	if dto.AssignedID != nil {
		keys = append(keys, fmt.Sprintf("order:assigned:dpt%d:%d:*", deptID, *dto.AssignedID))
	}

	cache.InvalidateKeys(keys...)
	cache.InvalidateKeys(kOrderAll(deptID)...)
	realtime.BroadcastAll("order:inprogress", nil)
	realtime.BroadcastToDept(deptID, "dashboard:production_planning", nil)
	realtime.BroadcastToDept(deptID, "order:changed", nil)

	pubsub.PublishAsync("log:create", auditlogmodel.AuditLogRequest{
		UserID:   userID,
		Module:   "order",
		Action:   "inprogress:checkin:assigned",
		TargetID: *dto.OrderID,
		Data: map[string]any{
			"order_id":        dto.OrderID,
			"order_item_id":   dto.OrderItemID,
			"user_id":         userID,
			"order_item_code": dto.OrderItemCode,
			"product_id":      dto.ProductID,
			"product_code":    dto.ProductCode,
			"product_name":    dto.ProductName,
			"section_id":      dto.SectionID,
			"section_name":    dto.SectionName,
			"process_id":      dto.ProcessID,
			"process_name":    dto.ProcessName,
			"assigned_id":     dto.AssignedID,
			"assigned_name":   dto.AssignedName,
		},
	})

	return dto, nil
}

func (s *orderItemProcessService) Update(ctx context.Context, deptID int, input *model.OrderItemProcessUpsertDTO) (*model.OrderItemProcessDTO, error) {
	var err error
	tx, err := s.deps.Ent.(*generated.Client).Tx(ctx)
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

	dto, err := s.repo.Update(ctx, tx, input.DTO.ID, input)
	if err != nil {
		return nil, err
	}

	if dto != nil {
		cache.InvalidateKeys(
			kOrderByID(dto.ID),
			kOrderByIDAll(dto.ID),
			fmt.Sprintf("order:id:%d:oid:%d:processes", *dto.OrderID, dto.OrderItemID),
		)
	}
	cache.InvalidateKeys(kOrderAll(deptID)...)

	return dto, nil
}
