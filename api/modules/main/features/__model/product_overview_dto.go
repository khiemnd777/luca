package model

import "time"

type ProductOverviewScopeDTO struct {
	RootProductID    int     `json:"root_product_id"`
	RootProductName  *string `json:"root_product_name,omitempty"`
	IsTemplate       bool    `json:"is_template"`
	IncludesVariants bool    `json:"includes_variants"`
	VariantCount     int     `json:"variant_count"`
	ScopedProductIDs []int   `json:"scoped_product_ids,omitempty"`
	ScopeLabel       string  `json:"scope_label"`
}

type ProductOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	OpenQuantity       int `json:"open_quantity"`
	OpenProcesses      int `json:"open_processes"`
	CompletionPercent  int `json:"completion_percent"`
	LifetimeOrders     int `json:"lifetime_orders"`
	LifetimeQuantity   int `json:"lifetime_quantity"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
}

type ProductOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ProductOverviewProcessLoadDTO struct {
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

type ProductOverviewRecentOrderDTO struct {
	OrderID            int64      `json:"order_id"`
	OrderCode          *string    `json:"order_code,omitempty"`
	Status             *string    `json:"status,omitempty"`
	Quantity           int        `json:"quantity"`
	CurrentProcessName *string    `json:"current_process_name,omitempty"`
	LatestCheckpointAt *time.Time `json:"latest_checkpoint_at,omitempty"`
}

type ProductOverviewDTO struct {
	Scope                *ProductOverviewScopeDTO                  `json:"scope,omitempty"`
	Summary              *ProductOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*ProductOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*ProductOverviewProcessLoadDTO          `json:"process_load,omitempty"`
	RecentOrders         []*ProductOverviewRecentOrderDTO          `json:"recent_orders,omitempty"`
}
