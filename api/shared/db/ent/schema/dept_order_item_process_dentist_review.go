package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type OrderItemProcessDentistReview struct {
	ent.Schema
}

func (OrderItemProcessDentistReview) Fields() []ent.Field {
	return []ent.Field{
		field.Int64("id").
			Immutable().
			Unique().
			SchemaType(map[string]string{
				"postgres": "bigserial",
			}),
		field.Int64("order_id").
			Optional().
			Nillable(),
		field.Int64("order_item_id"),
		field.String("order_item_code").
			Optional().
			Nillable(),
		field.Int("product_id").
			Optional().
			Nillable(),
		field.String("product_code").
			Optional().
			Nillable(),
		field.String("product_name").
			Optional().
			Nillable(),
		field.Int64("process_id").
			Optional().
			Nillable(),
		field.String("process_name").
			Optional().
			Nillable(),
		field.Int64("in_progress_id").
			Optional().
			Nillable(),
		field.String("status").
			Default("pending"),
		field.String("request_note"),
		field.String("response_note").
			Optional().
			Nillable(),
		field.Int("requested_by").
			Optional().
			Nillable(),
		field.Int("resolved_by").
			Optional().
			Nillable(),
		field.Time("requested_at").
			Default(time.Now),
		field.Time("resolved_at").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (OrderItemProcessDentistReview) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("order_item", OrderItem.Type).
			Ref("dentist_reviews").
			Field("order_item_id").
			Required().
			Unique(),
		edge.From("process", OrderItemProcess.Type).
			Ref("dentist_reviews").
			Field("process_id").
			Unique(),
		edge.From("in_progress", OrderItemProcessInProgress.Type).
			Ref("dentist_reviews").
			Field("in_progress_id").
			Unique(),
	}
}

func (OrderItemProcessDentistReview) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id", "status"),
		index.Fields("order_item_id", "status"),
		index.Fields("order_item_id", "product_id", "status"),
		index.Fields("process_id", "status"),
		index.Fields("in_progress_id"),
	}
}
