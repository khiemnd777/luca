package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"entgo.io/ent/dialect/sql/schema"
	"github.com/gofiber/fiber/v2"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
)

func TestRequireDepartmentMember_ForbidsNonMemberWithoutFullDepartmentPermissions(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", 10)
		c.Locals("deptID", 3)
		c.Locals("permissions", []string{"department.view"})
		return c.Next()
	})
	app.Get("/:dept_id/test", RequireDepartmentMember("dept_id"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/5/test", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected %d, got %d", fiber.StatusForbidden, res.StatusCode)
	}
}

func TestRequireDepartmentMember_ForbidsCorporateAdminOutsideTokenDepartment(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", 10)
		c.Locals("deptID", 3)
		c.Locals("roles", []string{"corporate_admin"})
		c.Locals("permissions", []string{
			"department.view",
			"department.create",
			"department.update",
			"department.delete",
		})
		return c.Next()
	})
	app.Get("/:dept_id/test", RequireDepartmentMember("dept_id"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/5/test", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected %d, got %d", fiber.StatusForbidden, res.StatusCode)
	}
}

func TestRequireDepartmentMember_AllowsSystemAdminAcrossDepartments(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", 10)
		c.Locals("deptID", 3)
		c.Locals("roles", []string{"admin"})
		return c.Next()
	})
	app.Get("/:dept_id/test", RequireDepartmentMember("dept_id"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/5/test", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
}

func TestRequireDepartmentMember_RechecksActiveMembership(t *testing.T) {
	ctx := context.Background()
	db := newMiddlewareTestDB(t)
	userEnt := createMiddlewareTestUser(t, ctx, db, "guard-member")
	deptEnt := createMiddlewareTestDepartment(t, ctx, db, "guard-dept", true, false)
	addMiddlewareTestMembership(t, ctx, db, userEnt.ID, deptEnt.ID)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userID", userEnt.ID)
		c.Locals("deptID", deptEnt.ID)
		c.Locals("roles", []string{"corporate_admin"})
		return c.Next()
	})
	app.Get("/:dept_id/test", RequireDepartmentMember("dept_id", db), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/%d/test", deptEnt.ID), nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test active member error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected active member status %d, got %d", fiber.StatusOK, res.StatusCode)
	}

	if err := db.Department.UpdateOneID(deptEnt.ID).SetActive(false).Exec(ctx); err != nil {
		t.Fatalf("deactivate department: %v", err)
	}

	req = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/%d/test", deptEnt.ID), nil)
	res, err = app.Test(req)
	if err != nil {
		t.Fatalf("app.Test inactive member error: %v", err)
	}
	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected inactive member status %d, got %d", fiber.StatusForbidden, res.StatusCode)
	}
}

func newMiddlewareTestDB(t *testing.T) *generated.Client {
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

func createMiddlewareTestUser(t *testing.T, ctx context.Context, db *generated.Client, name string) *generated.User {
	t.Helper()
	userEnt, err := db.User.Create().
		SetName(name).
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetPassword("hashed-password").
		Save(ctx)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return userEnt
}

func createMiddlewareTestDepartment(t *testing.T, ctx context.Context, db *generated.Client, name string, active bool, deleted bool) *generated.Department {
	t.Helper()
	deptEnt, err := db.Department.Create().
		SetName(name).
		SetActive(active).
		SetDeleted(deleted).
		Save(ctx)
	if err != nil {
		t.Fatalf("create department: %v", err)
	}
	return deptEnt
}

func addMiddlewareTestMembership(t *testing.T, ctx context.Context, db *generated.Client, userID, departmentID int) {
	t.Helper()
	if err := db.DepartmentMember.Create().
		SetUserID(userID).
		SetDepartmentID(departmentID).
		Exec(ctx); err != nil {
		t.Fatalf("create department membership: %v", err)
	}
}
