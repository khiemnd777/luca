package model

type DentistCatalogOverviewCoverageDTO struct {
	TotalDentists      int    `json:"total_dentists"`
	DentistsWithOrders int    `json:"dentists_with_orders"`
	ScopeLabel         string `json:"scope_label"`
}

type DentistCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type DentistCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type DentistCatalogOverviewDentistLoadDTO struct {
	DentistID          int     `json:"dentist_id"`
	DentistName        *string `json:"dentist_name,omitempty"`
	OpenOrders         int     `json:"open_orders"`
	InProductionOrders int     `json:"in_production_orders"`
	CompletedOrders    int     `json:"completed_orders"`
	LifetimeOrders     int     `json:"lifetime_orders"`
	CompletionPercent  int     `json:"completion_percent"`
}

type DentistCatalogOverviewDTO struct {
	Coverage             *DentistCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *DentistCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*DentistCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	DentistLoads         []*DentistCatalogOverviewDentistLoadDTO          `json:"dentist_loads,omitempty"`
}
