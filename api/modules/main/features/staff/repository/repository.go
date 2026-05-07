package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/role"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/section"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/staff"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/staffsection"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
	"golang.org/x/crypto/bcrypt"
)

type StaffRepository interface {
	Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error)
	AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error)
	Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error)
	AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error)
	AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) (*CorporateAdminAssignmentResult, error)
	UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) (int, error)
	ChangePassword(ctx context.Context, id int, newPassword string) error
	GetByID(ctx context.Context, id int) (*model.StaffDTO, error)
	CheckPhoneExists(ctx context.Context, userID int, phone string) (bool, error)
	CheckEmailExists(ctx context.Context, userID int, email string) (bool, error)
	List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error)
	ListBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error)
	ListByRoleName(ctx context.Context, roleName string, query table.TableQuery) (table.TableListResult[model.StaffDTO], error)
	Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error)
	SearchWithRoleName(ctx context.Context, roleName string, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error)
	Delete(ctx context.Context, deptID int, userID int) error
}

type staffRepo struct {
	db    *generated.Client
	deps  *module.ModuleDeps[config.ModuleConfig]
	cfMgr *customfields.Manager
}

type CorporateAdminAssignmentResult struct {
	PreviousCorporateAdminID *int
	CurrentCorporateAdminID  int
}

var ErrStaffNotFound = errors.New("staff not found")
var ErrDepartmentScopeForbidden = errors.New("department scope forbidden")
var ErrSystemAdminRoleForbidden = errors.New("system admin role cannot be assigned from staff form")

func setDepartmentIDFromPersistedStaff(dto *model.StaffDTO, deptID *int) {
	if dto == nil {
		return
	}
	dto.DepartmentID = deptID
}

func setDepartmentFromPersistedStaff(dto *model.StaffDTO, deptID *int, deptName *string) {
	if dto == nil {
		return
	}
	dto.DepartmentID = deptID
	dto.DepartmentName = deptName
}

func NewStaffRepository(db *generated.Client, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) StaffRepository {
	return &staffRepo{db: db, deps: deps, cfMgr: cfMgr}
}

func validateAssignableStaffRoleIDsInTx(ctx context.Context, tx *generated.Tx, roleIDs []int) error {
	roleIDs = utils.DedupInt(roleIDs, -1)
	if len(roleIDs) == 0 {
		return nil
	}

	hasSystemAdminRole, err := tx.Role.Query().
		Where(
			role.IDIn(roleIDs...),
			role.RoleNameEQ("admin"),
		).
		Exist(ctx)
	if err != nil {
		return err
	}
	if hasSystemAdminRole {
		return ErrSystemAdminRoleForbidden
	}
	return nil
}

func (r *staffRepo) getDepartmentIDByUserID(ctx context.Context, userID int) (*int, error) {
	row := r.deps.DB.QueryRowContext(ctx, "SELECT department_id FROM staffs WHERE user_staff = $1 LIMIT 1", userID)
	var dept sql.NullInt64
	if err := row.Scan(&dept); err != nil {
		return nil, err
	}
	if !dept.Valid {
		return nil, nil
	}
	deptID := int(dept.Int64)
	return &deptID, nil
}

type staffDepartmentInfo struct {
	ID   *int
	Name *string
}

func (r *staffRepo) getDepartmentMapByUserIDs(ctx context.Context, userIDs []int) (map[int]staffDepartmentInfo, error) {
	out := make(map[int]staffDepartmentInfo, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}

	placeholders := make([]string, 0, len(userIDs))
	args := make([]any, 0, len(userIDs))
	for i, userID := range userIDs {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		args = append(args, userID)
	}

	q := fmt.Sprintf(
		`SELECT s.user_staff, s.department_id, d.name
		FROM staffs s
		LEFT JOIN departments d ON d.id = s.department_id
		WHERE s.user_staff IN (%s)`,
		strings.Join(placeholders, ","),
	)

	rows, err := r.deps.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var uid int
		var dept sql.NullInt64
		var deptName sql.NullString
		if err := rows.Scan(&uid, &dept, &deptName); err != nil {
			return nil, err
		}
		info := staffDepartmentInfo{}
		if dept.Valid {
			deptID := int(dept.Int64)
			info.ID = &deptID
		}
		if deptName.Valid {
			name := deptName.String
			info.Name = &name
		}
		out[uid] = info
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return out, nil
}

