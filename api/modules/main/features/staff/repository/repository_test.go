package repository

import (
	"testing"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
)

func TestSetDepartmentIDFromPersistedStaffUsesPersistedValue(t *testing.T) {
	dto := &model.StaffDTO{}
	persistedDeptID := 42

	setDepartmentIDFromPersistedStaff(dto, &persistedDeptID)

	if dto.DepartmentID == nil {
		t.Fatal("expected department id to be set")
	}
	if *dto.DepartmentID != 42 {
		t.Fatalf("expected persisted department id 42, got %d", *dto.DepartmentID)
	}
}

func TestSetDepartmentIDFromPersistedStaffOverridesRequestValue(t *testing.T) {
	requestDeptID := 7
	persistedDeptID := 21
	dto := &model.StaffDTO{
		DepartmentID: &requestDeptID,
	}

	setDepartmentIDFromPersistedStaff(dto, &persistedDeptID)

	if dto.DepartmentID == nil {
		t.Fatal("expected department id to be set")
	}
	if *dto.DepartmentID != 21 {
		t.Fatalf("expected persisted department id 21, got %d", *dto.DepartmentID)
	}
}
