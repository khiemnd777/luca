package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
)

func TestListActiveDepartmentMembershipsFiltersInactiveAndDeletedDepartments(t *testing.T) {
	ctx := context.Background()
	db := newAuthRepositoryTestDB(t)
	repo := NewAuthRepository(db)
	userEnt := createAuthRepositoryTestUser(t, db, "member-filter")
	activeDept := createAuthRepositoryTestDepartment(t, db, "Active", true, false)
	inactiveDept := createAuthRepositoryTestDepartment(t, db, "Inactive", false, false)
	deletedDept := createAuthRepositoryTestDepartment(t, db, "Deleted", true, true)
	addAuthRepositoryTestMembership(t, db, userEnt.ID, inactiveDept.ID)
	addAuthRepositoryTestMembership(t, db, userEnt.ID, activeDept.ID)
	addAuthRepositoryTestMembership(t, db, userEnt.ID, deletedDept.ID)

	departments, err := repo.ListActiveDepartmentMemberships(ctx, userEnt.ID)
	if err != nil {
		t.Fatalf("ListActiveDepartmentMemberships() error = %v", err)
	}

	if len(departments) != 1 {
		t.Fatalf("department count = %d, want 1", len(departments))
	}
	if departments[0].ID != activeDept.ID {
		t.Fatalf("department id = %d, want %d", departments[0].ID, activeDept.ID)
	}
}

func TestIsActiveDepartmentMemberRequiresActiveNonDeletedDepartment(t *testing.T) {
	ctx := context.Background()
	db := newAuthRepositoryTestDB(t)
	repo := NewAuthRepository(db)
	userEnt := createAuthRepositoryTestUser(t, db, "member-check")
	activeDept := createAuthRepositoryTestDepartment(t, db, "Active", true, false)
	deletedDept := createAuthRepositoryTestDepartment(t, db, "Deleted", true, true)
	addAuthRepositoryTestMembership(t, db, userEnt.ID, activeDept.ID)
	addAuthRepositoryTestMembership(t, db, userEnt.ID, deletedDept.ID)

	ok, err := repo.IsActiveDepartmentMember(ctx, userEnt.ID, activeDept.ID)
	if err != nil {
		t.Fatalf("IsActiveDepartmentMember(active) error = %v", err)
	}
	if !ok {
		t.Fatal("active department membership should be valid")
	}

	ok, err = repo.IsActiveDepartmentMember(ctx, userEnt.ID, deletedDept.ID)
	if err != nil {
		t.Fatalf("IsActiveDepartmentMember(deleted) error = %v", err)
	}
	if ok {
		t.Fatal("deleted department membership should not be valid")
	}
}

func TestDepartmentSelectionTokenConsumeRejectsReplayAndExpiredTokens(t *testing.T) {
	ctx := context.Background()
	db := newAuthRepositoryTestDB(t)
	repo := NewAuthRepository(db)
	userEnt := createAuthRepositoryTestUser(t, db, "selection-token")
	jti := fmt.Sprintf("selection-jti-%d", time.Now().UnixNano())

	if err := repo.StoreDepartmentSelectionToken(ctx, jti, userEnt.ID, time.Now().Add(time.Minute)); err != nil {
		t.Fatalf("StoreDepartmentSelectionToken() error = %v", err)
	}

	ok, err := repo.ConsumeDepartmentSelectionToken(ctx, jti, userEnt.ID)
	if err != nil {
		t.Fatalf("first ConsumeDepartmentSelectionToken() error = %v", err)
	}
	if !ok {
		t.Fatal("first ConsumeDepartmentSelectionToken() should succeed")
	}

	ok, err = repo.ConsumeDepartmentSelectionToken(ctx, jti, userEnt.ID)
	if err != nil {
		t.Fatalf("second ConsumeDepartmentSelectionToken() error = %v", err)
	}
	if ok {
		t.Fatal("second ConsumeDepartmentSelectionToken() should reject replay")
	}

	expiredJTI := fmt.Sprintf("expired-selection-jti-%d", time.Now().UnixNano())
	if err := repo.StoreDepartmentSelectionToken(ctx, expiredJTI, userEnt.ID, time.Now().Add(-time.Minute)); err != nil {
		t.Fatalf("StoreDepartmentSelectionToken(expired) error = %v", err)
	}

	ok, err = repo.ConsumeDepartmentSelectionToken(ctx, expiredJTI, userEnt.ID)
	if err != nil {
		t.Fatalf("ConsumeDepartmentSelectionToken(expired) error = %v", err)
	}
	if ok {
		t.Fatal("expired selection token should not be consumable")
	}
}

func newAuthRepositoryTestDB(t *testing.T) *generated.Client {
	t.Helper()
	db := enttest.Open(t, "sqlite3", fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", t.Name()),
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close db: %v", err)
		}
	})
	return db
}

func createAuthRepositoryTestUser(t *testing.T, db *generated.Client, name string) *generated.User {
	t.Helper()
	userEnt, err := db.User.Create().
		SetName(name).
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetPassword("hashed-password").
		Save(context.Background())
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return userEnt
}

func createAuthRepositoryTestDepartment(t *testing.T, db *generated.Client, name string, active bool, deleted bool) *generated.Department {
	t.Helper()
	dept, err := db.Department.Create().
		SetName(name).
		SetActive(active).
		SetDeleted(deleted).
		Save(context.Background())
	if err != nil {
		t.Fatalf("create department: %v", err)
	}
	return dept
}

func addAuthRepositoryTestMembership(t *testing.T, db *generated.Client, userID, departmentID int) {
	t.Helper()
	if err := db.DepartmentMember.Create().
		SetUserID(userID).
		SetDepartmentID(departmentID).
		Exec(context.Background()); err != nil {
		t.Fatalf("create department membership: %v", err)
	}
}
