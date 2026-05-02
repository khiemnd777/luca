package service

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	planningrepo "github.com/khiemnd777/noah_api/modules/main/features/dashboard/production_planning/repository"
	ordersvc "github.com/khiemnd777/noah_api/modules/main/features/order/service"
	"github.com/khiemnd777/noah_api/shared/cache"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/modules/realtime"
)

type ProductionPlanningService interface {
	Overview(ctx context.Context, deptID int) (*model.ProductionPlanningOverviewDTO, error)
	GetConfig(ctx context.Context, deptID int) (*model.ProductionPlanningConfigDTO, error)
	SaveConfig(ctx context.Context, deptID int, cfg *model.ProductionPlanningConfigDTO) (*model.ProductionPlanningConfigDTO, error)
	ApplyRecommendation(ctx context.Context, deptID, actorUserID int, recommendationID string, req model.ProductionPlanningApplyRecommendationRequestDTO) (*model.ProductionPlanningApplyRecommendationResultDTO, error)
}

type productionPlanningService struct {
	repo     planningrepo.ProductionPlanningRepository
	assigner ordersvc.OrderItemProcessService
	deps     *module.ModuleDeps[config.ModuleConfig]
}

const productionPlanningOverviewTTL = 15 * time.Second

func productionPlanningOverviewKey(deptID int) string {
	return fmt.Sprintf("dashboard:production-planning:dpt%d:overview:v1", deptID)
}

func NewProductionPlanningService(
	repo planningrepo.ProductionPlanningRepository,
	assigner ordersvc.OrderItemProcessService,
	deps *module.ModuleDeps[config.ModuleConfig],
) ProductionPlanningService {
	return &productionPlanningService{repo: repo, assigner: assigner, deps: deps}
}

func (s *productionPlanningService) Overview(ctx context.Context, deptID int) (*model.ProductionPlanningOverviewDTO, error) {
	return cache.Get(productionPlanningOverviewKey(deptID), productionPlanningOverviewTTL, func() (*model.ProductionPlanningOverviewDTO, error) {
		return s.buildOverview(ctx, deptID)
	})
}

func (s *productionPlanningService) buildOverview(ctx context.Context, deptID int) (*model.ProductionPlanningOverviewDTO, error) {
	cfg, err := s.repo.GetConfig(ctx, deptID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	work, err := s.repo.ListOpenWork(ctx, deptID)
	if err != nil {
		return nil, err
	}
	candidates, err := s.repo.ListStaffCandidates(ctx, deptID)
	if err != nil {
		return nil, err
	}

	items := make([]*model.ProductionPlanningRiskItemDTO, 0, len(work))
	recommendations := make([]*model.ProductionPlanningRecommendationDTO, 0)
	summary := model.ProductionPlanningSummaryDTO{}
	bottleneckMap := map[string]*model.ProductionPlanningBottleneckDTO{}

	for _, item := range work {
		risk := s.buildRiskItem(now, cfg, item)
		if cfg.ConfigComplete && risk.InProgressID > 0 {
			if rec := s.recommendAssignment(risk, candidates); rec != nil {
				risk.RecommendedAction = rec
				recommendations = append(recommendations, rec)
				summary.Recoverable++
			}
		}
		updateSummary(&summary, risk)
		updateBottlenecks(bottleneckMap, risk, cfg)
		items = append(items, risk)
	}

	sortRiskItems(items)
	if len(items) > 20 {
		items = items[:20]
	}
	bottlenecks := flattenBottlenecks(bottleneckMap)
	if len(bottlenecks) > 12 {
		bottlenecks = bottlenecks[:12]
	}
	if len(recommendations) > 10 {
		recommendations = recommendations[:10]
	}

	return &model.ProductionPlanningOverviewDTO{
		ServerNow:       now,
		Config:          *cfg,
		Summary:         summary,
		RiskItems:       items,
		Bottlenecks:     bottlenecks,
		Recommendations: recommendations,
	}, nil
}

func (s *productionPlanningService) GetConfig(ctx context.Context, deptID int) (*model.ProductionPlanningConfigDTO, error) {
	return s.repo.GetConfig(ctx, deptID)
}

func (s *productionPlanningService) SaveConfig(ctx context.Context, deptID int, cfg *model.ProductionPlanningConfigDTO) (*model.ProductionPlanningConfigDTO, error) {
	saved, err := s.repo.SaveConfig(ctx, deptID, cfg)
	if err != nil {
		return nil, err
	}
	cache.InvalidateKeys(fmt.Sprintf("dashboard:production-planning:dpt%d:*", deptID))
	realtime.BroadcastToDept(deptID, "dashboard:production_planning", nil)
	realtime.BroadcastToDept(deptID, "order:changed", nil)
	return saved, nil
}

func (s *productionPlanningService) ApplyRecommendation(ctx context.Context, deptID, actorUserID int, recommendationID string, req model.ProductionPlanningApplyRecommendationRequestDTO) (*model.ProductionPlanningApplyRecommendationResultDTO, error) {
	parsed, err := parseRecommendationID(recommendationID)
	if err != nil {
		return nil, err
	}
	item, err := s.repo.GetWorkItemByInProgressID(ctx, deptID, parsed.inProgressID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("recommendation target not found")
		}
		return nil, err
	}
	if item.OrderID == 0 || item.OrderItemID == 0 {
		return nil, fmt.Errorf("recommendation target is invalid")
	}
	targetName := parsed.targetName
	note := req.AdminNote
	assignment, err := s.assigner.Assign(ctx, deptID, actorUserID, parsed.inProgressID, &parsed.targetUserID, &targetName, note)
	if err != nil {
		return nil, err
	}
	rec := &model.ProductionPlanningRecommendationDTO{
		ID:                recommendationID,
		Type:              "assign",
		Status:            "applied",
		Reason:            "Đã áp dụng điều phối từ Production Planning",
		OrderID:           item.OrderID,
		OrderItemID:       item.OrderItemID,
		InProgressID:      parsed.inProgressID,
		AssignedUserID:    item.AssignedUserID,
		AssignedName:      item.AssignedName,
		TargetUserID:      parsed.targetUserID,
		TargetName:        parsed.targetName,
		ExpectedRiskDelta: parsed.expectedRiskDelta,
	}
	realtime.BroadcastToDept(deptID, "dashboard:production_planning", nil)
	realtime.BroadcastToDept(deptID, "order:changed", nil)
	return &model.ProductionPlanningApplyRecommendationResultDTO{Recommendation: rec, Assignment: assignment}, nil
}

