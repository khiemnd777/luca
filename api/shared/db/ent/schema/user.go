package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("email").Optional(),
		field.String("password").Sensitive(),
		field.String("name").Default(""),
		field.String("phone").Optional(),
		field.Bool("active").Default(true),
		field.Time("deleted_at").
			Optional().
			Nillable(),
		field.String("avatar").Optional(),   // Avatar URL from Google, Facebook, ...
		field.String("provider").Optional(), // 'google', 'facebook', ...
		field.String("provider_id").Optional(),
		field.String("ref_code").Optional().Nillable(), // Ref. code
		field.String("qr_code").Optional().Nillable(),  // User QR code
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (User) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("phone").
			Unique().
			StorageKey("users_phone_active_key").
			Annotations(entsql.IndexWhere("deleted_at IS NULL")),
		index.Fields("email").
			Unique().
			StorageKey("users_email_active_key").
			Annotations(entsql.IndexWhere("deleted_at IS NULL AND email IS NOT NULL AND email <> ''")),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("roles", Role.Type),
		edge.To("refresh_tokens", RefreshToken.Type),
		edge.To("folders", Folder.Type),
		edge.To("photos", Photo.Type),
		edge.To("attributes", Attribute.Type),
		edge.To("attribute_options", AttributeOption.Type),
		edge.To("attribute_option_values", AttributeOptionValue.Type),
		edge.To("dept_memberships", DepartmentMember.Type),
		edge.To("staff", Staff.Type).Unique(),
	}
}
