package dbutils

import (
	"context"
	"errors"
	"testing"

	"entgo.io/ent/dialect/sql"
	"github.com/khiemnd777/noah_api/shared/utils/orderby"
)

func TestBuildSQLOptionsAcceptsValidCustomFieldOrderKey(t *testing.T) {
	opts, err := buildSQLOptions[testOrderOption]("products", "custom_fields.pricing.tier-1", false, "id")
	if err != nil {
		t.Fatalf("buildSQLOptions() error = %v, want nil", err)
	}
	if len(opts) != 2 {
		t.Fatalf("buildSQLOptions() len = %d, want 2", len(opts))
	}
}

func TestBuildSQLOptionsRejectsMaliciousCustomFieldOrderKey(t *testing.T) {
	_, err := buildSQLOptions[testOrderOption]("products", "custom_fields.name') DESC, pg_sleep(5)--", false, "id")
	if !errors.Is(err, orderby.ErrInvalidOrderBy) {
		t.Fatalf("buildSQLOptions() error = %v, want ErrInvalidOrderBy", err)
	}
}

func TestBuildSQLOptionsPreservesNormalOrderFields(t *testing.T) {
	opts, err := buildSQLOptions[testOrderOption]("products", "created_at", true, "id")
	if err != nil {
		t.Fatalf("buildSQLOptions() error = %v, want nil", err)
	}
	if len(opts) != 2 {
		t.Fatalf("buildSQLOptions() len = %d, want 2", len(opts))
	}
}

func TestSearchRejectsMaliciousCustomFieldOrderKeyBeforeCount(t *testing.T) {
	countCalls := 0
	orderBy := "custom_fields.name') DESC, pg_sleep(5)--"
	q := searchOrderTestQuery{countCalls: &countCalls}

	_, err := Search[searchOrderTestEntity, searchOrderTestEntity](
		context.Background(),
		q,
		nil,
		SearchQuery{OrderBy: &orderBy, Direction: "asc", Limit: 20},
		"products",
		"id",
		"created_at",
		func(...testPredicate) testPredicate { return nil },
		nil,
	)
	if !errors.Is(err, orderby.ErrInvalidOrderBy) {
		t.Fatalf("Search() error = %v, want ErrInvalidOrderBy", err)
	}
	if countCalls != 0 {
		t.Fatalf("Search() Count calls = %d, want 0", countCalls)
	}
}

type testOrderOption func(*sql.Selector)

type testPredicate func(*sql.Selector)

type searchOrderTestEntity struct{}

type searchOrderTestQuery struct {
	countCalls *int
}

func (q searchOrderTestQuery) Clone() searchOrderTestQuery {
	return q
}

func (q searchOrderTestQuery) Count(context.Context) (int, error) {
	(*q.countCalls)++
	return 0, nil
}

func (q searchOrderTestQuery) Where(...testPredicate) searchOrderTestQuery {
	return q
}

func (q searchOrderTestQuery) Limit(int) searchOrderTestQuery {
	return q
}

func (q searchOrderTestQuery) Offset(int) searchOrderTestQuery {
	return q
}

func (q searchOrderTestQuery) Order(...testOrderOption) searchOrderTestQuery {
	return q
}

func (q searchOrderTestQuery) All(context.Context) ([]*searchOrderTestEntity, error) {
	return nil, nil
}
