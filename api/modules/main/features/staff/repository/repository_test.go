package repository

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/role"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/staff"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type staffTestCustomFieldStore struct{}

func (staffTestCustomFieldStore) GetIDBySlug(ctx context.Context, slug string) (*int, error) {
	return nil, customfields.ErrCollectionNotFound
}

func (staffTestCustomFieldStore) LoadSchema(ctx context.Context, collectionSlug string) (*customfields.Schema, error) {
	return &customfields.Schema{Collection: collectionSlug}, nil
}

func newStaffTestRepo(t *testing.T) (*staffRepo, *generated.Client) {
	t.Helper()

	db := enttest.Open(t, "sqlite3", fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", t.Name()),
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close ent client: %v", err)
		}
	})

	return &staffRepo{
		db:    db,
		cfMgr: customfields.NewManager(staffTestCustomFieldStore{}),
	}, db
}

func createStaffUser(t *testing.T, ctx context.Context, db *generated.Client, deptID int, name string) *generated.User {
	t.Helper()

	userEnt := createUserAccount(t, ctx, db, name)

	if _, err := db.Staff.Create().
		SetUserID(userEnt.ID).
		SetDepartmentID(deptID).
		Save(ctx); err != nil {
		t.Fatalf("create staff for user %d: %v", userEnt.ID, err)
	}

	return userEnt
}

func createUserAccount(t *testing.T, ctx context.Context, db *generated.Client, name string) *generated.User {
	t.Helper()

	userEnt, err := db.User.Create().
		SetName(name).
		SetPassword("hashed").
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetActive(true).
		Save(ctx)
	if err != nil {
		t.Fatalf("create user %q: %v", name, err)
	}

	return userEnt
}

func createCorporateAdminRole(t *testing.T, ctx context.Context, db *generated.Client) *generated.Role {
	t.Helper()

	return createRole(t, ctx, db, "corporate_admin", "Corporate Admin")
}

func createRole(t *testing.T, ctx context.Context, db *generated.Client, roleName string, displayName string) *generated.Role {
	t.Helper()

	roleEnt, err := db.Role.Create().
		SetRoleName(roleName).
		SetDisplayName(displayName).
		Save(ctx)
	if err != nil {
		t.Fatalf("create role %q: %v", roleName, err)
	}
	return roleEnt
}

func createDepartment(t *testing.T, ctx context.Context, db *generated.Client, name string, parentID *int) *generated.Department {
	t.Helper()

	create := db.Department.Create().
		SetName(name)
	if parentID != nil {
		create.SetParentID(*parentID)
	}
	deptEnt, err := create.Save(ctx)
	if err != nil {
		t.Fatalf("create department %q: %v", name, err)
	}
	return deptEnt
}

func requireUserName(t *testing.T, ctx context.Context, db *generated.Client, userID int, want string) {
	t.Helper()

	userEnt, err := db.User.Query().Where(user.IDEQ(userID)).Only(ctx)
	if err != nil {
		t.Fatalf("query user %d: %v", userID, err)
	}
	if userEnt.Name != want {
		t.Fatalf("user %d name = %q, want %q", userID, userEnt.Name, want)
	}
}

func requireUserDeleted(t *testing.T, ctx context.Context, db *generated.Client, userID int, want bool) {
	t.Helper()

	userEnt, err := db.User.Query().Where(user.IDEQ(userID)).Only(ctx)
	if err != nil {
		t.Fatalf("query user %d: %v", userID, err)
	}
	got := userEnt.DeletedAt != nil
	if got != want {
		t.Fatalf("user %d deleted = %v, want %v", userID, got, want)
	}
}

func requireStaffDepartment(t *testing.T, ctx context.Context, db *generated.Client, userID int, wantDeptID int) {
	t.Helper()

	staffEnt, err := db.Staff.Query().
		Where(staff.HasUserWith(user.IDEQ(userID))).
		Only(ctx)
	if err != nil {
		t.Fatalf("query staff for user %d: %v", userID, err)
	}
	if staffEnt.DepartmentID == nil || *staffEnt.DepartmentID != wantDeptID {
		t.Fatalf("staff department id = %v, want %d", staffEnt.DepartmentID, wantDeptID)
	}
}