func (r *staffRepo) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	refCode := uuid.NewString()
	qrCode := utils.GenerateQRCodeStringForUser(refCode)
	pwdHash, _ := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)

	userEnt, err := tx.User.Create().
		SetName(input.Name).
		SetPassword(string(pwdHash)).
		SetNillableEmail(&input.Email).
		SetNillablePhone(&input.Phone).
		SetNillableActive(&input.Active).
		SetNillableAvatar(&input.Avatar).
		SetNillableRefCode(&refCode).
		SetNillableQrCode(&qrCode).
		Save(ctx)

	if err != nil {
		return nil, err
	}

	staffQ := tx.Staff.Create().
		SetDepartmentID(deptID).
		SetUserID(userEnt.ID)

	// customfields
	_, err = customfields.PrepareCustomFields(ctx,
		r.cfMgr,
		[]string{"staff"},
		input.CustomFields,
		staffQ,
		false,
	)
	if err != nil {
		return nil, err
	}

	staffEnt, err := staffQ.Save(ctx)

	if err != nil {
		return nil, err
	}

	if err = ensureDepartmentMembershipInTx(ctx, tx, userEnt.ID, deptID); err != nil {
		return nil, err
	}

	// Edge – Sections
	var sectionNames []string
	var sectionNamesStr string

	if input.SectionIDs != nil {
		sectionIDs := utils.DedupInt(input.SectionIDs, -1)
		if len(sectionIDs) > 0 {
			bulk := make([]*generated.StaffSectionCreate, 0, len(sectionIDs))
			for _, sid := range sectionIDs {
				bulk = append(bulk, tx.StaffSection.Create().
					SetStaffID(staffEnt.ID).
					SetSectionID(sid),
				)
			}
			if err = tx.StaffSection.CreateBulk(bulk...).Exec(ctx); err != nil {
				return nil, err
			}

			// get section names
			rows := make([]struct {
				ID   int    `json:"id"`
				Name string `json:"name"`
			}, 0, len(sectionIDs))

			if err := tx.Section.
				Query().
				Where(section.IDIn(sectionIDs...)).
				Select(section.FieldID, section.FieldName).
				Scan(ctx, &rows); err != nil {
				return nil, err
			}

			// map id -> name
			nameByID := make(map[int]string, len(rows))
			for _, r := range rows {
				nameByID[r.ID] = r.Name
			}

			sectionNames = make([]string, 0, len(sectionIDs))
			for _, id := range sectionIDs {
				if n, ok := nameByID[id]; ok {
					sectionNames = append(sectionNames, n)
				}
			}

			sectionNamesStr = strings.Join(sectionNames, "|")
		}
	}

	_, err = tx.Staff.UpdateOneID(staffEnt.ID).
		SetNillableSectionNames(&sectionNamesStr).
		Save(ctx)

	if err != nil {
		return nil, err
	}

	// Edge – Roles
	if input.RoleIDs != nil {
		roleIDs := utils.DedupInt(input.RoleIDs, -1)
		if err = validateAssignableStaffRoleIDsInTx(ctx, tx, roleIDs); err != nil {
			return nil, err
		}
		if len(roleIDs) > 0 {
			_, err = tx.User.UpdateOneID(userEnt.ID).
				AddRoleIDs(roleIDs...).
				Save(ctx)
			if err != nil {
				return nil, err
			}
		}
	}

	dto := mapper.MapAs[*generated.User, *model.StaffDTO](userEnt)
	setDepartmentIDFromPersistedStaff(dto, staffEnt.DepartmentID)
	dto.SectionIDs = input.SectionIDs
	dto.SectionNames = sectionNames
	dto.RoleIDs = input.RoleIDs
	dto.CustomFields = input.CustomFields

	return dto, nil
}

