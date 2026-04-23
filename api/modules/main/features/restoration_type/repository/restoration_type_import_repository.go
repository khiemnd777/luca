package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	catalogrefcode "github.com/khiemnd777/noah_api/modules/main/features/catalog_ref_code"
	"github.com/lib/pq"
)

type RestorationTypeImportRepository interface {
	GetCategoryByName(ctx context.Context, deptID int, name string) (int, string, error)
	GetOrCreateRestorationType(ctx context.Context, deptID int, categoryID int, categoryName string, code string, name string) (id int, resolvedCode string, created bool, err error)
}

type restorationTypeImportRepo struct {
	db      *sql.DB
	codeSvc catalogrefcode.Service
}

func NewRestorationTypeImportRepository(db *sql.DB, codeSvc catalogrefcode.Service) RestorationTypeImportRepository {
	return &restorationTypeImportRepo{db: db, codeSvc: codeSvc}
}

type sqlRunner interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (r *restorationTypeImportRepo) runner(ctx context.Context) sqlRunner {
	if tx := txFromContext(ctx); tx != nil {
		return tx
	}
	return r.db
}

func (r *restorationTypeImportRepo) GetCategoryByName(ctx context.Context, deptID int, name string) (int, string, error) {
	query := `
		SELECT id, name
		FROM categories
		WHERE department_id = $1 AND name = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	var id int
	var categoryName string
	runner := r.runner(ctx)
	return id, categoryName, runner.QueryRowContext(ctx, query, deptID, name).Scan(&id, &categoryName)
}

func (r *restorationTypeImportRepo) GetOrCreateRestorationType(ctx context.Context, deptID int, categoryID int, categoryName string, code string, name string) (int, string, bool, error) {
	codePtr := r.codeSvc.Normalize(&code)
	if codePtr == nil {
		nextCode, err := r.codeSvc.Next(ctx, r.runner(ctx), catalogrefcode.Scope{
			DepartmentID: deptID,
			Module:       catalogrefcode.ModuleRestorationType,
		})
		if err != nil {
			return 0, "", false, err
		}
		codePtr = &nextCode
	}

	id, err := r.selectByCode(ctx, deptID, *codePtr)
	if err == nil && id > 0 {
		return id, *codePtr, false, nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, "", false, err
	}

	id, err = r.selectByCategoryAndName(ctx, deptID, categoryID, name)
	if err == nil && id > 0 {
		return id, "", false, nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, "", false, err
	}

	query := `
		INSERT INTO restoration_types (category_id, category_name, code, name, department_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id
	`

	runner := r.runner(ctx)
	if err := runner.QueryRowContext(ctx, query, categoryID, categoryName, *codePtr, name, deptID).Scan(&id); err != nil {
		if isUniqueViolation(err) {
			id, selErr := r.selectByCode(ctx, deptID, *codePtr)
			if selErr != nil {
				return 0, "", false, selErr
			}
			return id, *codePtr, false, nil
		}
		return 0, "", false, err
	}

	return id, *codePtr, true, nil
}

func (r *restorationTypeImportRepo) selectByCode(ctx context.Context, deptID int, code string) (int, error) {
	query := `
	SELECT id
	FROM restoration_types
	WHERE department_id = $1 AND code_norm = lower(unaccent_immutable($2)) AND deleted_at IS NULL
	LIMIT 1
`

	var id int
	runner := r.runner(ctx)
	return id, runner.QueryRowContext(ctx, query, deptID, code).Scan(&id)
}

func (r *restorationTypeImportRepo) selectByCategoryAndName(ctx context.Context, deptID int, categoryID int, name string) (int, error) {
	query := `
		SELECT id
		FROM restoration_types
		WHERE department_id = $1 AND category_id = $2 AND name = $3 AND deleted_at IS NULL
		LIMIT 1
	`

	var id int
	runner := r.runner(ctx)
	return id, runner.QueryRowContext(ctx, query, deptID, categoryID, name).Scan(&id)
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "unique constraint")
}

func txFromContext(ctx context.Context) *sql.Tx {
	if ctx == nil {
		return nil
	}
	if tx, ok := ctx.Value(txContextKey{}).(*sql.Tx); ok {
		return tx
	}
	return nil
}

type txContextKey struct{}

func WithTx(ctx context.Context, tx *sql.Tx) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, txContextKey{}, tx)
}