func requireDepartmentMembership(t *testing.T, ctx context.Context, db *generated.Client, userID int, departmentID int, want bool) {
	t.Helper()

	exists, err := db.DepartmentMember.Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.DepartmentIDEQ(departmentID),
		).
		Exist(ctx)
	if err != nil {
		t.Fatalf("query department membership user %d department %d: %v", userID, departmentID, err)
	}
	if exists != want {
		t.Fatalf("department membership user %d department %d exists = %v, want %v", userID, departmentID, exists, want)
	}
}

func requireCorporateAdministrator(t *testing.T, ctx context.Context, db *generated.Client, departmentID int, want *int) {
	t.Helper()

	deptEnt, err := db.Department.Query().
		Where(department.IDEQ(departmentID)).
		Only(ctx)
	if err != nil {
		t.Fatalf("query department %d: %v", departmentID, err)
	}
	if want == nil {
		if deptEnt.CorporateAdministratorID != nil {
			t.Fatalf("department %d corporate admin = %v, want nil", departmentID, deptEnt.CorporateAdministratorID)
		}
		return
	}
	if deptEnt.CorporateAdministratorID == nil || *deptEnt.CorporateAdministratorID != *want {
		t.Fatalf("department %d corporate admin = %v, want %d", departmentID, deptEnt.CorporateAdministratorID, *want)
	}
}

func requireUserRole(t *testing.T, ctx context.Context, db *generated.Client, userID int, roleName string, want bool) {
	t.Helper()

	exists, err := db.User.Query().
		Where(
			user.IDEQ(userID),
			user.HasRolesWith(role.RoleNameEQ(roleName)),
		).
		Exist(ctx)
	if err != nil {
		t.Fatalf("query user %d role %q: %v", userID, roleName, err)
	}
	if exists != want {
		t.Fatalf("user %d role %q exists = %v, want %v", userID, roleName, exists, want)
	}
}

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

func TestAddExistingStaffToDepartmentCreatesMembershipWithoutMovingStaffRecord(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	sourceDept := createDepartment(t, ctx, db, "source", nil)
	destinationDept := createDepartment(t, ctx, db, "destination", nil)
	userEnt := createStaffUser(t, ctx, db, sourceDept.ID, "existing-staff")

	dto, err := repo.AddExistingStaffToDepartment(ctx, destinationDept.ID, userEnt.ID)
	if err != nil {
		t.Fatalf("AddExistingStaffToDepartment() error = %v", err)
	}

	requireDepartmentMembership(t, ctx, db, userEnt.ID, destinationDept.ID, true)
	requireStaffDepartment(t, ctx, db, userEnt.ID, sourceDept.ID)
	if dto == nil || dto.ID != userEnt.ID {
		t.Fatalf("dto = %+v, want user id %d", dto, userEnt.ID)
	}
	if dto.DepartmentID == nil || *dto.DepartmentID != destinationDept.ID {
		t.Fatalf("dto department id = %v, want %d", dto.DepartmentID, destinationDept.ID)
	}
}

func TestAddExistingStaffToDepartmentRejectsUserWithoutStaffRecord(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	dept := createDepartment(t, ctx, db, "destination", nil)
	userEnt := createUserAccount(t, ctx, db, "not-staff")

	_, err := repo.AddExistingStaffToDepartment(ctx, dept.ID, userEnt.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("AddExistingStaffToDepartment() error = %v, want %v", err, ErrStaffNotFound)
	}
	requireDepartmentMembership(t, ctx, db, userEnt.ID, dept.ID, false)
}

func TestCreateRejectsSystemAdminRole(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	dept := createDepartment(t, ctx, db, "staff-create-admin-role", nil)
	adminRole := createRole(t, ctx, db, "admin", "Administrator")
	password := "valid-password"

	_, err := repo.Create(ctx, dept.ID, model.StaffDTO{
		Name:     "blocked-admin-role",
		Email:    "blocked-admin-role@example.test",
		Phone:    "+84900000001",
		Active:   true,
		Password: &password,
		RoleIDs:  []int{adminRole.ID},
	})
	if !errors.Is(err, ErrSystemAdminRoleForbidden) {
		t.Fatalf("Create() error = %v, want %v", err, ErrSystemAdminRoleForbidden)
	}
}

