package dbutils

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
)

func TestRegisterAfterCommitRunsAfterCommit(t *testing.T) {
	driverName := registerTestTxDriver()
	statsKey := t.Name()
	stats := getTestTxStats(statsKey)

	db, err := sql.Open(driverName, statsKey)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	client := generated.NewClient(generated.Driver(entsql.OpenDB(dialect.Postgres, db)))
	defer client.Close()

	ran := false
	_, err = WithTx(context.Background(), client, func(tx *generated.Tx) (struct{}, error) {
		txCtx := WithExistingTx(context.Background(), tx)
		RegisterAfterCommit(txCtx, func() {
			ran = true
		})
		if ran {
			t.Fatal("after-commit callback ran before commit")
		}
		return struct{}{}, nil
	})
	if err != nil {
		t.Fatalf("WithTx() error = %v", err)
	}
	if !ran {
		t.Fatal("after-commit callback did not run after commit")
	}
	if stats.beginCount != 1 || stats.commitCount != 1 || stats.rollbackCount != 0 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/1/0", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

func TestRegisterAfterCommitSkipsOnRollback(t *testing.T) {
	driverName := registerTestTxDriver()
	statsKey := t.Name()
	stats := getTestTxStats(statsKey)

	db, err := sql.Open(driverName, statsKey)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	client := generated.NewClient(generated.Driver(entsql.OpenDB(dialect.Postgres, db)))
	defer client.Close()

	ran := false
	sentinel := errors.New("boom")
	_, err = WithTx(context.Background(), client, func(tx *generated.Tx) (struct{}, error) {
		txCtx := WithExistingTx(context.Background(), tx)
		RegisterAfterCommit(txCtx, func() {
			ran = true
		})
		return struct{}{}, sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("WithTx() error = %v, want sentinel", err)
	}
	if ran {
		t.Fatal("after-commit callback ran on rollback")
	}
	if stats.beginCount != 1 || stats.commitCount != 0 || stats.rollbackCount != 1 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/0/1", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

func TestRegisterAfterCommitRunsImmediatelyWithoutTx(t *testing.T) {
	ran := false
	RegisterAfterCommit(context.Background(), func() {
		ran = true
	})
	if !ran {
		t.Fatal("expected callback to run immediately without tx")
	}
}

type testTxStats struct {
	beginCount    int
	commitCount   int
	rollbackCount int
}

type testTxDriver struct{}
type testTxConn struct {
	stats *testTxStats
}
type testTx struct {
	stats *testTxStats
}
type testStmt struct{}

var (
	testTxDriverOnce sync.Once
	testTxStatsMu    sync.Mutex
	testTxStatsByDSN = map[string]*testTxStats{}
)

func registerTestTxDriver() string {
	const name = "dbutils_after_commit_test_tx"
	testTxDriverOnce.Do(func() {
		sql.Register(name, testTxDriver{})
	})
	return name
}

func getTestTxStats(dsn string) *testTxStats {
	testTxStatsMu.Lock()
	defer testTxStatsMu.Unlock()

	stats := &testTxStats{}
	testTxStatsByDSN[dsn] = stats
	return stats
}

func (testTxDriver) Open(name string) (driver.Conn, error) {
	testTxStatsMu.Lock()
	defer testTxStatsMu.Unlock()

	stats, ok := testTxStatsByDSN[name]
	if !ok {
		stats = &testTxStats{}
		testTxStatsByDSN[name] = stats
	}
	return &testTxConn{stats: stats}, nil
}

func (c *testTxConn) Prepare(string) (driver.Stmt, error) {
	return testStmt{}, nil
}

func (c *testTxConn) Close() error {
	return nil
}

func (c *testTxConn) Begin() (driver.Tx, error) {
	c.stats.beginCount++
	return &testTx{stats: c.stats}, nil
}

func (c *testTxConn) BeginTx(context.Context, driver.TxOptions) (driver.Tx, error) {
	return c.Begin()
}

func (t *testTx) Commit() error {
	t.stats.commitCount++
	return nil
}

func (t *testTx) Rollback() error {
	t.stats.rollbackCount++
	return nil
}

func (testStmt) Close() error {
	return nil
}

func (testStmt) NumInput() int {
	return -1
}

func (testStmt) Exec([]driver.Value) (driver.Result, error) {
	return driver.RowsAffected(0), nil
}

func (testStmt) Query([]driver.Value) (driver.Rows, error) {
	return nil, errors.New("query not supported in test driver")
}
