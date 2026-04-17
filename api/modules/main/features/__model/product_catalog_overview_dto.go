package model

type ProductCatalogOverviewCoverageDTO struct {
	TotalCatalogProducts int    `json:"total_catalog_products"`
	ProductsWithOrders   int    `json:"products_with_orders"`
	ScopeLabel           string `json:"scope_label"`
}

type ProductCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	OpenQuantity       int `json:"open_quantity"`
	OpenProcesses      int `json:"open_processes"`
	CompletionPercent  int `json:"completion_percent"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
}

type ProductCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ProductCatalogOverviewProcessLoadDTO struct {
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

type ProductCatalogOverviewDTO struct {
	Coverage             *ProductCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *ProductCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*ProductCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoad          []*ProductCatalogOverviewProcessLoadDTO          `json:"process_load,omitempty"`
}