func (s *productionPlanningService) buildRiskItem(now time.Time, cfg *model.ProductionPlanningConfigDTO, item *planningrepo.WorkItem) *model.ProductionPlanningRiskItemDTO {
	duration := durationForProcess(cfg, item.ProcessID, item.ProcessName)
	if item.RemainingProcessCount > 1 {
		duration *= item.RemainingProcessCount
	}
	activeAge := 0
	if item.StartedAt != nil {
		activeAge = int(now.Sub(*item.StartedAt).Minutes())
		if activeAge < 0 {
			activeAge = 0
		}
	}
	remainingWork := duration - activeAge
	if remainingWork < 0 {
		remainingWork = 0
	}
	eta := addBusinessMinutes(now, remainingWork, cfg.BusinessHours)
	risk := model.ProductionPlanningRiskFieldsDTO{
		ETA:        &eta,
		DeliveryAt: item.DeliveryAt,
		RiskBucket: model.PlanningRiskBucketNormal,
	}
	if item.DeliveryAt != nil {
		remaining := int(item.DeliveryAt.Sub(now).Minutes())
		risk.RemainingMinutes = &remaining
		if remaining < 0 {
			lateBy := -remaining
			risk.LateByMinutes = &lateBy
			risk.PredictedLate = true
			risk.RiskBucket = model.PlanningRiskBucketOverdue
			risk.RiskScore = 100
		} else if remaining <= 120 {
			risk.RiskBucket = model.PlanningRiskBucketDue2h
			risk.RiskScore = 90
		} else if remaining <= 240 {
			risk.RiskBucket = model.PlanningRiskBucketDue4h
			risk.RiskScore = 70
		} else if remaining <= 360 {
			risk.RiskBucket = model.PlanningRiskBucketDue6h
			risk.RiskScore = 50
		}
		if eta.After(*item.DeliveryAt) {
			lateBy := int(eta.Sub(*item.DeliveryAt).Minutes())
			risk.LateByMinutes = &lateBy
			risk.PredictedLate = true
			if risk.RiskBucket == model.PlanningRiskBucketNormal {
				risk.RiskBucket = model.PlanningRiskBucketPredictedLate
				risk.RiskScore = maxInt(risk.RiskScore, 80)
			}
		}
	}
	if !cfg.ConfigComplete {
		risk.ETA = nil
		risk.PredictedLate = false
		if risk.RiskBucket == model.PlanningRiskBucketPredictedLate {
			risk.RiskBucket = model.PlanningRiskBucketNormal
		}
	}
	return &model.ProductionPlanningRiskItemDTO{
		OrderID:                         item.OrderID,
		OrderItemID:                     item.OrderItemID,
		InProgressID:                    item.InProgressID,
		OrderCode:                       item.OrderCode,
		OrderItemCode:                   item.OrderItemCode,
		ProcessID:                       item.ProcessID,
		ProcessName:                     item.ProcessName,
		SectionID:                       item.SectionID,
		SectionName:                     item.SectionName,
		AssignedUserID:                  item.AssignedUserID,
		AssignedName:                    item.AssignedName,
		StartedAt:                       item.StartedAt,
		ActiveAgeMinutes:                activeAge,
		RemainingWorkMinutes:            remainingWork,
		ProductionPlanningRiskFieldsDTO: risk,
	}
}

