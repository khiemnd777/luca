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

func TestDepartmentServiceUpdateChildNormalizesRouteParent(t *testing.T) {
	bodyParentID := 20
	routeParentID := 10
	repo := &scopedDepartmentRepo{
		updateChildResult: &deptmodel.DepartmentDTO{ID: 12, Name: "Child", ParentID: intPtr(routeParentID)},
	}
	svc := &departmentService{repo: repo}

	res, err := svc.UpdateChild(context.Background(), routeParentID, deptmodel.DepartmentDTO{
		ID:       12,
		Name:     "Child",
		Active:   true,
		ParentID: &bodyParentID,
	}, 7)
	if err != nil {
		t.Fatalf("UpdateChild() error = %v", err)
	}
	if res.ParentID == nil || *res.ParentID != routeParentID {
		t.Fatalf("result parent id = %v, want %d", res.ParentID, routeParentID)
	}
	if repo.updateChildParentID != routeParentID {
		t.Fatalf("repo parent id = %d, want %d", repo.updateChildParentID, routeParentID)
	}
	if repo.updateChildInput.ParentID == nil || *repo.updateChildInput.ParentID != routeParentID {
		t.Fatalf("repo input parent id = %v, want %d", repo.updateChildInput.ParentID, routeParentID)
	}
}

func TestDepartmentServiceDeleteChildRejectsProtectedRootBeforeRepository(t *testing.T) {
	repo := &scopedDepartmentRepo{}
	svc := &departmentService{repo: repo}

	err := svc.DeleteChild(context.Background(), 10, protectedRootDepartmentID)
	if !errors.Is(err, ErrProtectedDepartmentDelete) {
		t.Fatalf("DeleteChild() error = %v, want ErrProtectedDepartmentDelete", err)
	}
	if repo.deleteChildCalled {
		t.Fatal("DeleteChild should not call repository for protected root")
	}
}

func TestDepartmentServicePreviewAndApplySyncVerifyChildScope(t *testing.T) {
	repo := &scopedDepartmentRepo{
		child: &deptmodel.DepartmentDTO{ID: 12, Name: "Child", ParentID: intPtr(10)},
	}
	syncer := &fakeBootstrapSyncer{
		preview: &deptmodel.DepartmentSyncPreviewDTO{SourceDepartmentID: 10, TargetDepartmentID: 12},
		apply:   &deptmodel.DepartmentSyncApplyResultDTO{SourceDepartmentID: 10, TargetDepartmentID: 12},
	}
	svc := &departmentService{repo: repo, syncer: syncer}

	if _, err := svc.PreviewSyncFromParent(context.Background(), 10, 12); err != nil {
		t.Fatalf("PreviewSyncFromParent() error = %v", err)
	}
	if repo.getChildParentID != 10 || repo.getChildID != 12 {
		t.Fatalf("preview scope = %d/%d, want 10/12", repo.getChildParentID, repo.getChildID)
	}
	if syncer.previewTargetDeptID != 12 {
		t.Fatalf("preview target = %d, want 12", syncer.previewTargetDeptID)
	}

	if _, err := svc.ApplySyncFromParent(context.Background(), 10, 12, "token"); err != nil {
		t.Fatalf("ApplySyncFromParent() error = %v", err)
	}
	if syncer.applyTargetDeptID != 12 || syncer.applyPreviewToken != "token" {
		t.Fatalf("apply target/token = %d/%q, want 12/token", syncer.applyTargetDeptID, syncer.applyPreviewToken)
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

func (r *createDepartmentRepo) UpdateChild(context.Context, int, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to UpdateChild")
}

func (r *createDepartmentRepo) GetByID(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetByID")
}

func (r *createDepartmentRepo) GetChildByID(context.Context, int, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetChildByID")
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

func (r *createDepartmentRepo) DeleteChild(context.Context, int, int) error {
	panic("unexpected call to DeleteChild")
}

func (r *createDepartmentRepo) ExistsMembership(context.Context, int, int) (bool, error) {
	panic("unexpected call to ExistsMembership")
}

func (r *createDepartmentRepo) GetFirstDepartmentOfUser(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetFirstDepartmentOfUser")
}

type scopedDepartmentRepo struct {
	updateChildParentID int
	updateChildInput    deptmodel.DepartmentDTO
	updateChildResult   *deptmodel.DepartmentDTO
	updateChildErr      error

	child            *deptmodel.DepartmentDTO
	getChildParentID int
	getChildID       int
	getChildErr      error

	deleteChildCalled   bool
	deleteChildParentID int
	deleteChildID       int
	deleteChildErr      error
}

func (r *scopedDepartmentRepo) Create(context.Context, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to Create")
}

func (r *scopedDepartmentRepo) Update(context.Context, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to Update")
}

func (r *scopedDepartmentRepo) UpdateChild(_ context.Context, parentDeptID int, input deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	r.updateChildParentID = parentDeptID
	r.updateChildInput = input
	if r.updateChildErr != nil {
		return nil, r.updateChildErr
	}
	copy := *r.updateChildResult
	return &copy, nil
}

func (r *scopedDepartmentRepo) GetByID(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetByID")
}

func (r *scopedDepartmentRepo) GetChildByID(_ context.Context, parentDeptID, childDeptID int) (*deptmodel.DepartmentDTO, error) {
	r.getChildParentID = parentDeptID
	r.getChildID = childDeptID
	if r.getChildErr != nil {
		return nil, r.getChildErr
	}
	copy := *r.child
	return &copy, nil
}

func (r *scopedDepartmentRepo) GetBySlug(context.Context, string) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetBySlug")
}

func (r *scopedDepartmentRepo) List(context.Context, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to List")
}

func (r *scopedDepartmentRepo) Search(context.Context, dbutils.SearchQuery) (dbutils.SearchResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to Search")
}

func (r *scopedDepartmentRepo) ChildrenList(context.Context, int, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to ChildrenList")
}

func (r *scopedDepartmentRepo) Delete(context.Context, int) error {
	panic("unexpected call to Delete")
}

func (r *scopedDepartmentRepo) DeleteChild(_ context.Context, parentDeptID, childDeptID int) error {
	r.deleteChildCalled = true
	r.deleteChildParentID = parentDeptID
	r.deleteChildID = childDeptID
	return r.deleteChildErr
}

func (r *scopedDepartmentRepo) ExistsMembership(context.Context, int, int) (bool, error) {
	panic("unexpected call to ExistsMembership")
}

func (r *scopedDepartmentRepo) GetFirstDepartmentOfUser(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetFirstDepartmentOfUser")
}

type fakeBootstrapSyncer struct {
	sourceDeptID   int
	targetDeptID   int
	sawTx          bool
	afterCommitRan bool
	err            error
	preview        *deptmodel.DepartmentSyncPreviewDTO
	apply          *deptmodel.DepartmentSyncApplyResultDTO

	previewTargetDeptID int
	applyTargetDeptID   int
	applyPreviewToken   string
}

func (s *fakeBootstrapSyncer) PreviewFromParent(_ context.Context, targetDeptID int) (*deptmodel.DepartmentSyncPreviewDTO, error) {
	s.previewTargetDeptID = targetDeptID
	if s.err != nil {
		return nil, s.err
	}
	return s.preview, nil
}

func (s *fakeBootstrapSyncer) ApplyFromParent(_ context.Context, targetDeptID int, previewToken string) (*deptmodel.DepartmentSyncApplyResultDTO, error) {
	s.applyTargetDeptID = targetDeptID
	s.applyPreviewToken = previewToken
	if s.err != nil {
		return nil, s.err
	}
	return s.apply, nil
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
