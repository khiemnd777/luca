package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/staff/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/module"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	"github.com/khiemnd777/noah_api/shared/pubsub"
	searchutils "github.com/khiemnd777/noah_api/shared/search"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type StaffService interface {
	Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error)
	AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error)
	Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error)
	AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error)
	AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) error
	UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) error
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

type staffService struct {
	repo  repository.StaffRepository
	deps  *module.ModuleDeps[config.ModuleConfig]
	cfMgr *customfields.Manager
}

type ErrConflict string

func (e ErrConflict) Error() string { return string(e) }

func (e ErrConflict) Is(target error) bool {
	_, ok := target.(ErrConflict)
	return ok
}

var ErrStaffNotFound = repository.ErrStaffNotFound
var ErrDepartmentScopeForbidden = repository.ErrDepartmentScopeForbidden
var ErrSystemAdminRoleForbidden = repository.ErrSystemAdminRoleForbidden

func NewStaffService(repo repository.StaffRepository, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) StaffService {
	return &staffService{repo: repo, deps: deps, cfMgr: cfMgr}
}

func kStaffByID(id int) string {
	return fmt.Sprintf("staff:id:%d", id)
}

func kStaffAll() []string {
	return []string{
		kStaffListAll(),
		kStaffSearchAll(),
		kStaffSectionAll(),
	}
}

func kStaffListAll() string {
	return "staff:list:*"
}

func kSectionStaffAll(staffID int) string {
	return fmt.Sprintf("section:staff:%d:*", staffID)
}

func kStaffSearchAll() string {
	return "staff:search:*"
}

func kStaffSectionAll() string {
	return "staff:section:*"
}

func kStaffSectionList(staffID int) string {
	return fmt.Sprintf("section:staff:%d:*", staffID)
}

func kUserRoleList(staffID int) string {
	return fmt.Sprintf("rbac:roles:user:%d:*", staffID)
}

func kUserDepartment(userID int) string {
	return fmt.Sprintf("user:%d:dept", userID)
}

func kDepartmentByID(id int) string {
	return fmt.Sprintf("department:v2:%d", id)
}

func kStaffList(deptID int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("staff:list:dept:%d:l%d:p%d:o%s:d%s", deptID, q.Limit, q.Page, orderBy, q.Direction)
}

func kSectionStaffList(sectionID int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("staff:section:%d:list:l%d:p%d:o%s:d%s", sectionID, q.Limit, q.Page, orderBy, q.Direction)
}

func kStaffByRole(roleName string, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("staff:role:%s:list:l%d:p%d:o%s:d%s", roleName, q.Limit, q.Page, orderBy, q.Direction)
}

func kStaffSearch(q dbutils.SearchQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("staff:search:k%s:l%d:p%d:o%s:d%s", q.Keyword, q.Limit, q.Page, orderBy, q.Direction)
}

func kStaffSearchWithRoleName(roleName string, q dbutils.SearchQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	return fmt.Sprintf("staff:search:r%s:k%s:l%d:p%d:o%s:d%s", roleName, q.Keyword, q.Limit, q.Page, orderBy, q.Direction)
}

func (s *staffService) Create(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	if input.Phone != "" {
		exists, err := s.repo.CheckPhoneExists(ctx, -1, input.Phone)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrConflict("phone already exists")
		}
	}
	if input.Email != "" {
		exists, err := s.repo.CheckEmailExists(ctx, -1, input.Email)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrConflict("email already exists")
		}
	}

	dto, err := s.repo.Create(ctx, deptID, input)
	if err != nil {
		if errors.Is(err, repository.ErrSystemAdminRoleForbidden) {
			return nil, ErrSystemAdminRoleForbidden
		}
		return nil, err
	}

	cache.InvalidateKeys(kStaffAll()...)
	if dto != nil && dto.ID > 0 {
		cache.InvalidateKeys(kStaffByID(dto.ID), kStaffSectionList(dto.ID), kUserRoleList(dto.ID), kSectionStaffAll(dto.ID))
	}

	// search index
	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *staffService) AddExistingStaffToDepartment(ctx context.Context, deptID int, userID int) (*model.StaffDTO, error) {
	dto, err := s.repo.AddExistingStaffToDepartment(ctx, deptID, userID)
	if err != nil {
		if errors.Is(err, repository.ErrStaffNotFound) {
			return nil, ErrStaffNotFound
		}
		if errors.Is(err, repository.ErrDepartmentScopeForbidden) {
			return nil, ErrDepartmentScopeForbidden
		}
		return nil, err
	}

	cache.InvalidateKeys(kStaffAll()...)
	cache.InvalidateKeys(kStaffByID(userID), kStaffSectionList(userID), kUserRoleList(userID), kSectionStaffAll(userID), kUserDepartment(userID))

	if dto != nil {
		s.upsertSearch(ctx, deptID, dto)
	}

	return dto, nil
}

