package model

import "time"

type DepartmentDTO struct {
	ID              int       `json:"id,omitempty"`
	Slug            *string   `json:"slug,omitempty"`
	Active          bool      `json:"active,omitempty"`
	Name            string    `json:"name,omitempty"`
	Logo            *string   `json:"logo,omitempty"`
	LogoRect        *string   `json:"logo_rect,omitempty"`
	Address         *string   `json:"address,omitempty"`
	PhoneNumber     *string   `json:"phone_number,omitempty"`
	PhoneNumber2    *string   `json:"phone_number_2,omitempty"`
	PhoneNumber3    *string   `json:"phone_number_3,omitempty"`
	Email           *string   `json:"email,omitempty"`
	Tax             *string   `json:"tax,omitempty"`
	ParentID        *int      `json:"parent_id,omitempty"`
	AdministratorID *int      `json:"administrator_id,omitempty"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}