func (r *staffRepo) AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	deptEnt, err := tx.Department.Query().
		Where(
			department.IDEQ(deptID),
			department.ActiveEQ(true),
			department.Deleted(false),
		).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, ErrDepartmentScopeForbidden
		}
		return nil, err
	}

	userEnt, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasStaff(),
		).
		WithRoles().
		WithStaff(func(sq *generated.StaffQuery) {
			sq.WithSections(func(ssq *generated.StaffSectionQuery) {
				ssq.WithSection()
			})
		}).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, ErrStaffNotFound
		}
		return nil, err
	}

	if err = ensureDepartmentMembershipInTx(ctx, tx, userID, deptID); err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.User, *model.StaffDTO](userEnt)
	dto.DepartmentID = &deptID
	dto.DepartmentName = &deptEnt.Name
	for _, roleEnt := range userEnt.Edges.Roles {
		dto.RoleIDs = append(dto.RoleIDs, roleEnt.ID)
		dto.RoleNames = append(dto.RoleNames, roleEnt.RoleName)
	}
	if userEnt.Edges.Staff != nil {
		staffEnt := userEnt.Edges.Staff
		for _, staffSectionEnt := range staffEnt.Edges.Sections {
			if staffSectionEnt.Edges.Section != nil {
				dto.SectionIDs = append(dto.SectionIDs, staffSectionEnt.SectionID)
				dto.SectionNames = append(dto.SectionNames, staffSectionEnt.Edges.Section.Name)
			}
		}
		dto.CustomFields = staffEnt.CustomFields
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	err = nil
	return dto, nil
}

func (r *staffRepo) Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	userID := input.ID
	targetUserEnt, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasStaffWith(staff.DepartmentIDEQ(deptID)),
		).
		WithStaff().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, ErrStaffNotFound
		}
		return nil, err
	}
	if targetUserEnt.Edges.Staff == nil {
		return nil, ErrStaffNotFound
	}
	staffEnt := targetUserEnt.Edges.Staff
	staffRecordID := staffEnt.ID

	userQ := tx.User.UpdateOneID(userID).
		SetName(input.Name).
		SetNillableEmail(&input.Email).
		SetNillablePhone(&input.Phone).
		SetNillableActive(&input.Active).
		SetNillableAvatar(&input.Avatar)

	if input.Password != nil && *input.Password != "" {
		pwdHash, _ := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		userQ.SetPassword(string(pwdHash))
	}

	userEnt, err := userQ.Save(ctx)

	if err != nil {
		return nil, err
	}

	var sectionNamesStr string
	var sectionNames []string

	// Edge – Sections
	if input.SectionIDs != nil {
		sectionIDs := utils.DedupInt(input.SectionIDs, -1)

		if _, err = tx.StaffSection.
			Delete().
			Where(staffsection.StaffIDEQ(staffRecordID)).
			Exec(ctx); err != nil {
			return nil, err
		}

		if len(sectionIDs) > 0 {
			bulk := make([]*generated.StaffSectionCreate, 0, len(sectionIDs))
			for _, sid := range sectionIDs {
				bulk = append(bulk, tx.StaffSection.Create().
					SetStaffID(staffRecordID).
					SetSectionID(sid),
				)
			}
			if err = tx.StaffSection.CreateBulk(bulk...).Exec(ctx); err != nil {
				return nil, err
			}

			// get section names
			rows := make([]struct {
				ID   int    `json:"id"`
				Name string `json:"name"`
			}, 0, len(sectionIDs))

			if err := tx.Section.
				Query().
				Where(section.IDIn(sectionIDs...)).
				Select(section.FieldID, section.FieldName).
				Scan(ctx, &rows); err != nil {
				return nil, err
			}

			// map id -> name
			nameByID := make(map[int]string, len(rows))
			for _, r := range rows {
				nameByID[r.ID] = r.Name
			}

			sectionNames = make([]string, 0, len(sectionIDs))
			for _, id := range sectionIDs {
				if n, ok := nameByID[id]; ok {
					sectionNames = append(sectionNames, n)
				}
			}

			sectionNamesStr = strings.Join(sectionNames, "|")
		}
	}

	staffQ := tx.Staff.UpdateOneID(staffRecordID).
		SetNillableSectionNames(&sectionNamesStr)

	// customfields
	_, err = customfields.PrepareCustomFields(ctx,
		r.cfMgr,
		[]string{"staff"},
		input.CustomFields,
		staffQ,
		false,
	)
	if err != nil {
		return nil, err
	}

	_, err = staffQ.Save(ctx)

	if err != nil {
		return nil, err
	}

	// Edge – Roles
	if input.RoleIDs != nil {
		roleIDs := utils.DedupInt(input.RoleIDs, -1)
		if err = validateAssignableStaffRoleIDsInTx(ctx, tx, roleIDs); err != nil {
			return nil, err
		}

		upd := tx.User.UpdateOneID(userEnt.ID).ClearRoles()
		if len(roleIDs) > 0 {
			upd = upd.AddRoleIDs(roleIDs...)
		}
		if _, err = upd.Save(ctx); err != nil {
			return nil, err
		}
	}

	dto := mapper.MapAs[*generated.User, *model.StaffDTO](userEnt)
	setDepartmentIDFromPersistedStaff(dto, staffEnt.DepartmentID)
	dto.SectionIDs = input.SectionIDs
	dto.SectionNames = sectionNames
	dto.RoleIDs = input.RoleIDs
	dto.CustomFields = input.CustomFields

	return dto, nil
}

