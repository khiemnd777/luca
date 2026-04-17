package model

import "time"

type MaterialOverviewScopeDTO struct {
	MaterialID   int     `json:"material_id"`
	MaterialCode *string `json:"material_code,omitempty"`
	MaterialName *string `json:"material_name,omitempty"`
	Type         *string `json:"type,omitempty"`
	IsImplant    bool    `json:"is_implant"`
	ScopeLabel   string  `json:"scope_label"`
}

type MaterialOverviewSummaryDTO struct {
	OpenOrders            int `json:"open_orders"`
	InProductionOrders    int `json:"in_production_orders"`
	OnLoanQuantity        int `json:"on_loan_quantity"`
	OpenProcesses         int `json:"open_processes"`
	CompletionPercent     int `json:"completion_percent"`
	LifetimeOrders        int `json:"lifetime_orders"`
	ReturnedOrders        int `json:"returned_orders"`
	PartialReturnedOrders int `json:"partial_returned_orders"`
}

type MaterialOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MaterialOverviewMaterialStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MaterialOverviewProcessLoadDTO struct {
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

type MaterialOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	OrderItemID        int64      `json:"order_item_id"`
	OrderItemCode      *string    `json:"order_item_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	MaterialStatus     *string    `json:"material_status,omitempty"`
	Quantity           int        `json:"quantity"`
	ClinicName         *string    `json:"clinic_name,omitempty"`
	PatientName        *string    `json:"patient_name,omitempty"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type MaterialOverviewDTO struct {
	Scope                   *MaterialOverviewScopeDTO                     `json:"scope,omitempty"`
	Summary                 *MaterialOverviewSummaryDTO                   `json:"summary,omitempty"`
	OrderStatusBreakdown    []*MaterialOverviewOrderStatusBreakdownDTO    `json:"order_status_breakdown,omitempty"`
	MaterialStatusBreakdown []*MaterialOverviewMaterialStatusBreakdownDTO `json:"material_status_breakdown,omitempty"`
	ProcessLoad             []*MaterialOverviewProcessLoadDTO             `json:"process_load,omitempty"`
	RecentOrders            []*MaterialOverviewRecentOrderDTO             `json:"recent_orders,omitempty"`
}
