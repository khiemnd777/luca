package search

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"sync"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
)

func TestPublishUpsertRunsImmediatelyWithoutTx(t *testing.T) {
	t.Parallel()

	var (
		mu      sync.Mutex
		calls   int
		channel string
		payload any
	)
	original := publishAsync
	publishAsync = func(ch string, p any) error {
		mu.Lock()
		defer mu.Unlock()
		calls++
		channel = ch
		payload = p
		return nil
	}
	defer func() { publishAsync = original }()

	doc := &searchmodel.Doc{EntityType: "section", EntityID: 7}
	PublishUpsert(context.Background(), doc)

	mu.Lock()
	defer mu.Unlock()
	if calls != 1 {
		t.Fatalf("publish calls = %d, want 1", calls)
	}
	if channel != "search:upsert" {
		t.Fatalf("channel = %q, want search:upsert", channel)
	}
	if payload != doc {
		t.Fatalf("payload pointer mismatch")
	}
}

func TestPublishUpsertDefersUntilCommit(t *testing.T) {
	driverName := registerSearchTestTxDriver()
	statsKey := t.Name()
	stats := getSearchTestTxStats(statsKey)

	db, err := sql.Open(driverName, statsKey)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	client := generated.NewClient(generated.Driver(entsql.OpenDB(dialect.Postgres, db)))
	defer client.Close()

	var (
		mu    sync.Mutex
		calls int
	)
	original := publishAsync
	publishAsync = func(string, any) error {
		mu.Lock()
		defer mu.Unlock()
		calls++
		return nil
	}
	defer func() { publishAsync = original }()

	doc := &searchmodel.Doc{EntityType: "section", EntityID: 7}
	_, err = dbutils.WithTx(context.Background(), client, func(tx *generated.Tx) (struct{}, error) {
		ctx := dbutils.WithExistingTx(context.Background(), tx)
		PublishUpsert(ctx, doc)
		mu.Lock()
		defer mu.Unlock()
		if calls != 0 {
			t.Fatalf("publish ran before commit: %d", calls)
		}
		return struct{}{}, nil
	})
	if err != nil {
		t.Fatalf("WithTx() error = %v", err)
	}

	mu.Lock()
	defer mu.Unlock()
	if calls != 1 {
		t.Fatalf("publish calls after commit = %d, want 1", calls)
	}
	if stats.beginCount != 1 || stats.commitCount != 1 || stats.rollbackCount != 0 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/1/0", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

type searchTestTxStats struct {
	beginCount    int
	commitCount   int
	rollbackCount int
}

type searchTestTxDriver struct{}
type searchTestTxConn struct {
	stats *searchTestTxStats
}
type searchTestTx struct {
	stats *searchTestTxStats
}
type searchTestStmt struct{}

var (
	searchTestTxDriverOnce sync.Once
	searchTestTxStatsMu    sync.Mutex
	searchTestTxStatsByDSN = map[string]*searchTestTxStats{}
)

func registerSearchTestTxDriver() string {
	const name = "shared_search_publish_test_tx"
	searchTestTxDriverOnce.Do(func() {
		sql.Register(name, searchTestTxDriver{})
	})
	return name
}

func getSearchTestTxStats(dsn string) *searchTestTxStats {
	searchTestTxStatsMu.Lock()
	defer searchTestTxStatsMu.Unlock()

	stats := &searchTestTxStats{}
	searchTestTxStatsByDSN[dsn] = stats
	return stats
}

func (searchTestTxDriver) Open(name string) (driver.Conn, error) {
	searchTestTxStatsMu.Lock()
	defer searchTestTxStatsMu.Unlock()

	stats, ok := searchTestTxStatsByDSN[name]
	if !ok {
		stats = &searchTestTxStats{}
		searchTestTxStatsByDSN[name] = stats
	}
	return &searchTestTxConn{stats: stats}, nil
}

func (c *searchTestTxConn) Prepare(string) (driver.Stmt, error) {
	return searchTestStmt{}, nil
}

func (c *searchTestTxConn) Close() error {
	return nil
}

func (c *searchTestTxConn) Begin() (driver.Tx, error) {
	c.stats.beginCount++
	return &searchTestTx{stats: c.stats}, nil
}

func (c *searchTestTxConn) BeginTx(context.Context, driver.TxOptions) (driver.Tx, error) {
	return c.Begin()
}

func (t *searchTestTx) Commit() error {
	t.stats.commitCount++
	return nil
}

func (t *searchTestTx) Rollback() error {
	t.stats.rollbackCount++
	return nil
}

func (searchTestStmt) Close() error {
	return nil
}

func (searchTestStmt) NumInput() int {
	return -1
}

func (searchTestStmt) Exec([]driver.Value) (driver.Result, error) {
	return driver.RowsAffected(0), nil
}

func (searchTestStmt) Query([]driver.Value) (driver.Rows, error) {
	return nil, errors.New("query not supported in test driver")
}
