package model

type StaffOverviewRevenueWindowDTO struct {
	Key          string  `json:"key"`
	Label        string  `json:"label"`
	Months       int     `json:"months"`
	OrderCount   int     `json:"order_count"`
	TotalRevenue float64 `json:"total_revenue"`
}

type StaffOverviewSummaryDTO struct {
	LifetimeOrders    int     `json:"lifetime_orders"`
	LifetimeRevenue   float64 `json:"lifetime_revenue"`
	AverageOrderValue float64 `json:"average_order_value"`
	RecentOrderCount  int     `json:"recent_order_count"`
	RecentRevenue     float64 `json:"recent_revenue"`
}

type StaffOverviewDTO struct {
	StaffID        int64                            `json:"staff_id"`
	RevenueWindows []*StaffOverviewRevenueWindowDTO `json:"revenue_windows,omitempty"`
	Summary        *StaffOverviewSummaryDTO         `json:"summary,omitempty"`
}
