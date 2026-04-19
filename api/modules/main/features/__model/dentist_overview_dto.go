package model

import "time"

type DentistOverviewScopeDTO struct {
	DentistID   int     `json:"dentist_id"`
	DentistName *string `json:"dentist_name,omitempty"`
	PhoneNumber *string `json:"phone_number,omitempty"`
	ClinicCount int     `json:"clinic_count"`
	ScopeLabel  string  `json:"scope_label"`
}

type DentistOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type DentistOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type DentistOverviewProcessLoadDTO struct {
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

type DentistOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	ClinicName         *string    `json:"clinic_name,omitempty"`
	PatientName        *string    `json:"patient_name,omitempty"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type DentistOverviewDTO struct {
	Scope                *DentistOverviewScopeDTO                  `json:"scope,omitempty"`
	Summary              *DentistOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*DentistOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*DentistOverviewProcessLoadDTO          `json:"process_load,omitempty"`
	RecentOrders         []*DentistOverviewRecentOrderDTO          `json:"recent_orders,omitempty"`
}