func (r *staffRepo) AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	staffEnt, err := tx.Staff.Query().
		Where(
			staff.DepartmentIDEQ(sourceDeptID),
			staff.HasUserWith(
				user.IDEQ(userID),
				user.DeletedAtIsNil(),
			),
		).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, ErrStaffNotFound
		}
		return nil, err
	}

	_, err = tx.Department.Query().
		Where(
			department.IDEQ(destinationDeptID),
			department.Deleted(false),
			department.Or(
				department.IDEQ(sourceDeptID),
				department.ParentIDEQ(sourceDeptID),
			),
		).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, ErrDepartmentScopeForbidden
		}
		return nil, err
	}

	updatedStaffEnt, err := tx.Staff.UpdateOneID(staffEnt.ID).
		SetDepartmentID(destinationDeptID).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	if err = ensureDepartmentMembershipInTx(ctx, tx, userID, destinationDeptID); err != nil {
		return nil, err
	}

	userEnt, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	sectionIDs, err := updatedStaffEnt.QuerySections().
		Select(staffsection.FieldSectionID).
		Ints(ctx)
	if err != nil {
		return nil, err
	}

	roleIDs, err := userEnt.QueryRoles().IDs(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.User, *model.StaffDTO](userEnt)
	setDepartmentIDFromPersistedStaff(dto, updatedStaffEnt.DepartmentID)
	dto.SectionIDs = sectionIDs
	dto.RoleIDs = roleIDs
	if updatedStaffEnt.SectionNames != nil {
		dto.SectionNames = strings.Split(*updatedStaffEnt.SectionNames, "|")
	}
	if updatedStaffEnt.CustomFields != nil {
		dto.CustomFields = updatedStaffEnt.CustomFields
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	err = nil
	return dto, nil
}

func (r *staffRepo) AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) (*CorporateAdminAssignmentResult, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	deptEnt, err := validateCorporateAdminTargetInTx(ctx, tx, userID, departmentID)
	if err != nil {
		return nil, err
	}

	previousCorporateAdminID := deptEnt.CorporateAdministratorID

	if _, err = tx.Department.UpdateOneID(departmentID).
		SetCorporateAdministratorID(userID).
		Save(ctx); err != nil {
		return nil, err
	}

	if err = SyncDepartmentCorporateAdminInTx(ctx, tx, userID, departmentID); err != nil {
		return nil, err
	}

	if previousCorporateAdminID != nil && *previousCorporateAdminID > 0 && *previousCorporateAdminID != userID {
		if err = removeCorporateAdminRoleIfUnusedInTx(ctx, tx, *previousCorporateAdminID, departmentID); err != nil {
			return nil, err
		}
	}

	return &CorporateAdminAssignmentResult{
		PreviousCorporateAdminID: previousCorporateAdminID,
		CurrentCorporateAdminID:  userID,
	}, nil
}