func (s *productionPlanningService) recommendAssignment(item *model.ProductionPlanningRiskItemDTO, candidates []*planningrepo.StaffCandidate) *model.ProductionPlanningRecommendationDTO {
	if item == nil || item.InProgressID <= 0 || item.RiskScore < 50 {
		return nil
	}
	for _, candidate := range candidates {
		if candidate == nil || candidate.UserID <= 0 {
			continue
		}
		if item.AssignedUserID != nil && *item.AssignedUserID == candidate.UserID {
			continue
		}
		if !planningrepo.CandidateMatchesSection(candidate, item.SectionName) {
			continue
		}
		name := strings.TrimSpace(candidate.Name)
		if name == "" {
			name = fmt.Sprintf("User %d", candidate.UserID)
		}
		id := fmt.Sprintf("assign:%d:%d:%s:%d", item.InProgressID, candidate.UserID, slugID(name), minInt(item.RiskScore, 30))
		return &model.ProductionPlanningRecommendationDTO{
			ID:                id,
			Type:              "assign",
			Status:            "pending",
			Reason:            "Điều phối công đoạn rủi ro sang nhân sự còn phù hợp với phòng ban",
			OrderID:           item.OrderID,
			OrderItemID:       item.OrderItemID,
			InProgressID:      item.InProgressID,
			AssignedUserID:    item.AssignedUserID,
			AssignedName:      item.AssignedName,
			TargetUserID:      candidate.UserID,
			TargetName:        name,
			ExpectedRiskDelta: minInt(item.RiskScore, 30),
		}
	}
	return nil
}

func durationForProcess(cfg *model.ProductionPlanningConfigDTO, processID *int64, processName *string) int {
	if cfg == nil {
		return 0
	}
	if processID != nil {
		if v := cfg.ProcessDurations[strconv.FormatInt(*processID, 10)]; v > 0 {
			return v
		}
	}
	if processName != nil {
		if v := cfg.ProcessDurations[strings.ToLower(strings.TrimSpace(*processName))]; v > 0 {
			return v
		}
	}
	return cfg.DefaultDurationMin
}

func addBusinessMinutes(start time.Time, minutes int, hours model.ProductionPlanningBusinessHoursDTO) time.Time {
	if minutes <= 0 {
		return start
	}
	if hours.EndHour <= hours.StartHour {
		return start.Add(time.Duration(minutes) * time.Minute)
	}
	workDays := map[int]bool{}
	for _, d := range hours.WorkDays {
		workDays[d] = true
	}
	cur := start
	remaining := minutes
	for remaining > 0 {
		weekday := int(cur.Weekday())
		if len(workDays) > 0 && !workDays[weekday] {
			cur = nextWorkStart(cur.AddDate(0, 0, 1), hours)
			continue
		}
		dayStart := time.Date(cur.Year(), cur.Month(), cur.Day(), hours.StartHour, 0, 0, 0, cur.Location())
		dayEnd := time.Date(cur.Year(), cur.Month(), cur.Day(), hours.EndHour, 0, 0, 0, cur.Location())
		if cur.Before(dayStart) {
			cur = dayStart
		}
		if !cur.Before(dayEnd) {
			cur = nextWorkStart(cur.AddDate(0, 0, 1), hours)
			continue
		}
		available := int(dayEnd.Sub(cur).Minutes())
		if remaining <= available {
			return cur.Add(time.Duration(remaining) * time.Minute)
		}
		remaining -= available
		cur = nextWorkStart(cur.AddDate(0, 0, 1), hours)
	}
	return cur
}

func nextWorkStart(t time.Time, hours model.ProductionPlanningBusinessHoursDTO) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), hours.StartHour, 0, 0, 0, t.Location())
}

func updateSummary(summary *model.ProductionPlanningSummaryDTO, item *model.ProductionPlanningRiskItemDTO) {
	if summary == nil || item == nil {
		return
	}
	switch item.RiskBucket {
	case model.PlanningRiskBucketOverdue:
		summary.Overdue++
	case model.PlanningRiskBucketDue2h:
		summary.Due2h++
	case model.PlanningRiskBucketDue4h:
		summary.Due4h++
	case model.PlanningRiskBucketDue6h:
		summary.Due6h++
	}
	if item.PredictedLate {
		summary.PredictedLate++
	}
	if item.AssignedUserID == nil && item.InProgressID > 0 {
		summary.Blocked++
	}
}

