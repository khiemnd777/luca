package table

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

func TestTableListRejectsMaliciousCustomFieldOrderKeyBeforeCount(t *testing.T) {
	countCalls := 0
	orderBy := "custom_fields.name') DESC, pg_sleep(5)--"
	q := tableOrderTestQuery{countCalls: &countCalls}

	_, err := TableList[tableOrderTestEntity, tableOrderTestEntity](
		context.Background(),
		q,
		TableQuery{OrderBy: &orderBy, Direction: "asc", Limit: 20},
		"products",
		"id",
		"created_at",
		nil,
	)
	if !errors.Is(err, orderby.ErrInvalidOrderBy) {
		t.Fatalf("TableList() error = %v, want ErrInvalidOrderBy", err)
	}
	if countCalls != 0 {
		t.Fatalf("TableList() Count calls = %d, want 0", countCalls)
	}
}

func TestTableListV2RejectsMaliciousCustomFieldOrderKeyBeforeCount(t *testing.T) {
	countCalls := 0
	orderBy := "custom_fields.name') DESC, pg_sleep(5)--"
	q := tableOrderTestQuery{countCalls: &countCalls}

	_, err := TableListV2[tableOrderTestEntity, tableOrderTestEntity](
		context.Background(),
		q,
		TableQuery{OrderBy: &orderBy, Direction: "asc", Limit: 20},
		"products",
		"id",
		"created_at",
		func(q tableOrderTestQuery) tableOrderTestQuery { return q },
		nil,
	)
	if !errors.Is(err, orderby.ErrInvalidOrderBy) {
		t.Fatalf("TableListV2() error = %v, want ErrInvalidOrderBy", err)
	}
	if countCalls != 0 {
		t.Fatalf("TableListV2() Count calls = %d, want 0", countCalls)
	}
}

type testOrderOption func(*sql.Selector)

type tableOrderTestEntity struct{}

type tableOrderTestQuery struct {
	countCalls *int
}

func (q tableOrderTestQuery) Clone() tableOrderTestQuery {
	return q
}

func (q tableOrderTestQuery) Count(context.Context) (int, error) {
	(*q.countCalls)++
	return 0, nil
}

func (q tableOrderTestQuery) Limit(int) tableOrderTestQuery {
	return q
}

func (q tableOrderTestQuery) Offset(int) tableOrderTestQuery {
	return q
}

func (q tableOrderTestQuery) Order(...testOrderOption) tableOrderTestQuery {
	return q
}

func (q tableOrderTestQuery) All(context.Context) ([]*tableOrderTestEntity, error) {
	return nil, nil
}
