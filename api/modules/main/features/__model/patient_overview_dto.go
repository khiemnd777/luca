package model

import "time"

type PatientOverviewScopeDTO struct {
	PatientID   int     `json:"patient_id"`
	PatientName *string `json:"patient_name,omitempty"`
	PhoneNumber *string `json:"phone_number,omitempty"`
	ClinicCount int     `json:"clinic_count"`
	ScopeLabel  string  `json:"scope_label"`
}

type PatientOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type PatientOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type PatientOverviewProcessLoadDTO struct {
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

type PatientOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	ClinicName         *string    `json:"clinic_name,omitempty"`
	DentistName        *string    `json:"dentist_name,omitempty"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type PatientOverviewDTO struct {
	Scope                *PatientOverviewScopeDTO                  `json:"scope,omitempty"`
	Summary              *PatientOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*PatientOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*PatientOverviewProcessLoadDTO          `json:"process_load,omitempty"`
	RecentOrders         []*PatientOverviewRecentOrderDTO          `json:"recent_orders,omitempty"`
}
