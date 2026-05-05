package service

import (
	"context"
	"errors"
	"testing"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/staff/repository"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type staffRepoStub struct {
	updateDeptID int
	updateInput  model.StaffDTO
	updateErr    error
	updateDTO    *model.StaffDTO
	deleteDeptID int
	deleteUserID int
	deleteErr    error
}

func (r *staffRepoStub) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	return nil, nil
}

func (r *staffRepoStub) Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	r.updateDeptID = deptID
	r.updateInput = input
	if r.updateErr != nil {
		return nil, r.updateErr
	}
	if r.updateDTO != nil {
		return r.updateDTO, nil
	}
	return &model.StaffDTO{ID: input.ID, DepartmentID: input.DepartmentID, Name: input.Name}, nil
}

func (r *staffRepoStub) AssignStaffToDepartment(ctx context.Context, userID int, departmentID int) (*model.StaffDTO, error) {
	return nil, nil
}

func (r *staffRepoStub) AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) (*repository.CorporateAdminAssignmentResult, error) {
	return nil, nil
}

func (r *staffRepoStub) UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) (int, error) {
	return 0, nil
}

func (r *staffRepoStub) ChangePassword(ctx context.Context, id int, newPassword string) error {
	return nil
}

func (r *staffRepoStub) GetByID(ctx context.Context, id int) (*model.StaffDTO, error) {
	return nil, nil
}

func (r *staffRepoStub) CheckPhoneExists(ctx context.Context, userID int, phone string) (bool, error) {
	return false, nil
}

func (r *staffRepoStub) CheckEmailExists(ctx context.Context, userID int, email string) (bool, error) {
	return false, nil
}

func (r *staffRepoStub) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (r *staffRepoStub) ListBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (r *staffRepoStub) ListByRoleName(ctx context.Context, roleName string, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	return table.TableListResult[model.StaffDTO]{}, nil
}

func (r *staffRepoStub) Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.SearchResult[model.StaffDTO]{}, nil
}

func (r *staffRepoStub) SearchWithRoleName(ctx context.Context, roleName string, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.SearchResult[model.StaffDTO]{}, nil
}

func (r *staffRepoStub) Delete(ctx context.Context, deptID int, userID int) error {
	r.deleteDeptID = deptID
	r.deleteUserID = userID
	return r.deleteErr
}

func TestStaffServiceUpdatePassesDepartmentScopeToRepository(t *testing.T) {
	repo := &staffRepoStub{}
	svc := NewStaffService(repo, nil, nil)

	dto, err := svc.Update(context.Background(), 10, model.StaffDTO{
		ID:     42,
		Name:   "Nguyen Van A",
		Active: true,
	})
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if repo.updateDeptID != 10 {
		t.Fatalf("repo update deptID = %d, want 10", repo.updateDeptID)
	}
	if repo.updateInput.DepartmentID == nil || *repo.updateInput.DepartmentID != 10 {
		t.Fatalf("repo update input department id = %v, want 10", repo.updateInput.DepartmentID)
	}
	if dto == nil || dto.ID != 42 {
		t.Fatalf("Update() dto = %+v, want user id 42", dto)
	}
}

func TestStaffServiceUpdatePropagatesStaffNotFound(t *testing.T) {
	repo := &staffRepoStub{updateErr: repository.ErrStaffNotFound}
	svc := NewStaffService(repo, nil, nil)

	_, err := svc.Update(context.Background(), 10, model.StaffDTO{ID: 42, Name: "Missing", Active: true})
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Update() error = %v, want ErrStaffNotFound", err)
	}
}

func TestStaffServiceDeletePassesDepartmentScopeToRepository(t *testing.T) {
	repo := &staffRepoStub{}
	svc := NewStaffService(repo, nil, nil)

	if err := svc.Delete(context.Background(), 10, 42); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if repo.deleteDeptID != 10 {
		t.Fatalf("repo delete deptID = %d, want 10", repo.deleteDeptID)
	}
	if repo.deleteUserID != 42 {
		t.Fatalf("repo delete userID = %d, want 42", repo.deleteUserID)
	}
}

func TestStaffServiceDeletePropagatesStaffNotFound(t *testing.T) {
	repo := &staffRepoStub{deleteErr: repository.ErrStaffNotFound}
	svc := NewStaffService(repo, nil, nil)

	err := svc.Delete(context.Background(), 10, 42)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Delete() error = %v, want ErrStaffNotFound", err)
	}
}
