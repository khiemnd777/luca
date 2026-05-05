package repository

import (
	"context"
	"testing"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/modules/main/department/model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
)

func newDepartmentTestRepo(t *testing.T) (DepartmentRepository, *generated.Client) {
	t.Helper()

	db := enttest.Open(t, "sqlite3", "file:department_repo_test?mode=memory&cache=shared&_fk=1",
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close ent client: %v", err)
		}
	})

	return NewDepartmentRepository(db, nil), db
}

func createDepartment(t *testing.T, ctx context.Context, db *generated.Client, name string, parentID *int) *generated.Department {
	t.Helper()

	dept, err := db.Department.Create().
		SetName(name).
		SetActive(true).
		SetNillableParentID(parentID).
		Save(ctx)
	if err != nil {
		t.Fatalf("create department %q: %v", name, err)
	}
	return dept
}

func requireDepartmentState(t *testing.T, ctx context.Context, db *generated.Client, id int, name string, parentID int, deleted bool) {
	t.Helper()

	dept, err := db.Department.Query().Where(department.ID(id)).Only(ctx)
	if err != nil {
		t.Fatalf("get department %d: %v", id, err)
	}
	if dept.Name != name {
		t.Fatalf("department %d name = %q, want %q", id, dept.Name, name)
	}
	if dept.ParentID == nil || *dept.ParentID != parentID {
		t.Fatalf("department %d parent = %v, want %d", id, dept.ParentID, parentID)
	}
	if dept.Deleted != deleted {
		t.Fatalf("department %d deleted = %v, want %v", id, dept.Deleted, deleted)
	}
}

func TestDepartmentRepositoryChildScopedReadUpdateDelete(t *testing.T) {
	ctx := context.Background()
	repo, db := newDepartmentTestRepo(t)

	parent := createDepartment(t, ctx, db, "Parent", nil)
	otherParent := createDepartment(t, ctx, db, "Other Parent", nil)
	child := createDepartment(t, ctx, db, "Child", &parent.ID)
	otherChild := createDepartment(t, ctx, db, "Other Child", &otherParent.ID)

	got, err := repo.GetChildByID(ctx, parent.ID, child.ID)
	if err != nil {
		t.Fatalf("GetChildByID() error = %v", err)
	}
	if got.ID != child.ID {
		t.Fatalf("GetChildByID() id = %d, want %d", got.ID, child.ID)
	}

	if _, err := repo.GetChildByID(ctx, parent.ID, otherChild.ID); !generated.IsNotFound(err) {
		t.Fatalf("mismatched GetChildByID() error = %v, want ent not found", err)
	}

	updated, err := repo.UpdateChild(ctx, parent.ID, model.DepartmentDTO{
		ID:       child.ID,
		Name:     "Updated Child",
		Active:   true,
		ParentID: &parent.ID,
	})
	if err != nil {
		t.Fatalf("UpdateChild() error = %v", err)
	}
	if updated.ID != child.ID || updated.ParentID == nil || *updated.ParentID != parent.ID {
		t.Fatalf("UpdateChild() result = %+v, want child scoped to parent %d", updated, parent.ID)
	}
	requireDepartmentState(t, ctx, db, child.ID, "Updated Child", parent.ID, false)

	if _, err := repo.UpdateChild(ctx, parent.ID, model.DepartmentDTO{
		ID:       otherChild.ID,
		Name:     "Should Not Mutate",
		Active:   true,
		ParentID: &parent.ID,
	}); !generated.IsNotFound(err) {
		t.Fatalf("mismatched UpdateChild() error = %v, want ent not found", err)
	}
	requireDepartmentState(t, ctx, db, otherChild.ID, "Other Child", otherParent.ID, false)

	if err := repo.DeleteChild(ctx, parent.ID, otherChild.ID); !generated.IsNotFound(err) {
		t.Fatalf("mismatched DeleteChild() error = %v, want ent not found", err)
	}
	requireDepartmentState(t, ctx, db, otherChild.ID, "Other Child", otherParent.ID, false)

	if err := repo.DeleteChild(ctx, parent.ID, child.ID); err != nil {
		t.Fatalf("DeleteChild() error = %v", err)
	}
	requireDepartmentState(t, ctx, db, child.ID, "Updated Child", parent.ID, true)
}