func TestUpdateRejectsSystemAdminRole(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	dept := createDepartment(t, ctx, db, "staff-update-admin-role", nil)
	userEnt := createStaffUser(t, ctx, db, dept.ID, "blocked-update-admin-role")
	adminRole := createRole(t, ctx, db, "admin", "Administrator")

	_, err := repo.Update(ctx, dept.ID, model.StaffDTO{
		ID:      userEnt.ID,
		Name:    "blocked-update-admin-role",
		Email:   "blocked-update-admin-role@example.test",
		Phone:   "+84900000002",
		Active:  true,
		RoleIDs: []int{adminRole.ID},
	})
	if !errors.Is(err, ErrSystemAdminRoleForbidden) {
		t.Fatalf("Update() error = %v, want %v", err, ErrSystemAdminRoleForbidden)
	}
}

func TestListUsesDepartmentMemberships(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	sourceDept := createDepartment(t, ctx, db, "source", nil)
	listDept := createDepartment(t, ctx, db, "list-dept", nil)
	userEnt := createStaffUser(t, ctx, db, sourceDept.ID, "listed-by-membership")
	requireStaffDepartment(t, ctx, db, userEnt.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, userEnt.ID, listDept.ID, false)

	res, err := repo.List(ctx, listDept.ID, table.TableQuery{Limit: 20, Page: 1})
	if err != nil {
		t.Fatalf("List(before membership) error = %v", err)
	}
	if len(res.Items) != 0 {
		t.Fatalf("List(before membership) count = %d, want 0", len(res.Items))
	}

	if _, err := repo.AddExistingStaffToDepartment(ctx, listDept.ID, userEnt.ID); err != nil {
		t.Fatalf("AddExistingStaffToDepartment() error = %v", err)
	}

	res, err = repo.List(ctx, listDept.ID, table.TableQuery{Limit: 20, Page: 1})
	if err != nil {
		t.Fatalf("List(after membership) error = %v", err)
	}
	if len(res.Items) != 1 {
		t.Fatalf("List(after membership) count = %d, want 1", len(res.Items))
	}
	if res.Items[0].ID != userEnt.ID {
		t.Fatalf("listed user id = %d, want %d", res.Items[0].ID, userEnt.ID)
	}
	if res.Items[0].DepartmentID == nil || *res.Items[0].DepartmentID != listDept.ID {
		t.Fatalf("listed department id = %v, want %d", res.Items[0].DepartmentID, listDept.ID)
	}
	requireStaffDepartment(t, ctx, db, userEnt.ID, sourceDept.ID)
}

func TestStaffRepositoryUpdateRequiresRouteDepartmentOwnership(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	target := createStaffUser(t, ctx, db, 10, "target")
	otherDeptTarget := createStaffUser(t, ctx, db, 20, "other")

	updated, err := repo.Update(ctx, 10, model.StaffDTO{
		ID:     target.ID,
		Name:   "target updated",
		Email:  "target-updated@example.test",
		Active: true,
	})
	if err != nil {
		t.Fatalf("Update() same department error = %v", err)
	}
	if updated.ID != target.ID {
		t.Fatalf("Update() id = %d, want %d", updated.ID, target.ID)
	}
	if updated.DepartmentID == nil || *updated.DepartmentID != 10 {
		t.Fatalf("Update() department id = %v, want 10", updated.DepartmentID)
	}
	requireUserName(t, ctx, db, target.ID, "target updated")

	_, err = repo.Update(ctx, 10, model.StaffDTO{
		ID:     otherDeptTarget.ID,
		Name:   "should not mutate",
		Email:  "other-updated@example.test",
		Active: true,
	})
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Update() cross department error = %v, want ErrStaffNotFound", err)
	}
	requireUserName(t, ctx, db, otherDeptTarget.ID, "other")
}

