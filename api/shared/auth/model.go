package auth

type AuthTokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type DepartmentSelectionOption struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Slug         *string `json:"slug,omitempty"`
	Active       bool    `json:"active"`
	Logo         *string `json:"logo,omitempty"`
	LogoRect     *string `json:"logo_rect,omitempty"`
	Address      *string `json:"address,omitempty"`
	PhoneNumber  *string `json:"phone_number,omitempty"`
	PhoneNumber2 *string `json:"phone_number_2,omitempty"`
	PhoneNumber3 *string `json:"phone_number_3,omitempty"`
	Email        *string `json:"email,omitempty"`
	Tax          *string `json:"tax,omitempty"`
}

type AuthLoginResponse struct {
	AccessToken                 string                       `json:"accessToken,omitempty"`
	RefreshToken                string                       `json:"refreshToken,omitempty"`
	RequiresDepartmentSelection bool                         `json:"requiresDepartmentSelection"`
	SelectionToken              string                       `json:"selectionToken,omitempty"`
	Departments                 []*DepartmentSelectionOption `json:"departments,omitempty"`
}
