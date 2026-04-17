package repository

import (
	"context"
	"fmt"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/role"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/staff"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
)

func SyncDepartmentAdminInTx(ctx context.Context, tx *generated.Tx, adminID, departmentID int) error {
	if adminID <= 0 {
		return fmt.Errorf("invalid admin id")
	}
	if departmentID <= 0 {
		return fmt.Errorf("invalid department id")
	}

	exists, err := tx.User.Query().
		Where(
			user.IDEQ(adminID),
			user.DeletedAtIsNil(),
			user.HasRolesWith(role.RoleNameEQ("admin")),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("admin user not found")
	}

	if err := ensureDepartmentMembershipInTx(ctx, tx, adminID, departmentID); err != nil {
		return err
	}

	return ensureStaffInDepartmentInTx(ctx, tx, adminID, departmentID)
}

func ensureDepartmentMembershipInTx(ctx context.Context, tx *generated.Tx, userID, departmentID int) error {
	exists, err := tx.DepartmentMember.Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.DepartmentIDEQ(departmentID),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	_, err = tx.DepartmentMember.Create().
		SetUserID(userID).
		SetDepartmentID(departmentID).
		Save(ctx)
	return err
}

func ensureStaffInDepartmentInTx(ctx context.Context, tx *generated.Tx, userID, departmentID int) error {
	entity, err := tx.Staff.Query().
		Where(staff.HasUserWith(user.IDEQ(userID))).
		Only(ctx)
	if err != nil {
		if !generated.IsNotFound(err) {
			return err
		}

		_, err = tx.Staff.Create().
			SetUserID(userID).
			SetDepartmentID(departmentID).
			SetCustomFields(map[string]any{}).
			Save(ctx)
		return err
	}

	if entity.DepartmentID != nil && *entity.DepartmentID == departmentID {
		return nil
	}

	_, err = tx.Staff.UpdateOneID(entity.ID).
		SetDepartmentID(departmentID).
		Save(ctx)
	return err
}
