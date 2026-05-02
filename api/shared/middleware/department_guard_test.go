package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
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
