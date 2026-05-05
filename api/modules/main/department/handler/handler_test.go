package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/department/model"
	"github.com/khiemnd777/noah_api/modules/main/department/service"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type departmentServiceStub struct {
	createInput model.DepartmentDTO

	getChildParentID int
	getChildID       int
	getChildErr      error

	updateChildParentID int
	updateChildInput    model.DepartmentDTO
	updateChildUserID   int
}

func (s *departmentServiceStub) Create(_ context.Context, input model.DepartmentDTO) (*model.DepartmentDTO, error) {
	s.createInput = input
	return &s.createInput, nil
}

func (s *departmentServiceStub) Update(context.Context, model.DepartmentDTO, int) (*model.DepartmentDTO, error) {
	panic("unexpected call to Update")
}

func (s *departmentServiceStub) UpdateChild(_ context.Context, parentDeptID int, input model.DepartmentDTO, userID int) (*model.DepartmentDTO, error) {
	s.updateChildParentID = parentDeptID
	s.updateChildInput = input
	s.updateChildUserID = userID
	return &input, nil
}

func (s *departmentServiceStub) GetByID(context.Context, int) (*model.DepartmentDTO, error) {
	panic("unexpected call to GetByID")
}

func (s *departmentServiceStub) GetChildByID(_ context.Context, parentDeptID, childDeptID int) (*model.DepartmentDTO, error) {
	s.getChildParentID = parentDeptID
	s.getChildID = childDeptID
	if s.getChildErr != nil {
		return nil, s.getChildErr
	}
	return &model.DepartmentDTO{ID: childDeptID, Name: "Child", ParentID: &parentDeptID}, nil
}

func (s *departmentServiceStub) GetBySlug(context.Context, string) (*model.DepartmentDTO, error) {
	panic("unexpected call to GetBySlug")
}

func (s *departmentServiceStub) List(context.Context, table.TableQuery) (table.TableListResult[model.DepartmentDTO], error) {
	panic("unexpected call to List")
}

func (s *departmentServiceStub) Search(context.Context, dbutils.SearchQuery) (dbutils.SearchResult[model.DepartmentDTO], error) {
	panic("unexpected call to Search")
}

func (s *departmentServiceStub) ChildrenList(context.Context, int, table.TableQuery) (table.TableListResult[model.DepartmentDTO], error) {
	panic("unexpected call to ChildrenList")
}

func (s *departmentServiceStub) Delete(context.Context, int) error {
	panic("unexpected call to Delete")
}

func (s *departmentServiceStub) DeleteChild(context.Context, int, int) error {
	return nil
}

func (s *departmentServiceStub) GetFirstDepartmentOfUser(context.Context, int) (*model.DepartmentDTO, error) {
	panic("unexpected call to GetFirstDepartmentOfUser")
}

func (s *departmentServiceStub) PreviewSyncFromParent(context.Context, int, int) (*model.DepartmentSyncPreviewDTO, error) {
	panic("unexpected call to PreviewSyncFromParent")
}

func (s *departmentServiceStub) ApplySyncFromParent(context.Context, int, int, string) (*model.DepartmentSyncApplyResultDTO, error) {
	panic("unexpected call to ApplySyncFromParent")
}

func newDepartmentHandlerTestApp(svc *departmentServiceStub, permission string) (*fiber.App, *DepartmentHandler) {
	app := fiber.New()
	h := NewDepartmentHandler(svc, &module.ModuleDeps[config.ModuleConfig]{
		Ent: (*generated.Client)(nil),
	})
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("deptID", 10)
		c.Locals("userID", 77)
		c.Locals("permissions", []string{permission})
		return c.Next()
	})
	return app, h
}

func TestGetByIDUsesParentAndChildRouteParams(t *testing.T) {
	svc := &departmentServiceStub{}
	app, h := newDepartmentHandlerTestApp(svc, "department.view")
	app.Get("/:dept_id/child/:child_dept_id", h.GetByID)

	req := httptest.NewRequest(http.MethodGet, "/10/child/12", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.getChildParentID != 10 || svc.getChildID != 12 {
		t.Fatalf("handler scope = %d/%d, want 10/12", svc.getChildParentID, svc.getChildID)
	}
}

func TestGetByIDChildScopeMissReturns404(t *testing.T) {
	svc := &departmentServiceStub{getChildErr: service.ErrDepartmentChildNotFound}
	app, h := newDepartmentHandlerTestApp(svc, "department.view")
	app.Get("/:dept_id/child/:child_dept_id", h.GetByID)

	req := httptest.NewRequest(http.MethodGet, "/10/child/999", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected %d, got %d", fiber.StatusNotFound, res.StatusCode)
	}
}

func TestCreateForcesRouteParentAndIgnoresChildRouteID(t *testing.T) {
	svc := &departmentServiceStub{}
	app, h := newDepartmentHandlerTestApp(svc, "department.create")
	app.Post("/:dept_id/child/:child_dept_id", h.Create)

	req := httptest.NewRequest(http.MethodPost, "/10/child/999", bytes.NewBufferString(`{"name":"Child","parent_id":20}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.createInput.ParentID == nil || *svc.createInput.ParentID != 10 {
		t.Fatalf("create parent id = %v, want 10", svc.createInput.ParentID)
	}
	if svc.createInput.ID == 999 {
		t.Fatal("create should not use child_dept_id as the new department id")
	}
}

func TestUpdatePassesParentScopeAndNormalizesParentID(t *testing.T) {
	svc := &departmentServiceStub{}
	app, h := newDepartmentHandlerTestApp(svc, "department.update")
	app.Put("/:dept_id/child/:child_dept_id", h.Update)

	req := httptest.NewRequest(http.MethodPut, "/10/child/12", bytes.NewBufferString(`{"name":"Child","parent_id":20}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusOK {
		t.Fatalf("expected %d, got %d", fiber.StatusOK, res.StatusCode)
	}
	if svc.updateChildParentID != 10 || svc.updateChildInput.ID != 12 {
		t.Fatalf("update scope/id = %d/%d, want 10/12", svc.updateChildParentID, svc.updateChildInput.ID)
	}
	if svc.updateChildInput.ParentID == nil || *svc.updateChildInput.ParentID != 10 {
		t.Fatalf("update parent id = %v, want 10", svc.updateChildInput.ParentID)
	}
	if svc.updateChildUserID != 77 {
		t.Fatalf("update user id = %d, want 77", svc.updateChildUserID)
	}
}
