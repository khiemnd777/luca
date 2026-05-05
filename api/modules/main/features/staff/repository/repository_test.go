package repository

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/staff"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
)

type staffTestCustomFieldStore struct{}

func (staffTestCustomFieldStore) GetIDBySlug(ctx context.Context, slug string) (*int, error) {
	return nil, customfields.ErrCollectionNotFound
}

func (staffTestCustomFieldStore) LoadSchema(ctx context.Context, collectionSlug string) (*customfields.Schema, error) {
	return &customfields.Schema{Collection: collectionSlug}, nil
}

func newStaffTestRepo(t *testing.T) (*staffRepo, *generated.Client) {
	t.Helper()

	db := enttest.Open(t, "sqlite3", fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", t.Name()),
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close ent client: %v", err)
		}
	})

	return &staffRepo{
		db:    db,
		cfMgr: customfields.NewManager(staffTestCustomFieldStore{}),
	}, db
}

func createStaffUser(t *testing.T, ctx context.Context, db *generated.Client, deptID int, name string) *generated.User {
	t.Helper()

	userEnt, err := db.User.Create().
		SetName(name).
		SetPassword("hashed").
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetActive(true).
		Save(ctx)
	if err != nil {
		t.Fatalf("create user %q: %v", name, err)
	}

	if _, err := db.Staff.Create().
		SetUserID(userEnt.ID).
		SetDepartmentID(deptID).
		Save(ctx); err != nil {
		t.Fatalf("create staff for user %d: %v", userEnt.ID, err)
	}

	return userEnt
}

func createDepartment(t *testing.T, ctx context.Context, db *generated.Client, name string, parentID *int) *generated.Department {
	t.Helper()

	create := db.Department.Create().
		SetName(name)
	if parentID != nil {
		create.SetParentID(*parentID)
	}
	deptEnt, err := create.Save(ctx)
	if err != nil {
		t.Fatalf("create department %q: %v", name, err)
	}
	return deptEnt
}

func requireUserName(t *testing.T, ctx context.Context, db *generated.Client, userID int, want string) {
	t.Helper()

	userEnt, err := db.User.Query().Where(user.IDEQ(userID)).Only(ctx)
	if err != nil {
		t.Fatalf("query user %d: %v", userID, err)
	}
	if userEnt.Name != want {
		t.Fatalf("user %d name = %q, want %q", userID, userEnt.Name, want)
	}
}

func requireUserDeleted(t *testing.T, ctx context.Context, db *generated.Client, userID int, want bool) {
	t.Helper()

	userEnt, err := db.User.Query().Where(user.IDEQ(userID)).Only(ctx)
	if err != nil {
		t.Fatalf("query user %d: %v", userID, err)
	}
	got := userEnt.DeletedAt != nil
	if got != want {
		t.Fatalf("user %d deleted = %v, want %v", userID, got, want)
	}
}

func requireStaffDepartment(t *testing.T, ctx context.Context, db *generated.Client, userID int, wantDeptID int) {
	t.Helper()

	staffEnt, err := db.Staff.Query().
		Where(staff.HasUserWith(user.IDEQ(userID))).
		Only(ctx)
	if err != nil {
		t.Fatalf("query staff for user %d: %v", userID, err)
	}
	if staffEnt.DepartmentID == nil || *staffEnt.DepartmentID != wantDeptID {
		t.Fatalf("staff department id = %v, want %d", staffEnt.DepartmentID, wantDeptID)
	}
}

func requireDepartmentMembership(t *testing.T, ctx context.Context, db *generated.Client, userID int, departmentID int, want bool) {
	t.Helper()

	exists, err := db.DepartmentMember.Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.DepartmentIDEQ(departmentID),
		).
		Exist(ctx)
	if err != nil {
		t.Fatalf("query department membership user %d department %d: %v", userID, departmentID, err)
	}
	if exists != want {
		t.Fatalf("department membership user %d department %d exists = %v, want %v", userID, departmentID, exists, want)
	}
}

func TestSetDepartmentIDFromPersistedStaffUsesPersistedValue(t *testing.T) {
	dto := &model.StaffDTO{}
	persistedDeptID := 42

	setDepartmentIDFromPersistedStaff(dto, &persistedDeptID)

	if dto.DepartmentID == nil {
		t.Fatal("expected department id to be set")
	}
	if *dto.DepartmentID != 42 {
		t.Fatalf("expected persisted department id 42, got %d", *dto.DepartmentID)
	}
}

