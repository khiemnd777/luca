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
	createErr               error
	phoneExists             bool
	emailExists             bool
	updateDeptID            int
	updateInput             model.StaffDTO
	updateErr               error
	updateDTO               *model.StaffDTO
	assignSourceDeptID      int
	assignUserID            int
	assignDestinationDeptID int
	assignErr               error
	assignDTO               *model.StaffDTO
	addExistingDeptID       int
	addExistingUserID       int
	addExistingErr          error
	deleteDeptID            int
	deleteUserID            int
	deleteErr               error
}

func (r *staffRepoStub) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	if r.createErr != nil {
		return nil, r.createErr
	}
	return &model.StaffDTO{ID: input.ID, DepartmentID: &deptID, Name: input.Name}, nil
}

func (r *staffRepoStub) AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error) {
	r.addExistingDeptID = deptID
	r.addExistingUserID = userID
	if r.addExistingErr != nil {
		return nil, r.addExistingErr
	}
	return &model.StaffDTO{ID: userID, DepartmentID: &deptID}, nil
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

func (r *staffRepoStub) AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error) {
	r.assignSourceDeptID = sourceDeptID
	r.assignUserID = userID
	r.assignDestinationDeptID = destinationDeptID
	if r.assignErr != nil {
		return nil, r.assignErr
	}
	if r.assignDTO != nil {
		return r.assignDTO, nil
	}
	return &model.StaffDTO{ID: userID, DepartmentID: &destinationDeptID}, nil
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
	return r.phoneExists, nil
}

