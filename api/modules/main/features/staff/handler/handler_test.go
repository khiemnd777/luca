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
	listDeptID int
	createErr  error
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

func (s *staffServiceStub) AssignAdminToDepartment(ctx context.Context, staffID int, departmentID int) error {
	return nil
}

func (s *staffServiceStub) UnassignAdminFromDepartment(ctx context.Context, staffID int, departmentID int) error {
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
