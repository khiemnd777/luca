package catalogrefcode

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Module string

const (
	ModuleBrandName       Module = "brand_name"
	ModuleRawMaterial     Module = "raw_material"
	ModuleTechnique       Module = "technique"
	ModuleRestorationType Module = "restoration_type"
)

type QueryRunner interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type Scope struct {
	DepartmentID int
	Module       Module
}

type Service interface {
	Next(ctx context.Context, runner QueryRunner, scope Scope) (string, error)
	Normalize(raw *string) *string
	IsUniqueViolation(err error) bool
}

type service struct{}

func NewService() Service {
	return &service{}
}

func (s *service) Normalize(raw *string) *string {
	if raw == nil {
		return nil
	}
	value := strings.ToLower(strings.TrimSpace(*raw))
	if value == "" {
		return nil
	}
	return &value
}

func (s *service) Next(ctx context.Context, runner QueryRunner, scope Scope) (string, error) {
	_ = ctx
	_ = runner
	if _, ok := map[Module]struct{}{
		ModuleBrandName:       {},
		ModuleRawMaterial:     {},
		ModuleTechnique:       {},
		ModuleRestorationType: {},
	}[scope.Module]; !ok {
		return "", fmt.Errorf("unsupported catalog ref module %q", scope.Module)
	}
	if scope.DepartmentID <= 0 {
		return "", fmt.Errorf("invalid department id %d", scope.DepartmentID)
	}
	return uuid.NewString(), nil
}

func (s *service) IsUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "unique constraint")
}
