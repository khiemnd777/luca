package handler

import (
	"bytes"
	"context"
	"errors"
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
	updateErr                          error
	deleteErr                          error
	deletedDeptID                      int
	deletedUserID                      int
	assignErr                          error
	assignedSourceDeptID               int
	assignedUserID                     int
	assignedDestinationDeptID          int
	addExistingDeptID                  int
	addExistingUserID                  int
	addExistingErr                     error
	assignedCorporateAdminUserID       int
	unassignedCorporateAdminUserID     int
	assignedCorporateAdminDepartment   int
	unassignedCorporateAdminDepartment int
}

func (s *staffServiceStub) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	return nil, s.createErr
}

func (s *staffServiceStub) AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error) {
	s.addExistingDeptID = deptID
	s.addExistingUserID = userID
	if s.addExistingErr != nil {
		return nil, s.addExistingErr
	}
	return &model.StaffDTO{ID: userID, DepartmentID: &deptID}, nil
}

func (s *staffServiceStub) Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	return nil, s.updateErr
}

func (s *staffServiceStub) AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error) {
	s.assignedSourceDeptID = sourceDeptID
	s.assignedUserID = userID
	s.assignedDestinationDeptID = destinationDeptID
	if s.assignErr != nil {
		return nil, s.assignErr
	}
	return &model.StaffDTO{ID: userID, DepartmentID: &destinationDeptID}, nil
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

func (s *staffServiceStub) Delete(ctx context.Context, deptID int, userID int) error {
	s.deletedDeptID = deptID
	s.deletedUserID = userID
	return s.deleteErr
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

func TestCreateMapsSystemAdminRoleForbiddenToHTTP403(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{createErr: service.ErrSystemAdminRoleForbidden}
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
	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected %d, got %d", fiber.StatusForbidden, res.StatusCode)
	}
}

func TestUpdateMapsSystemAdminRoleForbiddenToHTTP403(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{updateErr: service.ErrSystemAdminRoleForbidden}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.update"})
		return c.Next()
	})
	app.Put("/:dept_id/staff/:id", h.Update)

	req := httptest.NewRequest(http.MethodPut, "/5/staff/42", bytes.NewBufferString(`{"name":"Nguyen Van A"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected %d, got %d", fiber.StatusForbidden, res.StatusCode)
	}
}

func TestUpdateMapsConflictToHTTP409(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{updateErr: service.ErrConflict("email already exists")}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.update"})
		return c.Next()
	})
	app.Put("/:dept_id/staff/:id", h.Update)

	req := httptest.NewRequest(http.MethodPut, "/5/staff/42", bytes.NewBufferString(`{"name":"Nguyen Van A"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusConflict {
		t.Fatalf("expected %d, got %d", fiber.StatusConflict, res.StatusCode)
	}
}

func TestAddExistingStaffUsesDepartmentAndUserIDContract(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.create"})
		return c.Next()
	})
	app.Post("/:dept_id/staff/add-existing", h.AddExistingStaffToDepartment)

	req := httptest.NewRequest(http.MethodPost, "/5/staff/add-existing", bytes.NewBufferString(`{"user_id":42}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.addExistingDeptID != 5 {
		t.Fatalf("expected deptID 5, got %d", svc.addExistingDeptID)
	}
	if svc.addExistingUserID != 42 {
		t.Fatalf("expected users.id 42, got %d", svc.addExistingUserID)
	}
}

func TestAddExistingStaffMapsScopedErrors(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "staff not found", err: service.ErrStaffNotFound, want: fiber.StatusNotFound},
		{name: "department forbidden", err: service.ErrDepartmentScopeForbidden, want: fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			svc := &staffServiceStub{addExistingErr: tt.err}
			h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
				Ent: (*generated.Client)(nil),
			})

			app.Use(func(c *fiber.Ctx) error {
				c.Locals("deptID", 1)
				c.Locals("permissions", []string{"staff.create"})
				return c.Next()
			})
			app.Post("/:dept_id/staff/add-existing", h.AddExistingStaffToDepartment)

			req := httptest.NewRequest(http.MethodPost, "/5/staff/add-existing", bytes.NewBufferString(`{"user_id":42}`))
			req.Header.Set("Content-Type", "application/json")
			res, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test error: %v", err)
			}
			if res.StatusCode != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, res.StatusCode)
			}
		})
	}
}

func TestUpdateMapsStaffNotFoundToHTTP404(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{updateErr: service.ErrStaffNotFound}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.update"})
		return c.Next()
	})
	app.Put("/:dept_id/staff/:id", h.Update)

	req := httptest.NewRequest(http.MethodPut, "/5/staff/42", bytes.NewBufferString(`{"name":"Nguyen Van A"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected %d, got %d", fiber.StatusNotFound, res.StatusCode)
	}
}

func TestDeleteUsesDepartmentAndUserIDContract(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.delete"})
		return c.Next()
	})
	app.Delete("/:dept_id/staff/:id", h.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/5/staff/42", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusNoContent {
		t.Fatalf("expected %d, got %d", fiber.StatusNoContent, res.StatusCode)
	}
	if svc.deletedDeptID != 5 {
		t.Fatalf("expected deptID 5, got %d", svc.deletedDeptID)
	}
	if svc.deletedUserID != 42 {
		t.Fatalf("expected users.id 42, got %d", svc.deletedUserID)
	}
}

