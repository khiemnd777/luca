package model

type SectionCatalogOverviewCoverageDTO struct {
	TotalSections      int    `json:"total_sections"`
	SectionsWithOrders int    `json:"sections_with_orders"`
	ScopeLabel         string `json:"scope_label"`
}

type SectionCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	OpenProcesses      int `json:"open_processes"`
	CompletionPercent  int `json:"completion_percent"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
}

type SectionCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type SectionCatalogOverviewSectionLoadDTO struct {
	SectionID          int     `json:"section_id"`
	SectionName        *string `json:"section_name,omitempty"`
	LeaderName         *string `json:"leader_name,omitempty"`
	ActiveOrders       int     `json:"active_orders"`
	InProductionOrders int     `json:"in_production_orders"`
	OpenProcesses      int     `json:"open_processes"`
	CompletionPercent  int     `json:"completion_percent"`
}

type SectionCatalogOverviewDTO struct {
	Coverage             *SectionCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *SectionCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*SectionCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	SectionLoads         []*SectionCatalogOverviewSectionLoadDTO          `json:"section_loads,omitempty"`
}
