package notificationModel

import "time"

type PushSubscriptionUpsertRequest struct {
	Endpoint        string `json:"endpoint"`
	P256DH          string `json:"p256dh"`
	Auth            string `json:"auth"`
	Platform        string `json:"platform"`
	DeviceLabel     string `json:"device_label"`
	UserAgent       string `json:"user_agent"`
	InstallMode     string `json:"install_mode"`
	PermissionState string `json:"permission_state"`
}

type PushSubscription struct {
	ID              int        `json:"id"`
	UserID          int        `json:"user_id"`
	Endpoint        string     `json:"endpoint"`
	Platform        string     `json:"platform"`
	DeviceLabel     string     `json:"device_label,omitempty"`
	UserAgent       string     `json:"user_agent,omitempty"`
	InstallMode     string     `json:"install_mode"`
	PermissionState string     `json:"permission_state"`
	LastSeenAt      time.Time  `json:"last_seen_at"`
	LastSentAt      *time.Time `json:"last_sent_at,omitempty"`
	LastErrorAt     *time.Time `json:"last_error_at,omitempty"`
	LastError       *string    `json:"last_error,omitempty"`
	DisabledAt      *time.Time `json:"disabled_at,omitempty"`
	RevokedAt       *time.Time `json:"revoked_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type PushPublicConfig struct {
	Enabled   bool   `json:"enabled"`
	PublicKey string `json:"public_key,omitempty"`
	Subject   string `json:"subject,omitempty"`
}

type PushNotificationPayload struct {
	NotificationID int            `json:"notification_id"`
	Type           string         `json:"type"`
	Title          string         `json:"title"`
	Body           string         `json:"body"`
	Data           map[string]any `json:"data,omitempty"`
	DeepLink       string         `json:"deep_link,omitempty"`
	Topic          string         `json:"topic,omitempty"`
}
