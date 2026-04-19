package model

type ClinicCatalogOverviewCoverageDTO struct {
	TotalClinics      int    `json:"total_clinics"`
	ClinicsWithOrders int    `json:"clinics_with_orders"`
	ScopeLabel        string `json:"scope_label"`
}

type ClinicCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type ClinicCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ClinicCatalogOverviewClinicLoadDTO struct {
	ClinicID           int     `json:"clinic_id"`
	ClinicName         *string `json:"clinic_name,omitempty"`
	OpenOrders         int     `json:"open_orders"`
	InProductionOrders int     `json:"in_production_orders"`
	CompletedOrders    int     `json:"completed_orders"`
	LifetimeOrders     int     `json:"lifetime_orders"`
	CompletionPercent  int     `json:"completion_percent"`
}

type ClinicCatalogOverviewDTO struct {
	Coverage             *ClinicCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *ClinicCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*ClinicCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	ClinicLoads          []*ClinicCatalogOverviewClinicLoadDTO           `json:"clinic_loads,omitempty"`
}