func (r *staffRepo) UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) (int, error) {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	if _, err = validateCorporateAdminTargetInTx(ctx, tx, userID, departmentID); err != nil {
		return 0, err
	}

	deptEnt, err := tx.Department.Query().
		Where(
			department.IDEQ(departmentID),
			department.Deleted(false),
			department.CorporateAdministratorIDEQ(userID),
		).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return 0, fmt.Errorf("staff is not the department corporate admin")
		}
		return 0, err
	}

	if err = tx.Department.UpdateOneID(deptEnt.ID).
		ClearCorporateAdministratorID().
		Exec(ctx); err != nil {
		return 0, err
	}

	if err = removeCorporateAdminRoleIfUnusedInTx(ctx, tx, userID, departmentID); err != nil {
		return 0, err
	}

	return userID, nil
}

func validateCorporateAdminTargetInTx(ctx context.Context, tx *generated.Tx, userID int, departmentID int) (*generated.Department, error) {
	if userID <= 0 {
		return nil, fmt.Errorf("user not found")
	}
	if departmentID <= 0 {
		return nil, fmt.Errorf("department not found")
	}

	userExists, err := tx.User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
		).
		Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !userExists {
		return nil, fmt.Errorf("user not found")
	}

	deptEnt, err := tx.Department.Query().
		Where(
			department.IDEQ(departmentID),
			department.Deleted(false),
		).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, fmt.Errorf("department not found")
		}
		return nil, err
	}

	return deptEnt, nil
}