func TestStaffRepositoryDeleteRequiresRouteDepartmentOwnership(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	target := createStaffUser(t, ctx, db, 10, "delete-target")
	otherDeptTarget := createStaffUser(t, ctx, db, 20, "delete-other")

	if err := repo.Delete(ctx, 10, target.ID); err != nil {
		t.Fatalf("Delete() same department error = %v", err)
	}
	requireUserDeleted(t, ctx, db, target.ID, true)

	err := repo.Delete(ctx, 10, otherDeptTarget.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Delete() cross department error = %v, want ErrStaffNotFound", err)
	}
	requireUserDeleted(t, ctx, db, otherDeptTarget.ID, false)
}

func TestStaffRepositoryUpdateDeleteMissingTargetsReturnStaffNotFound(t *testing.T) {
	ctx := context.Background()
	repo, _ := newStaffTestRepo(t)

	if _, err := repo.Update(ctx, 10, model.StaffDTO{
		ID:     999,
		Name:   "missing",
		Active: true,
	}); !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Update() missing target error = %v, want ErrStaffNotFound", err)
	}

	if err := repo.Delete(ctx, 10, 999); !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("Delete() missing target error = %v, want ErrStaffNotFound", err)
	}
}

func TestStaffRepositoryAssignAllowsSourceDepartmentSelf(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-self")

	dto, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, sourceDept.ID)
	if err != nil {
		t.Fatalf("AssignStaffToDepartment() self error = %v", err)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != sourceDept.ID {
		t.Fatalf("AssignStaffToDepartment() dto department id = %v, want %d", dto, sourceDept.ID)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, sourceDept.ID, true)
}

func TestStaffRepositoryAssignAllowsDirectChildDepartment(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-child")

	dto, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if err != nil {
		t.Fatalf("AssignStaffToDepartment() child error = %v", err)
	}
	if dto == nil || dto.DepartmentID == nil || *dto.DepartmentID != childDept.ID {
		t.Fatalf("AssignStaffToDepartment() dto department id = %v, want %d", dto, childDept.ID)
	}
	requireStaffDepartment(t, ctx, db, target.ID, childDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, true)
}

func TestStaffRepositoryAssignRejectsUnrelatedDepartmentWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	unrelatedDept := createDepartment(t, ctx, db, "unrelated", nil)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-unrelated")

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, unrelatedDept.ID)
	if !errors.Is(err, ErrDepartmentScopeForbidden) {
		t.Fatalf("AssignStaffToDepartment() unrelated error = %v, want ErrDepartmentScopeForbidden", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, unrelatedDept.ID, false)
}

func TestStaffRepositoryAssignRejectsStaffOutsideSourceDepartmentWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	otherDept := createDepartment(t, ctx, db, "other", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, otherDept.ID, "assign-cross-source")

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("AssignStaffToDepartment() cross source error = %v, want ErrStaffNotFound", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, otherDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, false)
}

func TestStaffRepositoryAssignRejectsDeletedUserWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)

	sourceDept := createDepartment(t, ctx, db, "source", nil)
	childDept := createDepartment(t, ctx, db, "child", &sourceDept.ID)
	target := createStaffUser(t, ctx, db, sourceDept.ID, "assign-deleted-user")
	if err := db.User.UpdateOneID(target.ID).SetDeletedAt(time.Now()).Exec(ctx); err != nil {
		t.Fatalf("mark user deleted: %v", err)
	}

	_, err := repo.AssignStaffToDepartment(ctx, sourceDept.ID, target.ID, childDept.ID)
	if !errors.Is(err, ErrStaffNotFound) {
		t.Fatalf("AssignStaffToDepartment() deleted user error = %v, want ErrStaffNotFound", err)
	}
	requireStaffDepartment(t, ctx, db, target.ID, sourceDept.ID)
	requireDepartmentMembership(t, ctx, db, target.ID, childDept.ID, false)
}