func (r *staffRepoStub) CheckEmailExists(ctx context.Context, userID int, email string) (bool, error) {
	return r.emailExists, nil
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

func TestStaffServiceCreateRejectsDuplicatePhone(t *testing.T) {
	repo := &staffRepoStub{phoneExists: true}
	svc := NewStaffService(repo, nil, nil)
	password := "valid-password"

	_, err := svc.Create(context.Background(), 10, model.StaffDTO{
		Name:     "Duplicate Phone",
		Phone:    "+84900000004",
		Email:    "duplicate-phone@example.test",
		Password: &password,
	})
	if !errors.Is(err, ErrConflict("phone already exists")) {
		t.Fatalf("Create() error = %v, want phone conflict", err)
	}
}

func TestStaffServiceCreateRejectsDuplicateEmail(t *testing.T) {
	repo := &staffRepoStub{emailExists: true}
	svc := NewStaffService(repo, nil, nil)
	password := "valid-password"

	_, err := svc.Create(context.Background(), 10, model.StaffDTO{
		Name:     "Duplicate Email",
		Phone:    "+84900000005",
		Email:    "duplicate-email@example.test",
		Password: &password,
	})
	if !errors.Is(err, ErrConflict("email already exists")) {
		t.Fatalf("Create() error = %v, want email conflict", err)
	}
}

func TestStaffServiceUpdateRejectsDuplicatePhone(t *testing.T) {
	repo := &staffRepoStub{phoneExists: true}
	svc := NewStaffService(repo, nil, nil)

	_, err := svc.Update(context.Background(), 10, model.StaffDTO{
		ID:     42,
		Name:   "Duplicate Phone",
		Phone:  "+84900000006",
		Email:  "duplicate-phone-update@example.test",
		Active: true,
	})
	if !errors.Is(err, ErrConflict("phone already exists")) {
		t.Fatalf("Update() error = %v, want phone conflict", err)
	}
}

func TestStaffServiceUpdateRejectsDuplicateEmail(t *testing.T) {
	repo := &staffRepoStub{emailExists: true}
	svc := NewStaffService(repo, nil, nil)

	_, err := svc.Update(context.Background(), 10, model.StaffDTO{
		ID:     42,
		Name:   "Duplicate Email",
		Phone:  "+84900000007",
		Email:  "duplicate-email-update@example.test",
		Active: true,
	})
	if !errors.Is(err, ErrConflict("email already exists")) {
		t.Fatalf("Update() error = %v, want email conflict", err)
	}
}

func TestStaffServiceCreatePropagatesSystemAdminRoleForbidden(t *testing.T) {
	repo := &staffRepoStub{createErr: repository.ErrSystemAdminRoleForbidden}
	svc := NewStaffService(repo, nil, nil)
	password := "valid-password"

	_, err := svc.Create(context.Background(), 10, model.StaffDTO{
		Name:     "Blocked",
		Phone:    "+84900000003",
		Password: &password,
	})
	if !errors.Is(err, ErrSystemAdminRoleForbidden) {
		t.Fatalf("Create() error = %v, want %v", err, ErrSystemAdminRoleForbidden)
	}
}

func TestStaffServiceUpdatePropagatesSystemAdminRoleForbidden(t *testing.T) {
	repo := &staffRepoStub{updateErr: repository.ErrSystemAdminRoleForbidden}
	svc := NewStaffService(repo, nil, nil)

	_, err := svc.Update(context.Background(), 10, model.StaffDTO{ID: 42, Name: "Blocked", Active: true})
	if !errors.Is(err, ErrSystemAdminRoleForbidden) {
		t.Fatalf("Update() error = %v, want %v", err, ErrSystemAdminRoleForbidden)
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

func TestStaffServiceAssignPassesDepartmentScopeToRepository(t *testing.T) {
	repo := &staffRepoStub{}
	svc := NewStaffService(repo, nil, nil)

	dto, err := svc.AssignStaffToDepartment(context.Background(), 10, 42, 12)
	if err != nil {
		t.Fatalf("AssignStaffToDepartment() error = %v", err)
	}
	if repo.assignSourceDeptID != 10 {
		t.Fatalf("repo assign source deptID = %d, want 10", repo.assignSourceDeptID)
	}
	if repo.assignUserID != 42 {
		t.Fatalf("repo assign userID = %d, want 42", repo.assignUserID)
	}
	if repo.assignDestinationDeptID != 12 {
		t.Fatalf("repo assign destination deptID = %d, want 12", repo.assignDestinationDeptID)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != 12 {
		t.Fatalf("AssignStaffToDepartment() dto department id = %v, want 12", dto)
	}
}

func TestStaffServiceAddExistingPassesDepartmentAndUserIDToRepository(t *testing.T) {
	repo := &staffRepoStub{}
	svc := NewStaffService(repo, nil, nil)

	dto, err := svc.AddExistingStaffToDepartment(context.Background(), 10, 42)
	if err != nil {
		t.Fatalf("AddExistingStaffToDepartment() error = %v", err)
	}
	if repo.addExistingDeptID != 10 {
		t.Fatalf("repo add existing deptID = %d, want 10", repo.addExistingDeptID)
	}
	if repo.addExistingUserID != 42 {
		t.Fatalf("repo add existing userID = %d, want 42", repo.addExistingUserID)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != 10 {
		t.Fatalf("AddExistingStaffToDepartment() dto department id = %v, want 10", dto)
	}
}

func TestStaffServiceAddExistingPropagatesScopedErrors(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want error
	}{
		{name: "staff not found", err: repository.ErrStaffNotFound, want: ErrStaffNotFound},
		{name: "department forbidden", err: repository.ErrDepartmentScopeForbidden, want: ErrDepartmentScopeForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &staffRepoStub{addExistingErr: tt.err}
			svc := NewStaffService(repo, nil, nil)

			_, err := svc.AddExistingStaffToDepartment(context.Background(), 10, 42)
			if !errors.Is(err, tt.want) {
				t.Fatalf("AddExistingStaffToDepartment() error = %v, want %v", err, tt.want)
			}
		})
	}
}

func TestStaffServiceAssignPropagatesScopedErrors(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want error
	}{
		{name: "staff not found", err: repository.ErrStaffNotFound, want: ErrStaffNotFound},
		{name: "department forbidden", err: repository.ErrDepartmentScopeForbidden, want: ErrDepartmentScopeForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &staffRepoStub{assignErr: tt.err}
			svc := NewStaffService(repo, nil, nil)

			_, err := svc.AssignStaffToDepartment(context.Background(), 10, 42, 12)
			if !errors.Is(err, tt.want) {
				t.Fatalf("AssignStaffToDepartment() error = %v, want %v", err, tt.want)
			}
		})
	}
}