func (r *staffRepo) ChangePassword(ctx context.Context, id int, newPassword string) error {
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	const updateQuery = `UPDATE users SET password = $2 WHERE id = $1`
	_, err = r.deps.DB.ExecContext(ctx, updateQuery, id, string(newHash))
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

func (r *staffRepo) CheckPhoneExists(ctx context.Context, userID int, phone string) (bool, error) {
	return r.db.User.Query().
		Where(user.IDNEQ(userID), user.PhoneEQ(phone), user.DeletedAtIsNil()).
		Exist(ctx)
}

func (r *staffRepo) CheckEmailExists(ctx context.Context, userID int, email string) (bool, error) {
	return r.db.User.Query().
		Where(user.IDNEQ(userID), user.EmailEQ(email), user.DeletedAtIsNil()).
		Exist(ctx)
}

func (r *staffRepo) GetByID(ctx context.Context, id int) (*model.StaffDTO, error) {
	userEnt, err := r.db.User.Query().
		Where(
			user.IDEQ(id),
			user.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	staffEnt, err := r.db.Staff.
		Query().
		Where(staff.HasUserWith(user.IDEQ(id))).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	sectionIDs, err := staffEnt.
		QuerySections().
		Select(staffsection.FieldSectionID).
		Ints(ctx)
	if err != nil {
		return nil, err
	}

	roleIDs, err := userEnt.QueryRoles().IDs(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.User, *model.StaffDTO](userEnt)
	departmentID, err := r.getDepartmentIDByUserID(ctx, id)
	if err != nil {
		return nil, err
	}
	dto.DepartmentID = departmentID
	if departmentID != nil {
		deptEnt, err := r.db.Department.Query().
			Where(department.IDEQ(*departmentID)).
			Only(ctx)
		if err != nil {
			return nil, err
		}
		dto.DepartmentName = &deptEnt.Name
	}
	dto.SectionIDs = sectionIDs
	dto.RoleIDs = roleIDs

	if staffEnt.SectionNames != nil {
		sn := staffEnt.SectionNames
		sectionNames := strings.Split(*sn, "|")
		dto.SectionNames = sectionNames
	}

	if staffEnt.CustomFields != nil {
		dto.CustomFields = staffEnt.CustomFields
	}

	return dto, nil
}

func (r *staffRepo) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	deptEnt, err := r.db.Department.Query().
		Where(department.IDEQ(deptID)).
		Only(ctx)
	if err != nil {
		var zero table.TableListResult[model.StaffDTO]
		return zero, err
	}

	list, err := table.TableList(
		ctx,
		r.db.User.Query().
			Where(
				user.DeletedAtIsNil(),
				user.HasStaff(),
				user.HasDeptMembershipsWith(departmentmember.DepartmentIDEQ(deptID)),
			).
			WithRoles().
			WithStaff(func(sq *generated.StaffQuery) {
				sq.WithSections(func(ssq *generated.StaffSectionQuery) {
					ssq.WithSection()
				})
			}),
		query,
		user.Table,
		user.FieldID,
		user.FieldID,
		func(src []*generated.User) []*model.StaffDTO {
			out := make([]*model.StaffDTO, 0, len(src))
			for _, u := range src {
				dto := mapper.MapAs[*generated.User, *model.StaffDTO](u)
				dto.DepartmentID = &deptID
				dto.DepartmentName = &deptEnt.Name
				for _, roleEnt := range u.Edges.Roles {
					dto.RoleIDs = append(dto.RoleIDs, roleEnt.ID)
					dto.RoleNames = append(dto.RoleNames, roleEnt.RoleName)
				}
				if u.Edges.Staff != nil {
					st := u.Edges.Staff

					for _, ss := range st.Edges.Sections {
						if ss.Edges.Section != nil {
							dto.SectionIDs = append(dto.SectionIDs, ss.SectionID)
							dto.SectionNames = append(dto.SectionNames, ss.Edges.Section.Name)
						}
					}

					// customfields
					dto.CustomFields = st.CustomFields
				}
				out = append(out, dto)
			}
			return out
		},
	)
	if err != nil {
		var zero table.TableListResult[model.StaffDTO]
		return zero, err
	}
	return list, nil
}

func (r *staffRepo) ListBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	q := r.db.User.
		Query().
		Where(
			user.DeletedAtIsNil(),
			user.HasStaffWith(
				staff.HasSectionsWith(
					staffsection.SectionIDEQ(sectionID),
				),
			),
		).
		WithStaff(func(sq *generated.StaffQuery) {
			sq.WithSections(func(ssq *generated.StaffSectionQuery) {
				ssq.WithSection()
			})
		})

	return table.TableList(
		ctx,
		q,
		query,
		user.Table,
		user.FieldID,
		user.FieldID,
		func(src []*generated.User) []*model.StaffDTO {
			userIDs := make([]int, 0, len(src))
			for _, u := range src {
				userIDs = append(userIDs, u.ID)
			}
			deptByUserID, err := r.getDepartmentMapByUserIDs(ctx, userIDs)
			if err != nil {
				deptByUserID = map[int]staffDepartmentInfo{}
			}

			out := make([]*model.StaffDTO, 0, len(src))
			for _, u := range src {
				dto := mapper.MapAs[*generated.User, *model.StaffDTO](u)
				deptInfo := deptByUserID[u.ID]
				setDepartmentFromPersistedStaff(dto, deptInfo.ID, deptInfo.Name)
				if u.Edges.Staff != nil {
					st := u.Edges.Staff

					for _, ss := range st.Edges.Sections {
						if ss.Edges.Section != nil {
							dto.SectionIDs = append(dto.SectionIDs, ss.SectionID)
							dto.SectionNames = append(dto.SectionNames, ss.Edges.Section.Name)
						}
					}

					// customfields
					dto.CustomFields = st.CustomFields
				}
				out = append(out, dto)
			}
			return out
		},
	)
}

