package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/staff/service"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type staffServiceStub struct {
	listDeptID                         int
	createErr                          error
	assignedCorporateAdminUserID       int
	unassignedCorporateAdminUserID     int
	assignedCorporateAdminDepartment   int
	unassignedCorporateAdminDepartment int
}

func (s *staffServiceStub) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	return nil, s.createErr
}

func (s *staffServiceStub) Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	return nil, nil
}

func (s *staffServiceStub) AssignStaffToDepartment(ctx context.Context, userID int, departmentID int) (*model.StaffDTO, error) {
	return nil, nil
}

func (s *staffServiceStub) AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) error {
	s.assignedCorporateAdminUserID = userID
	s.assignedCorporateAdminDepartment = departmentID
	return nil
}

func (s *staffServiceStub) UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) error {
	s.unassignedCorporateAdminUserID = userID
	s.unassignedCorporateAdminDepartment = departmentID
	return nil
}

func (s *staffServiceStub) ChangePassword(ctx context.Context, id int, newPassword string) error {
	return nil
}

func (s *staffServiceStub) GetByID(ctx context.Context, id int) (*model.StaffDTO, error) {
	return nil, nil
}

func (s *staffServiceStub) CheckPhoneExists(ctx context.Context, userID int, phone string) (bool, error) {
	return false, nil
}

func (s *staffServiceStub) CheckEmailExists(ctx context.Context, userID int, email string) (bool, error) {
	return false, nil
}

func (s *staffServiceStub) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	s.listDeptID = deptID
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (s *staffServiceStub) ListBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (s *staffServiceStub) ListByRoleName(ctx context.Context, roleName string, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (s *staffServiceStub) Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.SearchResult[model.StaffDTO]{}, nil
}

func (s *staffServiceStub) SearchWithRoleName(ctx context.Context, roleName string, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.SearchResult[model.StaffDTO]{}, nil
}

func (s *staffServiceStub) Delete(ctx context.Context, id int) error {
	return nil
}

func TestListUsesDepartmentIDFromRouteParam(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.view"})
		return c.Next()
	})
	app.Get("/:dept_id/staff/list", h.List)

	req := httptest.NewRequest(http.MethodGet, "/5/staff/list", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.listDeptID != 5 {
		t.Fatalf("expected handler to use route dept_id=5, got %d", svc.listDeptID)
	}
}

func TestCreateMapsConflictToHTTP409(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{createErr: service.ErrConflict("phone already exists")}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.create"})
		return c.Next()
	})
	app.Post("/:dept_id/staff", h.Create)

	req := httptest.NewRequest(http.MethodPost, "/1/staff", bytes.NewBufferString(`{"name":"Nguyen Van A"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusConflict {
		t.Fatalf("expected %d, got %d", fiber.StatusConflict, res.StatusCode)
	}
}

func TestAssignCorporateAdminRouteUsesUserIDContract(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"department.update"})
		return c.Next()
	})
	app.Post("/:dept_id/staff/:id/assign-corporate-admin-department", h.AssignCorporateAdminToDepartment)

	req := httptest.NewRequest(http.MethodPost, "/7/staff/42/assign-corporate-admin-department", bytes.NewBufferString(`{"department_id":7}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.assignedCorporateAdminUserID != 42 {
		t.Fatalf("expected users.id 42, got %d", svc.assignedCorporateAdminUserID)
	}
	if svc.assignedCorporateAdminDepartment != 7 {
		t.Fatalf("expected department id 7, got %d", svc.assignedCorporateAdminDepartment)
	}
}

func TestUnassignCorporateAdminRouteUsesUserIDContract(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"department.update"})
		return c.Next()
	})
	app.Post("/:dept_id/staff/:id/unassign-corporate-admin-department", h.UnassignCorporateAdminFromDepartment)

	req := httptest.NewRequest(http.MethodPost, "/7/staff/42/unassign-corporate-admin-department", bytes.NewBufferString(`{"department_id":7}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.unassignedCorporateAdminUserID != 42 {
		t.Fatalf("expected users.id 42, got %d", svc.unassignedCorporateAdminUserID)
	}
	if svc.unassignedCorporateAdminDepartment != 7 {
		t.Fatalf("expected department id 7, got %d", svc.unassignedCorporateAdminDepartment)
	}
}
