package service

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/khiemnd777/noah_api/modules/main/config"
	deptmodel "github.com/khiemnd777/noah_api/modules/main/department/model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

func TestIsProtectedDepartmentID(t *testing.T) {
	if !isProtectedDepartmentID(1) {
		t.Fatal("expected department 1 to be protected")
	}

	if isProtectedDepartmentID(2) {
		t.Fatal("expected non-root department to be deletable")
	}
}

func TestDepartmentServiceCreateBootstrapsFromParent(t *testing.T) {
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

	repo := &createDepartmentRepo{
		result: &deptmodel.DepartmentDTO{ID: 7, Name: "Child", ParentID: intPtr(9)},
	}
	syncer := &fakeBootstrapSyncer{}
	svc := &departmentService{
		repo:   repo,
		deps:   &module.ModuleDeps[config.ModuleConfig]{Ent: client},
		syncer: syncer,
	}

	res, err := svc.Create(context.Background(), deptmodel.DepartmentDTO{Name: "Child", ParentID: intPtr(9)})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if res.ID != 7 {
		t.Fatalf("created department id = %d, want 7", res.ID)
	}
	if !repo.sawTx {
		t.Fatal("expected repo.Create to receive tx context")
	}
	if !syncer.sawTx {
		t.Fatal("expected bootstrap syncer to receive tx context")
	}
	if !syncer.afterCommitRan {
		t.Fatal("expected bootstrap after-commit callback to run")
	}
	if syncer.sourceDeptID != 9 || syncer.targetDeptID != 7 {
		t.Fatalf("bootstrap source/target = %d/%d, want 9/7", syncer.sourceDeptID, syncer.targetDeptID)
	}
	if stats.beginCount != 1 || stats.commitCount != 1 || stats.rollbackCount != 0 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/1/0", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

func TestDepartmentServiceCreateBootstrapsFromRootWhenParentMissing(t *testing.T) {
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

	repo := &createDepartmentRepo{
		result: &deptmodel.DepartmentDTO{ID: 8, Name: "Standalone"},
	}
	syncer := &fakeBootstrapSyncer{}
	svc := &departmentService{
		repo:   repo,
		deps:   &module.ModuleDeps[config.ModuleConfig]{Ent: client},
		syncer: syncer,
	}

	if _, err := svc.Create(context.Background(), deptmodel.DepartmentDTO{Name: "Standalone"}); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if syncer.sourceDeptID != protectedRootDepartmentID || syncer.targetDeptID != 8 {
		t.Fatalf("bootstrap source/target = %d/%d, want %d/8", syncer.sourceDeptID, syncer.targetDeptID, protectedRootDepartmentID)
	}
	if stats.beginCount != 1 || stats.commitCount != 1 || stats.rollbackCount != 0 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/1/0", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

func TestDepartmentServiceCreateRollsBackWhenBootstrapFails(t *testing.T) {
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

	repo := &createDepartmentRepo{
		result: &deptmodel.DepartmentDTO{ID: 9, Name: "Child", ParentID: intPtr(3)},
	}
	sentinel := errors.New("bootstrap failed")
	syncer := &fakeBootstrapSyncer{err: sentinel}
	svc := &departmentService{
		repo:   repo,
		deps:   &module.ModuleDeps[config.ModuleConfig]{Ent: client},
		syncer: syncer,
	}

	if _, err := svc.Create(context.Background(), deptmodel.DepartmentDTO{Name: "Child", ParentID: intPtr(3)}); !errors.Is(err, sentinel) {
		t.Fatalf("Create() error = %v, want sentinel", err)
	}
	if syncer.afterCommitRan {
		t.Fatal("after-commit callback should not run on rollback")
	}

	if stats.beginCount != 1 || stats.commitCount != 0 || stats.rollbackCount != 1 {
		t.Fatalf("tx stats = begin:%d commit:%d rollback:%d, want 1/0/1", stats.beginCount, stats.commitCount, stats.rollbackCount)
	}
}

type createDepartmentRepo struct {
	result *deptmodel.DepartmentDTO
	err    error
	sawTx  bool
}

func (r *createDepartmentRepo) Create(ctx context.Context, _ deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	r.sawTx = dbutils.TxFromContext(ctx) != nil
	if r.err != nil {
		return nil, r.err
	}
	copy := *r.result
	return &copy, nil
}

func (r *createDepartmentRepo) Update(context.Context, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to Update")
}

func (r *createDepartmentRepo) GetByID(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetByID")
}

func (r *createDepartmentRepo) GetBySlug(context.Context, string) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetBySlug")
}

func (r *createDepartmentRepo) List(context.Context, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to List")
}

func (r *createDepartmentRepo) Search(context.Context, dbutils.SearchQuery) (dbutils.SearchResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to Search")
}

func (r *createDepartmentRepo) ChildrenList(context.Context, int, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to ChildrenList")
}

func (r *createDepartmentRepo) Delete(context.Context, int) error {
	panic("unexpected call to Delete")
}

func (r *createDepartmentRepo) ExistsMembership(context.Context, int, int) (bool, error) {
	panic("unexpected call to ExistsMembership")
}

func (r *createDepartmentRepo) GetFirstDepartmentOfUser(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetFirstDepartmentOfUser")
}

type fakeBootstrapSyncer struct {
	sourceDeptID   int
	targetDeptID   int
	sawTx          bool
	afterCommitRan bool
	err            error
}

func (s *fakeBootstrapSyncer) PreviewFromParent(context.Context, int) (*deptmodel.DepartmentSyncPreviewDTO, error) {
	panic("unexpected call to PreviewFromParent")
}

func (s *fakeBootstrapSyncer) ApplyFromParent(context.Context, int, string) (*deptmodel.DepartmentSyncApplyResultDTO, error) {
	panic("unexpected call to ApplyFromParent")
}

func (s *fakeBootstrapSyncer) BootstrapFromSource(ctx context.Context, sourceDeptID int, targetDeptID int) error {
	s.sawTx = dbutils.TxFromContext(ctx) != nil
	s.sourceDeptID = sourceDeptID
	s.targetDeptID = targetDeptID
	dbutils.RegisterAfterCommit(ctx, func() {
		s.afterCommitRan = true
	})
	return s.err
}
