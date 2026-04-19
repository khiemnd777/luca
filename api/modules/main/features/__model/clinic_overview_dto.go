package model

import "time"

type ClinicOverviewScopeDTO struct {
	ClinicID     int     `json:"clinic_id"`
	ClinicName   *string `json:"clinic_name,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	DentistCount int     `json:"dentist_count"`
	PatientCount int     `json:"patient_count"`
	ScopeLabel   string  `json:"scope_label"`
}

type ClinicOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type ClinicOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ClinicOverviewProcessLoadDTO struct {
	ProcessName  string `json:"process_name"`
	StepNumber   int    `json:"step_number"`
	Waiting      int    `json:"waiting"`
	InProgress   int    `json:"in_progress"`
	QC           int    `json:"qc"`
	Rework       int    `json:"rework"`
	Completed    int    `json:"completed"`
	Total        int    `json:"total"`
	ActiveOrders int    `json:"active_orders"`
}

type ClinicOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	PatientName        *string    `json:"patient_name,omitempty"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type ClinicOverviewDTO struct {
	Scope                *ClinicOverviewScopeDTO                  `json:"scope,omitempty"`
	Summary              *ClinicOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*ClinicOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*ClinicOverviewProcessLoadDTO          `json:"process_load,omitempty"`
	RecentOrders         []*ClinicOverviewRecentOrderDTO          `json:"recent_orders,omitempty"`
}