func (r *staffRepo) ListByRoleName(ctx context.Context, roleName string, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	q := r.db.User.
		Query().
		Where(
			user.DeletedAtIsNil(),
			user.HasRolesWith(role.RoleNameEQ(roleName)),
		).
		WithStaff(func(sq *generated.StaffQuery) {
			sq.WithSections(func(ssq *generated.StaffSectionQuery) {
				ssq.WithSection()
			})
		})

	return table.TableList(
		ctx,
		q,
		query,
		user.Table,
		user.FieldID,
		user.FieldID,
		func(src []*generated.User) []*model.StaffDTO {
			userIDs := make([]int, 0, len(src))
			for _, u := range src {
				userIDs = append(userIDs, u.ID)
			}
			deptByUserID, err := r.getDepartmentMapByUserIDs(ctx, userIDs)
			if err != nil {
				deptByUserID = map[int]staffDepartmentInfo{}
			}

			out := make([]*model.StaffDTO, 0, len(src))
			for _, u := range src {
				dto := mapper.MapAs[*generated.User, *model.StaffDTO](u)
				deptInfo := deptByUserID[u.ID]
				setDepartmentFromPersistedStaff(dto, deptInfo.ID, deptInfo.Name)
				if u.Edges.Staff != nil {
					st := u.Edges.Staff

					for _, ss := range st.Edges.Sections {
						if ss.Edges.Section != nil {
							dto.SectionIDs = append(dto.SectionIDs, ss.SectionID)
							dto.SectionNames = append(dto.SectionNames, ss.Edges.Section.Name)
						}
					}

					// customfields
					dto.CustomFields = st.CustomFields
				}
				out = append(out, dto)
			}
			return out
		},
	)
}

func (r *staffRepo) Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.Search(
		ctx,
		r.db.User.Query().
			Where(
				user.DeletedAtIsNil(),
				user.HasStaff(),
			),
		[]string{
			dbutils.GetNormField(user.FieldName),
			dbutils.GetNormField(user.FieldPhone),
			dbutils.GetNormField(user.FieldEmail),
		},
		query,
		user.Table,
		user.FieldID,
		user.FieldID,
		user.Or,
		func(src []*generated.User) []*model.StaffDTO {
			mapped := mapper.MapListAs[*generated.User, *model.StaffDTO](src)
			userIDs := make([]int, 0, len(src))
			for _, u := range src {
				userIDs = append(userIDs, u.ID)
			}
			deptByUserID, err := r.getDepartmentMapByUserIDs(ctx, userIDs)
			if err != nil {
				return mapped
			}
			for _, dto := range mapped {
				deptInfo := deptByUserID[dto.ID]
				setDepartmentFromPersistedStaff(dto, deptInfo.ID, deptInfo.Name)
			}
			return mapped
		},
	)
}

func (r *staffRepo) SearchWithRoleName(ctx context.Context, roleName string, query dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	return dbutils.Search(
		ctx,
		r.db.User.Query().
			Where(
				user.DeletedAtIsNil(),
				user.HasStaff(),
				user.HasRolesWith(role.RoleNameEQ(roleName)),
			),
		[]string{
			dbutils.GetNormField(user.FieldName),
			dbutils.GetNormField(user.FieldPhone),
			dbutils.GetNormField(user.FieldEmail),
		},
		query,
		user.Table,
		user.FieldID,
		user.FieldID,
		user.Or,
		func(src []*generated.User) []*model.StaffDTO {
			mapped := mapper.MapListAs[*generated.User, *model.StaffDTO](src)
			userIDs := make([]int, 0, len(src))
			for _, u := range src {
				userIDs = append(userIDs, u.ID)
			}
			deptByUserID, err := r.getDepartmentMapByUserIDs(ctx, userIDs)
			if err != nil {
				return mapped
			}
			for _, dto := range mapped {
				deptInfo := deptByUserID[dto.ID]
				setDepartmentFromPersistedStaff(dto, deptInfo.ID, deptInfo.Name)
			}
			return mapped
		},
	)
}

func (r *staffRepo) Delete(ctx context.Context, deptID int, userID int) error {
	affected, err := r.db.User.Update().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasStaffWith(staff.DepartmentIDEQ(deptID)),
		).
		SetDeletedAt(time.Now()).
		Save(ctx)
	if err != nil {
		return err
	}
	if affected != 1 {
		return ErrStaffNotFound
	}
	return nil
}
