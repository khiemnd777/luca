package model

import "time"

type OrderFileDTO struct {
	ID          int64     `json:"id"`
	OrderID     int64     `json:"order_id"`
	OrderItemID int64     `json:"order_item_id"`
	FileName    string    `json:"file_name"`
	FileURL     string    `json:"file_url"`
	FileType    string    `json:"file_type"`
	Format      string    `json:"format"`
	MimeType    string    `json:"mime_type"`
	SizeBytes   int64     `json:"size_bytes"`
	CreatedAt   time.Time `json:"created_at"`
}