func (s *staffService) Update(ctx context.Context, deptID int, input model.StaffDTO) (*model.StaffDTO, error) {
	input.DepartmentID = utils.Ptr(deptID)

	if input.Phone != "" {
		exists, err := s.repo.CheckPhoneExists(ctx, input.ID, input.Phone)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrConflict("phone already exists")
		}
	}
	if input.Email != "" {
		exists, err := s.repo.CheckEmailExists(ctx, input.ID, input.Email)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrConflict("email already exists")
		}
	}

	dto, err := s.repo.Update(ctx, deptID, input)
	if err != nil {
		if errors.Is(err, repository.ErrStaffNotFound) {
			return nil, ErrStaffNotFound
		}
		if errors.Is(err, repository.ErrSystemAdminRoleForbidden) {
			return nil, ErrSystemAdminRoleForbidden
		}
		return nil, err
	}

	if dto != nil {
		cache.InvalidateKeys(kStaffByID(dto.ID), kStaffSectionList(dto.ID), kUserRoleList(dto.ID), kSectionStaffAll(dto.ID))
	}
	cache.InvalidateKeys(kStaffAll()...)

	// search index
	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *staffService) AssignStaffToDepartment(ctx context.Context, sourceDeptID int, userID int, destinationDeptID int) (*model.StaffDTO, error) {
	dto, err := s.repo.AssignStaffToDepartment(ctx, sourceDeptID, userID, destinationDeptID)
	if err != nil {
		if errors.Is(err, repository.ErrStaffNotFound) {
			return nil, ErrStaffNotFound
		}
		if errors.Is(err, repository.ErrDepartmentScopeForbidden) {
			return nil, ErrDepartmentScopeForbidden
		}
		return nil, err
	}

	cache.InvalidateKeys(kStaffAll()...)
	cache.InvalidateKeys(kStaffByID(userID), kStaffSectionList(userID), kUserRoleList(userID), kSectionStaffAll(userID), kUserDepartment(userID))

	if dto != nil {
		s.upsertSearch(ctx, destinationDeptID, dto)
	}

	return dto, nil
}

func (s *staffService) AssignCorporateAdminToDepartment(ctx context.Context, userID int, departmentID int) error {
	result, err := s.repo.AssignCorporateAdminToDepartment(ctx, userID, departmentID)
	if err != nil {
		return err
	}

	s.invalidateCorporateAdminAssignmentCaches(result.CurrentCorporateAdminID, userID)
	if result.PreviousCorporateAdminID != nil && *result.PreviousCorporateAdminID > 0 && *result.PreviousCorporateAdminID != result.CurrentCorporateAdminID {
		s.invalidateCorporateAdminAssignmentCaches(*result.PreviousCorporateAdminID, *result.PreviousCorporateAdminID)
	}
	s.invalidateDepartmentCorporateAdminCaches(departmentID)
	return nil
}

func (s *staffService) UnassignCorporateAdminFromDepartment(ctx context.Context, userID int, departmentID int) error {
	corporateAdminID, err := s.repo.UnassignCorporateAdminFromDepartment(ctx, userID, departmentID)
	if err != nil {
		return err
	}

	s.invalidateCorporateAdminAssignmentCaches(corporateAdminID, userID)
	s.invalidateDepartmentCorporateAdminCaches(departmentID)
	return nil
}