func TestStaffRepositoryAssignCorporateAdminUsesUserIDAndAllowsManyDepartments(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	createCorporateAdminRole(t, ctx, db)

	firstDept := createDepartment(t, ctx, db, "corp-admin-first", nil)
	secondDept := createDepartment(t, ctx, db, "corp-admin-second", nil)
	targetUser := createUserAccount(t, ctx, db, "corp-admin-user")

	firstResult, err := repo.AssignCorporateAdminToDepartment(ctx, targetUser.ID, firstDept.ID)
	if err != nil {
		t.Fatalf("AssignCorporateAdminToDepartment() first error = %v", err)
	}
	if firstResult == nil || firstResult.CurrentCorporateAdminID != targetUser.ID {
		t.Fatalf("first result = %+v, want current users.id %d", firstResult, targetUser.ID)
	}

	secondResult, err := repo.AssignCorporateAdminToDepartment(ctx, targetUser.ID, secondDept.ID)
	if err != nil {
		t.Fatalf("AssignCorporateAdminToDepartment() second error = %v", err)
	}
	if secondResult == nil || secondResult.CurrentCorporateAdminID != targetUser.ID {
		t.Fatalf("second result = %+v, want current users.id %d", secondResult, targetUser.ID)
	}

	requireCorporateAdministrator(t, ctx, db, firstDept.ID, &targetUser.ID)
	requireCorporateAdministrator(t, ctx, db, secondDept.ID, &targetUser.ID)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, firstDept.ID, true)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, secondDept.ID, true)
	requireUserRole(t, ctx, db, targetUser.ID, "corporate_admin", true)
}

func TestStaffRepositoryUnassignCorporateAdminKeepsRoleWhenUserAdminsAnotherDepartment(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	createCorporateAdminRole(t, ctx, db)

	firstDept := createDepartment(t, ctx, db, "unassign-first", nil)
	secondDept := createDepartment(t, ctx, db, "unassign-second", nil)
	targetUser := createUserAccount(t, ctx, db, "unassign-multi")

	if _, err := repo.AssignCorporateAdminToDepartment(ctx, targetUser.ID, firstDept.ID); err != nil {
		t.Fatalf("assign first: %v", err)
	}
	if _, err := repo.AssignCorporateAdminToDepartment(ctx, targetUser.ID, secondDept.ID); err != nil {
		t.Fatalf("assign second: %v", err)
	}

	unassignedUserID, err := repo.UnassignCorporateAdminFromDepartment(ctx, targetUser.ID, firstDept.ID)
	if err != nil {
		t.Fatalf("UnassignCorporateAdminFromDepartment() error = %v", err)
	}
	if unassignedUserID != targetUser.ID {
		t.Fatalf("unassigned user id = %d, want %d", unassignedUserID, targetUser.ID)
	}

	requireCorporateAdministrator(t, ctx, db, firstDept.ID, nil)
	requireCorporateAdministrator(t, ctx, db, secondDept.ID, &targetUser.ID)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, firstDept.ID, true)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, secondDept.ID, true)
	requireUserRole(t, ctx, db, targetUser.ID, "corporate_admin", true)
}

func TestStaffRepositoryUnassignCorporateAdminRemovesRoleWhenLastDepartment(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	createCorporateAdminRole(t, ctx, db)

	deptEnt := createDepartment(t, ctx, db, "unassign-last", nil)
	targetUser := createUserAccount(t, ctx, db, "unassign-last-user")

	if _, err := repo.AssignCorporateAdminToDepartment(ctx, targetUser.ID, deptEnt.ID); err != nil {
		t.Fatalf("assign: %v", err)
	}
	requireUserRole(t, ctx, db, targetUser.ID, "corporate_admin", true)

	if _, err := repo.UnassignCorporateAdminFromDepartment(ctx, targetUser.ID, deptEnt.ID); err != nil {
		t.Fatalf("UnassignCorporateAdminFromDepartment() error = %v", err)
	}

	requireCorporateAdministrator(t, ctx, db, deptEnt.ID, nil)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, deptEnt.ID, true)
	requireUserRole(t, ctx, db, targetUser.ID, "corporate_admin", false)
}

