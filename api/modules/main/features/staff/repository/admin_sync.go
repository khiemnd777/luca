package repository

import (
	"context"
	"fmt"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
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

	if err := ensureAdminRoleInTx(ctx, tx, adminID); err != nil {
		return err
	}

	if err := ensureDepartmentMembershipInTx(ctx, tx, adminID, departmentID); err != nil {
		return err
	}

	return nil
}

func ensureAdminRoleInTx(ctx context.Context, tx *generated.Tx, userID int) error {
	exists, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasRolesWith(role.RoleNameEQ("admin")),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	adminRole, err := tx.Role.Query().
		Where(role.RoleNameEQ("admin")).
		Only(ctx)
	if err != nil {
		return err
	}

	return tx.User.UpdateOneID(userID).
		AddRoleIDs(adminRole.ID).
		Exec(ctx)
}

func removeAdminRoleIfUnusedInTx(ctx context.Context, tx *generated.Tx, userID int, excludedDepartmentID int) error {
	hasOtherAdminDepartment, err := tx.Department.Query().
		Where(
			department.AdministratorIDEQ(userID),
			department.IDNEQ(excludedDepartmentID),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if hasOtherAdminDepartment {
		return nil
	}

	adminRole, err := tx.Role.Query().
		Where(role.RoleNameEQ("admin")).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil
		}
		return err
	}

	return tx.User.UpdateOneID(userID).
		RemoveRoleIDs(adminRole.ID).
		Exec(ctx)
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