func TestDeleteMapsStaffNotFoundToHTTP404(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{deleteErr: service.ErrStaffNotFound}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.delete"})
		return c.Next()
	})
	app.Delete("/:dept_id/staff/:id", h.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/5/staff/42", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected %d, got %d", fiber.StatusNotFound, res.StatusCode)
	}
}

func TestAssignDepartmentRoutePassesSourceDepartmentAndUserIDContract(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.update"})
		return c.Next()
	})
	app.Post("/:dept_id/staff/:id/assign-department", h.AssignStaffToDepartment)

	req := httptest.NewRequest(http.MethodPost, "/10/staff/42/assign-department", bytes.NewBufferString(`{"department_id":12}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.assignedSourceDeptID != 10 {
		t.Fatalf("expected source deptID 10, got %d", svc.assignedSourceDeptID)
	}
	if svc.assignedUserID != 42 {
		t.Fatalf("expected users.id 42, got %d", svc.assignedUserID)
	}
	if svc.assignedDestinationDeptID != 12 {
		t.Fatalf("expected destination deptID 12, got %d", svc.assignedDestinationDeptID)
	}
}

func TestAssignDepartmentInvalidRouteDepartmentReturnsHTTP400(t *testing.T) {
	app := fiber.New()
	svc := &staffServiceStub{}
	h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 1)
		c.Locals("permissions", []string{"staff.update"})
		return c.Next()
	})
	app.Post("/:dept_id/staff/:id/assign-department", h.AssignStaffToDepartment)

	req := httptest.NewRequest(http.MethodPost, "/bad/staff/42/assign-department", bytes.NewBufferString(`{"department_id":12}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected %d, got %d", fiber.StatusBadRequest, res.StatusCode)
	}
}

func TestAssignDepartmentScopeMissMapsToNon500Response(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{name: "staff not found", err: service.ErrStaffNotFound, want: fiber.StatusNotFound},
		{name: "destination forbidden", err: service.ErrDepartmentScopeForbidden, want: fiber.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			svc := &staffServiceStub{assignErr: tt.err}
			h := NewStaffHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
				Ent: (*generated.Client)(nil),
			})

			app.Use(func(c *fiber.Ctx) error {
				c.Locals("deptID", 1)
				c.Locals("permissions", []string{"staff.update"})
				return c.Next()
			})
			app.Post("/:dept_id/staff/:id/assign-department", h.AssignStaffToDepartment)

			req := httptest.NewRequest(http.MethodPost, "/10/staff/42/assign-department", bytes.NewBufferString(`{"department_id":12}`))
			req.Header.Set("Content-Type", "application/json")
			res, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test error: %v", err)
			}
			if res.StatusCode != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, res.StatusCode)
			}
			if errors.Is(tt.err, service.ErrStaffNotFound) && res.StatusCode == fiber.StatusInternalServerError {
				t.Fatal("scope miss returned 500")
			}
		})
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