func TestStaffRepositoryAssignCorporateAdminRejectsMissingOrDeletedTargetsWithoutMutation(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	createCorporateAdminRole(t, ctx, db)

	deptEnt := createDepartment(t, ctx, db, "reject-targets", nil)
	deletedDept := createDepartment(t, ctx, db, "reject-deleted-dept", nil)
	targetUser := createUserAccount(t, ctx, db, "reject-user")
	deletedUser := createUserAccount(t, ctx, db, "reject-deleted-user")

	if err := db.Department.UpdateOneID(deletedDept.ID).SetDeleted(true).Exec(ctx); err != nil {
		t.Fatalf("mark department deleted: %v", err)
	}
	if err := db.User.UpdateOneID(deletedUser.ID).SetDeletedAt(time.Now()).Exec(ctx); err != nil {
		t.Fatalf("mark user deleted: %v", err)
	}

	tests := []struct {
		name         string
		userID       int
		departmentID int
	}{
		{name: "missing user", userID: 9999, departmentID: deptEnt.ID},
		{name: "deleted user", userID: deletedUser.ID, departmentID: deptEnt.ID},
		{name: "missing department", userID: targetUser.ID, departmentID: 9999},
		{name: "deleted department", userID: targetUser.ID, departmentID: deletedDept.ID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := repo.AssignCorporateAdminToDepartment(ctx, tt.userID, tt.departmentID); err == nil {
				t.Fatal("AssignCorporateAdminToDepartment() error = nil, want error")
			}
		})
	}

	requireCorporateAdministrator(t, ctx, db, deptEnt.ID, nil)
	requireCorporateAdministrator(t, ctx, db, deletedDept.ID, nil)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, deptEnt.ID, false)
	requireDepartmentMembership(t, ctx, db, targetUser.ID, deletedDept.ID, false)
	requireUserRole(t, ctx, db, targetUser.ID, "corporate_admin", false)
}

func TestStaffRepositoryReplacingCorporateAdminRemovesPreviousRoleOnlyWhenUnused(t *testing.T) {
	ctx := context.Background()
	repo, db := newStaffTestRepo(t)
	createCorporateAdminRole(t, ctx, db)

	firstDept := createDepartment(t, ctx, db, "replace-first", nil)
	secondDept := createDepartment(t, ctx, db, "replace-second", nil)
	previousUser := createUserAccount(t, ctx, db, "replace-previous")
	nextUser := createUserAccount(t, ctx, db, "replace-next")

	if _, err := repo.AssignCorporateAdminToDepartment(ctx, previousUser.ID, firstDept.ID); err != nil {
		t.Fatalf("assign previous first: %v", err)
	}
	if _, err := repo.AssignCorporateAdminToDepartment(ctx, previousUser.ID, secondDept.ID); err != nil {
		t.Fatalf("assign previous second: %v", err)
	}

	result, err := repo.AssignCorporateAdminToDepartment(ctx, nextUser.ID, firstDept.ID)
	if err != nil {
		t.Fatalf("replace first department admin: %v", err)
	}
	if result.PreviousCorporateAdminID == nil || *result.PreviousCorporateAdminID != previousUser.ID {
		t.Fatalf("previous admin = %v, want %d", result.PreviousCorporateAdminID, previousUser.ID)
	}

	requireCorporateAdministrator(t, ctx, db, firstDept.ID, &nextUser.ID)
	requireCorporateAdministrator(t, ctx, db, secondDept.ID, &previousUser.ID)
	requireUserRole(t, ctx, db, previousUser.ID, "corporate_admin", true)
	requireUserRole(t, ctx, db, nextUser.ID, "corporate_admin", true)

	if _, err := repo.AssignCorporateAdminToDepartment(ctx, nextUser.ID, secondDept.ID); err != nil {
		t.Fatalf("replace second department admin: %v", err)
	}

	requireCorporateAdministrator(t, ctx, db, secondDept.ID, &nextUser.ID)
	requireUserRole(t, ctx, db, previousUser.ID, "corporate_admin", false)
	requireUserRole(t, ctx, db, nextUser.ID, "corporate_admin", true)
}
