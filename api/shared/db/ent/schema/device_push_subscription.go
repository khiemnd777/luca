package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type DevicePushSubscription struct {
	ent.Schema
}

func (DevicePushSubscription) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id"),
		field.String("endpoint").NotEmpty().Unique(),
		field.String("p256dh").NotEmpty(),
		field.String("auth").NotEmpty(),
		field.String("platform").Default("unknown"),
		field.String("device_label").Optional().Nillable(),
		field.String("user_agent").Optional().Nillable(),
		field.String("install_mode").Default("browser"),
		field.String("permission_state").Default("default"),
		field.Time("last_seen_at").Default(time.Now),
		field.Time("last_sent_at").Optional().Nillable(),
		field.Time("last_error_at").Optional().Nillable(),
		field.String("last_error").Optional().Nillable(),
		field.Time("disabled_at").Optional().Nillable(),
		field.Time("revoked_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (DevicePushSubscription) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("user_id", "disabled_at", "revoked_at"),
		index.Fields("user_id", "updated_at"),
	}
}