func (s *staffService) invalidateCorporateAdminAssignmentCaches(corporateAdminID int, userID int) {
	rbac.InvalidateUserRoleSet(corporateAdminID)
	rbac.InvalidateUserPermissionSet(corporateAdminID)
	cache.InvalidateKeys(
		fmt.Sprintf("user:%d:perms", corporateAdminID),
		kUserDepartment(corporateAdminID),
		fmt.Sprintf("department:first_of_user:%d", corporateAdminID),
		fmt.Sprintf("staff:id:%d", userID),
		fmt.Sprintf("section:staff:%d:*", userID),
		kStaffListAll(),
		kStaffSearchAll(),
		kStaffSectionAll(),
	)
}

func (s *staffService) invalidateDepartmentCorporateAdminCaches(departmentID int) {
	if departmentID <= 0 {
		return
	}

	cache.InvalidateKeys(
		kDepartmentByID(departmentID),
		"department:list:*",
		"department:children:*",
		"department:search:*",
	)
}

func (s *staffService) upsertSearch(ctx context.Context, deptID int, dto *model.StaffDTO) {
	kwPtr, _ := searchutils.BuildKeywords(ctx, s.cfMgr, "clinic", []any{dto.SectionNames, dto.Phone}, dto.CustomFields)

	pubsub.PublishAsync("search:upsert", &searchmodel.Doc{
		EntityType: "staff",
		EntityID:   int64(dto.ID),
		Title:      dto.Name,
		Subtitle:   utils.Ptr(dto.Email),
		Keywords:   &kwPtr,
		Content:    nil,
		Attributes: map[string]any{
			"avatar": dto.Avatar,
		},
		OrgID:   utils.Ptr(int64(deptID)),
		OwnerID: utils.Ptr(int64(dto.ID)),
	})
}

func (s *staffService) unlinkSearch(id int) {
	pubsub.PublishAsync("search:unlink", &searchmodel.UnlinkDoc{
		EntityType: "staff",
		EntityID:   int64(id),
	})
}

func (s *staffService) ChangePassword(ctx context.Context, id int, newPassword string) error {
	return s.repo.ChangePassword(ctx, id, newPassword)
}

func (s *staffService) GetByID(ctx context.Context, id int) (*model.StaffDTO, error) {
	return cache.Get(kStaffByID(id), cache.TTLMedium, func() (*model.StaffDTO, error) {
		return s.repo.GetByID(ctx, id)
	})
}

func (s *staffService) List(ctx context.Context, deptID int, q table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	type boxed = table.TableListResult[model.StaffDTO]
	key := kStaffList(deptID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.List(ctx, deptID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *staffService) ListBySectionID(ctx context.Context, sectionID int, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	type boxed = table.TableListResult[model.StaffDTO]
	key := kSectionStaffList(sectionID, query)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.ListBySectionID(ctx, sectionID, query)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *staffService) ListByRoleName(ctx context.Context, roleName string, query table.TableQuery) (table.TableListResult[model.StaffDTO], error) {
	type boxed = table.TableListResult[model.StaffDTO]
	key := kStaffByRole(roleName, query)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.ListByRoleName(ctx, roleName, query)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *staffService) CheckPhoneExists(ctx context.Context, userID int, phone string) (bool, error) {
	return s.repo.CheckPhoneExists(ctx, userID, phone)
}

func (s *staffService) CheckEmailExists(ctx context.Context, userID int, email string) (bool, error) {
	return s.repo.CheckEmailExists(ctx, userID, email)
}

func (s *staffService) Delete(ctx context.Context, deptID int, userID int) error {
	if err := s.repo.Delete(ctx, deptID, userID); err != nil {
		return err
	}
	cache.InvalidateKeys(kStaffAll()...)
	cache.InvalidateKeys(kStaffByID(userID), kStaffSectionList(userID), kUserRoleList(userID), kSectionStaffAll(userID))

	s.unlinkSearch(userID)
	return nil
}

func (s *staffService) Search(ctx context.Context, q dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	type boxed = dbutils.SearchResult[model.StaffDTO]
	key := kStaffSearch(q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.Search(ctx, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *staffService) SearchWithRoleName(ctx context.Context, roleName string, q dbutils.SearchQuery) (dbutils.SearchResult[model.StaffDTO], error) {
	type boxed = dbutils.SearchResult[model.StaffDTO]
	key := kStaffSearchWithRoleName(roleName, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.SearchWithRoleName(ctx, roleName, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}