func TestSetDepartmentIDFromPersistedStaffOverridesRequestValue(t *testing.T) {
	requestDeptID := 7
	persistedDeptID := 21
	dto := &model.StaffDTO{
		DepartmentID: &requestDeptID,
	}

	setDepartmentIDFromPersistedStaff(dto, &persistedDeptID)

	if dto.DepartmentID == nil {
		t.Fatal("expected department id to be set")
	}
	if *dto.DepartmentID != 21 {
		t.Fatalf("expected persisted department id 21, got %d", *dto.DepartmentID)
	}
}

func TestStaffRepositoryUpdateRequiresRouteDepartmentOwnership(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	target := createStaffUser(t, ctx, db, 10, "target")
	otherDeptTarget := createStaffUser(t, ctx, db, 20, "other")

	updated, err := repo.Update(ctx, 10, model.StaffDTO{
		ID:     target.ID,
		Name:   "target updated",
		Email:  "target-updated@example.test",
		Active: true,
	})
	if err != nil {
		t.Fatalf("Update() same department error = %v", err)
	}
	if updated.ID != target.ID {
		t.Fatalf("Update() id = %d, want %d", updated.ID, target.ID)
	}
	if updated.DepartmentID == nil || *updated.DepartmentID != 10 {
		t.Fatalf("Update() department id = %v, want 10", updated.DepartmentID)
	}
	requireUserName(t, ctx, db, target.ID, "target updated")

	_, err = repo.Update(ctx, 10, model.StaffDTO{
		ID:     otherDeptTarget.ID,
		Name:   "should not mutate",
		Email:  "other-updated@example.test",
		Active: true,
	})
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Update() cross department error = %v, want ErrStaffNotFound", err)
	}
	requireUserName(t, ctx, db, otherDeptTarget.ID, "other")
}

func TestStaffRepositoryDeleteRequiresRouteDepartmentOwnership(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	target := createStaffUser(t, ctx, db, 10, "delete-target")
	otherDeptTarget := createStaffUser(t, ctx, db, 20, "delete-other")

	if err := repo.Delete(ctx, 10, target.ID); err != nil {
		t.Fatalf("Delete() same department error = %v", err)
	}
	requireUserDeleted(t, ctx, db, target.ID, true)

	err := repo.Delete(ctx, 10, otherDeptTarget.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Delete() cross department error = %v, want ErrStaffNotFound", err)
	}
	requireUserDeleted(t, ctx, db, otherDeptTarget.ID, false)
}

func TestStaffRepositoryUpdateDeleteMissingTargetsReturnStaffNotFound(t *testing.T) {
	ctx := context.Background()
	repo, _ := newStaffTestRepo(t)

	if _, err := repo.Update(ctx, 10, model.StaffDTO{
		ID:     999,
		Name:   "missing",
		Active: true,
	}); !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Update() missing target error = %v, want ErrStaffNotFound", err)
	}

	if err := repo.Delete(ctx, 10, 999); !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Delete() missing target error = %v, want ErrStaffNotFound", err)
	}
}

func TestStaffRepositoryAssignAllowsSourceDepartmentSelf(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-self")

	dto, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, sourceDept.ID)
	if err != nil {
		t.Fatalf("AssignStaffToDepartment() self error = %v", err)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != sourceDept.ID {
		t.Fatalf("AssignStaffToDepartment() dto department id = %v, want %d", dto, sourceDept.ID)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, sourceDept.ID, true)
}

func TestStaffRepositoryAssignAllowsDirectChildDepartment(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-child")

	dto, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if err != nil {
		t.Fatalf("AssignStaffToDepartment() child error = %v", err)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != childDept.ID {
		t.Fatalf("AssignStaffToDepartment() dto department id = %v, want %d", dto, childDept.ID)
	}
	requireStaffDepartment(t, ctx, db, target.ID, childDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, true)
}

func TestStaffRepositoryAssignRejectsUnrelatedDepartmentWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	unrelatedDept := createDepartment(t, ctx, db, "unrelated", nil)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-unrelated")

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, unrelatedDept.ID)
	if !errors.Is(err, ErrDepartmentScopeForbidden) {
		t.Fatalf("AssignStaffToDepartment() unrelated error = %v, want ErrDepartmentScopeForbidden", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, unrelatedDept.ID, false)
}

func TestStaffRepositoryAssignRejectsStaffOutsideSourceDepartmentWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	otherDept := createDepartment(t, ctx, db, "other", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, otherDept.ID, "assign-cross-source")

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("AssignStaffToDepartment() cross source error = %v, want ErrStaffNotFound", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, otherDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, false)
}

func TestStaffRepositoryAssignRejectsDeletedUserWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-deleted-user")
	if err := db.User.UpdateOneID(target.ID).SetDeletedAt(time.Now()).Exec(ctx); err != nil {
		t.Fatalf("mark user deleted: %v", err)
	}

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("AssignStaffToDepartment() deleted user error = %v, want ErrStaffNotFound", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, false)
}