func updateBottlenecks(groups map[string]*model.ProductionPlanningBottleneckDTO, item *model.ProductionPlanningRiskItemDTO, cfg *model.ProductionPlanningConfigDTO) {
	addBottleneck(groups, "section", nullableKey(item.SectionName, "unknown-section"), safeLabel(item.SectionName, "Chưa gắn phòng ban"), item, cfg)
	addBottleneck(groups, "process", nullableKey(item.ProcessName, "unknown-process"), safeLabel(item.ProcessName, "Chưa có công đoạn"), item, cfg)
	if item.AssignedUserID != nil {
		addBottleneck(groups, "staff", strconv.FormatInt(*item.AssignedUserID, 10), safeLabel(item.AssignedName, "Chưa gán"), item, cfg)
	}
}

func addBottleneck(groups map[string]*model.ProductionPlanningBottleneckDTO, typ, key, label string, item *model.ProductionPlanningRiskItemDTO, cfg *model.ProductionPlanningConfigDTO) {
	fullKey := typ + ":" + key
	group := groups[fullKey]
	if group == nil {
		group = &model.ProductionPlanningBottleneckDTO{Key: fullKey, Type: typ, Label: label, CapacityMultiplier: 1}
		groups[fullKey] = group
	}
	group.ActiveCount++
	group.LoadMinutes += item.RemainingWorkMinutes
	if item.RiskBucket == model.PlanningRiskBucketOverdue {
		group.OverdueCount++
	}
	if item.PredictedLate {
		group.PredictedLateCount++
	}
	if item.DeliveryAt != nil && (group.NearestDeliveryAt == nil || item.DeliveryAt.Before(*group.NearestDeliveryAt)) {
		group.NearestDeliveryAt = item.DeliveryAt
	}
	group.TopRiskScore = maxInt(group.TopRiskScore, item.RiskScore)
	if cfg != nil {
		if typ == "section" {
			if v := cfg.SectionCapacity[key]; v > 0 {
				group.CapacityMultiplier = v
			}
		}
		if typ == "staff" {
			if v := cfg.StaffCapacity[key]; v > 0 {
				group.CapacityMultiplier = v
			}
		}
	}
}

func flattenBottlenecks(groups map[string]*model.ProductionPlanningBottleneckDTO) []*model.ProductionPlanningBottleneckDTO {
	out := make([]*model.ProductionPlanningBottleneckDTO, 0, len(groups))
	for _, group := range groups {
		out = append(out, group)
	}
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if bottleneckRank(out[j]) > bottleneckRank(out[i]) {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}

func bottleneckRank(group *model.ProductionPlanningBottleneckDTO) int {
	if group == nil {
		return 0
	}
	return group.TopRiskScore*1000 + group.PredictedLateCount*100 + group.OverdueCount*50 + int(math.Round(float64(group.LoadMinutes)/maxFloat(group.CapacityMultiplier, 0.1)))
}

func sortRiskItems(items []*model.ProductionPlanningRiskItemDTO) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if riskRank(items[j]) > riskRank(items[i]) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}

func riskRank(item *model.ProductionPlanningRiskItemDTO) int {
	if item == nil {
		return 0
	}
	rank := item.RiskScore * 1000
	if item.LateByMinutes != nil {
		rank += *item.LateByMinutes
	}
	return rank
}

type parsedRecommendationID struct {
	inProgressID      int64
	targetUserID      int64
	targetName        string
	expectedRiskDelta int
}

func parseRecommendationID(id string) (parsedRecommendationID, error) {
	parts := strings.Split(id, ":")
	if len(parts) < 5 || parts[0] != "assign" {
		return parsedRecommendationID{}, fmt.Errorf("invalid recommendation id")
	}
	inProgressID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || inProgressID <= 0 {
		return parsedRecommendationID{}, fmt.Errorf("invalid recommendation target")
	}
	targetUserID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil || targetUserID <= 0 {
		return parsedRecommendationID{}, fmt.Errorf("invalid recommendation assignee")
	}
	delta, _ := strconv.Atoi(parts[4])
	return parsedRecommendationID{
		inProgressID:      inProgressID,
		targetUserID:      targetUserID,
		targetName:        strings.ReplaceAll(parts[3], "-", " "),
		expectedRiskDelta: delta,
	}, nil
}

func slugID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, ":", "")
	value = strings.ReplaceAll(value, " ", "-")
	if value == "" {
		return "assignee"
	}
	return value
}

func nullableKey(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return strings.ToLower(strings.TrimSpace(*value))
}

func safeLabel(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return strings.TrimSpace(*value)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
