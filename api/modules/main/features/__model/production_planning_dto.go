package model

import "time"

const (
	PlanningRiskBucketOverdue       = "overdue"
	PlanningRiskBucketDue2h         = "due_2h"
	PlanningRiskBucketDue4h         = "due_4h"
	PlanningRiskBucketDue6h         = "due_6h"
	PlanningRiskBucketPredictedLate = "predicted_late"
	PlanningRiskBucketNormal        = "normal"
)

type ProductionPlanningRiskFieldsDTO struct {
	ETA              *time.Time `json:"eta,omitempty"`
	DeliveryAt       *time.Time `json:"delivery_at,omitempty"`
	RemainingMinutes *int       `json:"remaining_minutes,omitempty"`
	LateByMinutes    *int       `json:"late_by_minutes,omitempty"`
	RiskScore        int        `json:"risk_score,omitempty"`
	RiskBucket       string     `json:"risk_bucket,omitempty"`
	PredictedLate    bool       `json:"predicted_late,omitempty"`
}

type ProductionPlanningConfigDTO struct {
	DepartmentID       int                                `json:"department_id,omitempty"`
	Enabled            bool                               `json:"enabled"`
	ConfigComplete     bool                               `json:"config_complete"`
	DefaultDurationMin int                                `json:"default_duration_min,omitempty"`
	BusinessHours      ProductionPlanningBusinessHoursDTO `json:"business_hours"`
	ProcessDurations   map[string]int                     `json:"process_durations,omitempty"`
	SectionCapacity    map[string]float64                 `json:"section_capacity,omitempty"`
	StaffCapacity      map[string]float64                 `json:"staff_capacity,omitempty"`
	DisabledSections   []string                           `json:"disabled_sections,omitempty"`
	DisabledStaff      []string                           `json:"disabled_staff,omitempty"`
}

type ProductionPlanningBusinessHoursDTO struct {
	StartHour int   `json:"start_hour"`
	EndHour   int   `json:"end_hour"`
	WorkDays  []int `json:"work_days,omitempty"`
}

type ProductionPlanningOverviewDTO struct {
	ServerNow       time.Time                              `json:"server_now"`
	Config          ProductionPlanningConfigDTO            `json:"config"`
	Summary         ProductionPlanningSummaryDTO           `json:"summary"`
	RiskItems       []*ProductionPlanningRiskItemDTO       `json:"risk_items"`
	Bottlenecks     []*ProductionPlanningBottleneckDTO     `json:"bottlenecks"`
	Recommendations []*ProductionPlanningRecommendationDTO `json:"recommendations"`
}

type ProductionPlanningSummaryDTO struct {
	Overdue       int `json:"overdue"`
	Due2h         int `json:"due_2h"`
	Due4h         int `json:"due_4h"`
	Due6h         int `json:"due_6h"`
	PredictedLate int `json:"predicted_late"`
	Recoverable   int `json:"recoverable"`
	Blocked       int `json:"blocked"`
}

type ProductionPlanningRiskItemDTO struct {
	OrderID              int64                                `json:"order_id"`
	OrderItemID          int64                                `json:"order_item_id"`
	InProgressID         int64                                `json:"in_progress_id,omitempty"`
	OrderCode            *string                              `json:"order_code,omitempty"`
	OrderItemCode        *string                              `json:"order_item_code,omitempty"`
	ProcessID            *int64                               `json:"process_id,omitempty"`
	ProcessName          *string                              `json:"process_name,omitempty"`
	SectionID            *int                                 `json:"section_id,omitempty"`
	SectionName          *string                              `json:"section_name,omitempty"`
	AssignedUserID       *int64                               `json:"assigned_user_id,omitempty"`
	AssignedName         *string                              `json:"assigned_name,omitempty"`
	StartedAt            *time.Time                           `json:"started_at,omitempty"`
	ActiveAgeMinutes     int                                  `json:"active_age_minutes,omitempty"`
	RemainingWorkMinutes int                                  `json:"remaining_work_minutes,omitempty"`
	RecommendedAction    *ProductionPlanningRecommendationDTO `json:"recommended_action,omitempty"`
	ProductionPlanningRiskFieldsDTO
}

type ProductionPlanningBottleneckDTO struct {
	Key                string     `json:"key"`
	Type               string     `json:"type"`
	Label              string     `json:"label"`
	ActiveCount        int        `json:"active_count"`
	OverdueCount       int        `json:"overdue_count"`
	PredictedLateCount int        `json:"predicted_late_count"`
	LoadMinutes        int        `json:"load_minutes"`
	CapacityMultiplier float64    `json:"capacity_multiplier"`
	NearestDeliveryAt  *time.Time `json:"nearest_delivery_at,omitempty"`
	TopRiskScore       int        `json:"top_risk_score"`
}

type ProductionPlanningRecommendationDTO struct {
	ID                string  `json:"id"`
	Type              string  `json:"type"`
	Status            string  `json:"status"`
	Reason            string  `json:"reason"`
	OrderID           int64   `json:"order_id"`
	OrderItemID       int64   `json:"order_item_id"`
	InProgressID      int64   `json:"in_progress_id"`
	AssignedUserID    *int64  `json:"assigned_user_id,omitempty"`
	AssignedName      *string `json:"assigned_name,omitempty"`
	TargetUserID      int64   `json:"target_user_id"`
	TargetName        string  `json:"target_name"`
	ExpectedRiskDelta int     `json:"expected_risk_delta,omitempty"`
}

type ProductionPlanningApplyRecommendationRequestDTO struct {
	AdminNote *string `json:"admin_note,omitempty"`
}

type ProductionPlanningApplyRecommendationResultDTO struct {
	Recommendation *ProductionPlanningRecommendationDTO `json:"recommendation"`
	Assignment     *OrderItemProcessInProgressDTO       `json:"assignment,omitempty"`
}
