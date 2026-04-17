package model

type ProcessCatalogOverviewCoverageDTO struct {
	TotalProcesses      int    `json:"total_processes"`
	ProcessesWithOrders int    `json:"processes_with_orders"`
	ScopeLabel          string `json:"scope_label"`
}

type ProcessCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	OpenProcesses      int `json:"open_processes"`
	CompletionPercent  int `json:"completion_percent"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
}

type ProcessCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ProcessCatalogOverviewProcessLoadDTO struct {
	ProcessID          int     `json:"process_id"`
	ProcessCode        *string `json:"process_code,omitempty"`
	ProcessName        *string `json:"process_name,omitempty"`
	SectionName        *string `json:"section_name,omitempty"`
	ActiveOrders       int     `json:"active_orders"`
	InProductionOrders int     `json:"in_production_orders"`
	OpenProcesses      int     `json:"open_processes"`
	CompletionPercent  int     `json:"completion_percent"`
}

type ProcessCatalogOverviewDTO struct {
	Coverage             *ProcessCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *ProcessCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*ProcessCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ProcessLoads         []*ProcessCatalogOverviewProcessLoadDTO          `json:"process_loads,omitempty"`
}
