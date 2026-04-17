package model

type MaterialCatalogOverviewCoverageDTO struct {
	TotalCatalogMaterials int    `json:"total_catalog_materials"`
	MaterialsWithOrders   int    `json:"materials_with_orders"`
	ScopeLabel            string `json:"scope_label"`
}

type MaterialCatalogOverviewSummaryDTO struct {
	OpenOrders            int `json:"open_orders"`
	InProductionOrders    int `json:"in_production_orders"`
	OnLoanQuantity        int `json:"on_loan_quantity"`
	OpenProcesses         int `json:"open_processes"`
	CompletionPercent     int `json:"completion_percent"`
	LifetimeOrders        int `json:"lifetime_orders"`
	ReturnedOrders        int `json:"returned_orders"`
	PartialReturnedOrders int `json:"partial_returned_orders"`
}

type MaterialCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MaterialCatalogOverviewMaterialStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MaterialCatalogOverviewProcessLoadDTO struct {
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

type MaterialCatalogOverviewDTO struct {
	Coverage                *MaterialCatalogOverviewCoverageDTO                  `json:"coverage,omitempty"`
	Summary                 *MaterialCatalogOverviewSummaryDTO                   `json:"summary,omitempty"`
	OrderStatusBreakdown    []*MaterialCatalogOverviewOrderStatusBreakdownDTO    `json:"order_status_breakdown,omitempty"`
	MaterialStatusBreakdown []*MaterialCatalogOverviewMaterialStatusBreakdownDTO `json:"material_status_breakdown,omitempty"`
	ProcessLoad             []*MaterialCatalogOverviewProcessLoadDTO             `json:"process_load,omitempty"`
}
