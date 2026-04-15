package model

type OrderAdvancedSearchFilter struct {
	DepartmentID  *int    `json:"department_id,omitempty"`
	CategoryIDs   []int   `json:"category_ids,omitempty"`
	ProductIDs    []int   `json:"product_ids,omitempty"`
	OrderCode     *string `json:"order_code,omitempty"`
	DentistName   *string `json:"dentist_name,omitempty"`
	PatientName   *string `json:"patient_name,omitempty"`
	CreatedYear   *int    `json:"created_year,omitempty"`
	CreatedMonth  *int    `json:"created_month,omitempty"`
	DeliveryYear  *int    `json:"delivery_year,omitempty"`
	DeliveryMonth *int    `json:"delivery_month,omitempty"`
}

type OrderAdvancedSearchQuery struct {
	OrderAdvancedSearchFilter
	Limit     int     `json:"limit"`
	Page      int     `json:"page"`
	Offset    int     `json:"offset"`
	OrderBy   *string `json:"order_by,omitempty"`
	Direction string  `json:"direction,omitempty"`
}

type OrderAdvancedSearchStatusBreakdownDTO struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type OrderAdvancedSearchTopProductDTO struct {
	ProductID     *int    `json:"product_id,omitempty"`
	ProductCode   *string `json:"product_code,omitempty"`
	ProductName   *string `json:"product_name,omitempty"`
	OrderCount    int     `json:"order_count"`
	TotalQuantity int     `json:"total_quantity"`
	TotalSales    float64 `json:"total_sales"`
	TotalRevenue  float64 `json:"total_revenue"`
}

type OrderAdvancedSearchReportSummaryDTO struct {
	TotalOrders       int     `json:"total_orders"`
	TotalValue        float64 `json:"total_value"`
	AverageOrderValue float64 `json:"average_order_value"`
	RemakeOrders      int     `json:"remake_orders"`
	TotalSales        float64 `json:"total_sales"`
	TotalRevenue      float64 `json:"total_revenue"`
}

type OrderAdvancedSearchReportBreakdownDTO struct {
	StatusBreakdown []*OrderAdvancedSearchStatusBreakdownDTO `json:"status_breakdown,omitempty"`
	TopProducts     []*OrderAdvancedSearchTopProductDTO      `json:"top_products,omitempty"`
}

type OrderAdvancedSearchReportDTO struct {
	OrderAdvancedSearchReportSummaryDTO
	OrderAdvancedSearchReportBreakdownDTO
}
