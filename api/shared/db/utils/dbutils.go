package dbutils

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"

	"github.com/lib/pq"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
)

type txContextKey struct{}

type PqStringArray []string

func (a PqStringArray) Value() (driver.Value, error) { return "{" + strings.Join(a, ",") + "}", nil }

func SortByIDs(ctx context.Context, db *sql.DB, table, orderField string, ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	query := fmt.Sprintf(`
		UPDATE %s f
		SET %s = v.ord
		FROM unnest($1::int[]) WITH ORDINALITY AS v(id, ord)
		WHERE f.id = v.id
	`,
		pq.QuoteIdentifier(table),
		pq.QuoteIdentifier(orderField),
	)

	_, err := db.ExecContext(ctx, query, pq.Array(ids))
	return err
}

func WithTx[D any](ctx context.Context, db *generated.Client, fn func(tx *generated.Tx) (D, error)) (D, error) {
	if existing := TxFromContext(ctx); existing != nil {
		return fn(existing)
	}

	var (
		tx   *generated.Tx
		err  error
		zero D
	)

	tx, err = db.Tx(ctx)
	if err != nil {
		return zero, err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback()
			return
		}
		if txErr := tx.Commit(); txErr != nil {
			err = txErr
		}
	}()

	var out D
	out, err = fn(tx)
	return out, err
}

func WithExistingTx(ctx context.Context, tx *generated.Tx) context.Context {
	return context.WithValue(ctx, txContextKey{}, tx)
}

func TxFromContext(ctx context.Context) *generated.Tx {
	if ctx == nil {
		return nil
	}
	if tx, ok := ctx.Value(txContextKey{}).(*generated.Tx); ok {
		return tx
	}
	return nil
}
