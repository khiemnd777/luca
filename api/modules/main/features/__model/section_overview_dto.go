package model

import "time"

type SectionOverviewScopeDTO struct {
	SectionID   int     `json:"section_id"`
	SectionName *string `json:"section_name,omitempty"`
	LeaderName  *string `json:"leader_name,omitempty"`
	ScopeLabel  string  `json:"scope_label"`
}

type SectionOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	OpenProcesses      int `json:"open_processes"`
	CompletionPercent  int `json:"completion_percent"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
}

type SectionOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type SectionOverviewProcessLoadDTO struct {
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

type SectionOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	ClinicName         *string    `json:"clinic_name,omitempty"`
	PatientName        *string    `json:"patient_name,omitempty"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type SectionOverviewDTO struct {
	Scope                *SectionOverviewScopeDTO                  `json:"scope,omitempty"`
	Summary              *SectionOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*SectionOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*SectionOverviewProcessLoadDTO          `json:"process_load,omitempty"`
	RecentOrders         []*SectionOverviewRecentOrderDTO          `json:"recent_orders,omitempty"`
}
