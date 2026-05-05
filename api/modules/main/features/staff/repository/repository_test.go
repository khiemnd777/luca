package repository

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
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
