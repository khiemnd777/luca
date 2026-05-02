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

func SyncDepartmentCorporateAdminInTx(ctx context.Context, tx *generated.Tx, corporateAdminID, departmentID int) error {
	if corporateAdminID <= 0 {
		return fmt.Errorf("invalid corporate admin id")
	}
	if departmentID <= 0 {
		return fmt.Errorf("invalid department id")
	}

	if err := ensureCorporateAdminRoleInTx(ctx, tx, corporateAdminID); err != nil {
		return err
	}

	if err := ensureDepartmentMembershipInTx(ctx, tx, corporateAdminID, departmentID); err != nil {
		return err
	}

	return nil
}

func ensureCorporateAdminRoleInTx(ctx context.Context, tx *generated.Tx, userID int) error {
	exists, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasRolesWith(role.RoleNameEQ("corporate_admin")),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	corporateAdminRole, err := tx.Role.Query().
		Where(role.RoleNameEQ("corporate_admin")).
		Only(ctx)
	if err != nil {
		return err
	}

	return tx.User.UpdateOneID(userID).
		AddRoleIDs(corporateAdminRole.ID).
		Exec(ctx)
}

func removeCorporateAdminRoleIfUnusedInTx(ctx context.Context, tx *generated.Tx, userID int, excludedDepartmentID int) error {
	hasOtherCorporateAdminDepartment, err := tx.Department.Query().
		Where(
			department.CorporateAdministratorIDEQ(userID),
			department.IDNEQ(excludedDepartmentID),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if hasOtherCorporateAdminDepartment {
		return nil
	}

	corporateAdminRole, err := tx.Role.Query().
		Where(role.RoleNameEQ("corporate_admin")).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil
		}
		return err
	}

	return tx.User.UpdateOneID(userID).
		RemoveRoleIDs(corporateAdminRole.ID).
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
