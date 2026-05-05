package model

import "time"

type OrderItemProcessDentistReviewDTO struct {
	ID            int64      `json:"id,omitempty"`
	OrderID       *int64     `json:"order_id,omitempty"`
	OrderItemID   int64      `json:"order_item_id,omitempty"`
	OrderItemCode *string    `json:"order_item_code,omitempty"`
	ProductID     *int       `json:"product_id,omitempty"`
	ProductCode   *string    `json:"product_code,omitempty"`
	ProductName   *string    `json:"product_name,omitempty"`
	ProcessID     *int64     `json:"process_id,omitempty"`
	ProcessName   *string    `json:"process_name,omitempty"`
	InProgressID  *int64     `json:"in_progress_id,omitempty"`
	Status        string     `json:"status,omitempty"`
	RequestNote   string     `json:"request_note,omitempty"`
	ResponseNote  *string    `json:"response_note,omitempty"`
	RequestedBy   *int       `json:"requested_by,omitempty"`
	ResolvedBy    *int       `json:"resolved_by,omitempty"`
	RequestedAt   time.Time  `json:"requested_at,omitempty"`
	ResolvedAt    *time.Time `json:"resolved_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at,omitempty"`
}

type OrderItemProcessDentistReviewResolveDTO struct {
	Result string  `json:"result"`
	Note   *string `json:"note"`
}
