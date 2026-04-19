package model

type PatientCatalogOverviewCoverageDTO struct {
	TotalPatients      int    `json:"total_patients"`
	PatientsWithOrders int    `json:"patients_with_orders"`
	ScopeLabel         string `json:"scope_label"`
}

type PatientCatalogOverviewSummaryDTO struct {
	OpenOrders         int `json:"open_orders"`
	InProductionOrders int `json:"in_production_orders"`
	CompletedOrders    int `json:"completed_orders"`
	RemakeOrders       int `json:"remake_orders"`
	LifetimeOrders     int `json:"lifetime_orders"`
	CompletionPercent  int `json:"completion_percent"`
}

type PatientCatalogOverviewOrderStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type PatientCatalogOverviewPatientLoadDTO struct {
	PatientID          int     `json:"patient_id"`
	PatientName        *string `json:"patient_name,omitempty"`
	OpenOrders         int     `json:"open_orders"`
	InProductionOrders int     `json:"in_production_orders"`
	CompletedOrders    int     `json:"completed_orders"`
	LifetimeOrders     int     `json:"lifetime_orders"`
	CompletionPercent  int     `json:"completion_percent"`
}

type PatientCatalogOverviewDTO struct {
	Coverage             *PatientCatalogOverviewCoverageDTO               `json:"coverage,omitempty"`
	Summary              *PatientCatalogOverviewSummaryDTO                `json:"summary,omitempty"`
	OrderStatusBreakdown []*PatientCatalogOverviewOrderStatusBreakdownDTO `json:"order_status_breakdown,omitempty"`
	PatientLoads         []*PatientCatalogOverviewPatientLoadDTO          `json:"patient_loads,omitempty"`
}
