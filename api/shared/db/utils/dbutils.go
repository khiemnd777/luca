package dbutils

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"
	"sync"

	"github.com/lib/pq"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
)

type txContextKey struct{}
type afterCommitContextKey struct{}

type afterCommitQueue struct {
	mu        sync.Mutex
	callbacks []func()
}

func (q *afterCommitQueue) add(fn func()) {
	if fn == nil {
		return
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	q.callbacks = append(q.callbacks, fn)
}

func (q *afterCommitQueue) run() {
	q.mu.Lock()
	callbacks := append([]func(){}, q.callbacks...)
	q.callbacks = nil
	q.mu.Unlock()

	for _, fn := range callbacks {
		if fn != nil {
			fn()
		}
	}
}

type PqStringArray []string

func (a PqStringArray) Value() (driver.Value, error) { return "{" + strings.Join(a, ",") + "}", nil }

var afterCommitQueues sync.Map

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
	queue := &afterCommitQueue{}
	afterCommitQueues.Store(tx, queue)

	defer func() {
		defer afterCommitQueues.Delete(tx)
		if err != nil {
			_ = tx.Rollback()
			return
		}
		if txErr := tx.Commit(); txErr != nil {
			err = txErr
			return
		}
		queue.run()
	}()

	var out D
	out, err = fn(tx)
	return out, err
}

func WithExistingTx(ctx context.Context, tx *generated.Tx) context.Context {
	ctx = context.WithValue(ctx, txContextKey{}, tx)
	if tx == nil {
		return ctx
	}
	if queue, ok := afterCommitQueues.Load(tx); ok {
		ctx = context.WithValue(ctx, afterCommitContextKey{}, queue)
	}
	return ctx
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

func RegisterAfterCommit(ctx context.Context, fn func()) {
	if fn == nil {
		return
	}

	tx := TxFromContext(ctx)
	if tx == nil {
		fn()
		return
	}

	if queue, ok := ctx.Value(afterCommitContextKey{}).(*afterCommitQueue); ok && queue != nil {
		queue.add(fn)
		return
	}

	if queue, ok := afterCommitQueues.Load(tx); ok {
		queue.(*afterCommitQueue).add(fn)
		return
	}

	fn()
}
