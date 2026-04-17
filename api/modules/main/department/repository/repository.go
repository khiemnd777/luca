package repository

import (
	"context"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/department/model"
	staffrepo "github.com/khiemnd777/noah_api/modules/main/features/staff/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type DepartmentRepository interface {
	Create(ctx context.Context, input model.DepartmentDTO) (*model.DepartmentDTO, error)
	Update(ctx context.Context, input model.DepartmentDTO) (*model.DepartmentDTO, error)
	GetByID(ctx context.Context, id int) (*model.DepartmentDTO, error)
	GetBySlug(ctx context.Context, slug string) (*model.DepartmentDTO, error)
	List(ctx context.Context, query table.TableQuery) (table.TableListResult[model.DepartmentDTO], error)
	Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.DepartmentDTO], error)
	ChildrenList(ctx context.Context, parentID int, query table.TableQuery) (table.TableListResult[model.DepartmentDTO], error)
	Delete(ctx context.Context, id int) error
	ExistsMembership(ctx context.Context, userID, deptID int) (bool, error)
	GetFirstDepartmentOfUser(ctx context.Context, userID int) (*model.DepartmentDTO, error)
}

type departmentRepo struct {
	db   *generated.Client
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewDepartmentRepository(db *generated.Client, deps *module.ModuleDeps[config.ModuleConfig]) DepartmentRepository {
	return &departmentRepo{db: db, deps: deps}
}

func (r *departmentRepo) Create(ctx context.Context, input model.DepartmentDTO) (*model.DepartmentDTO, error) {
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

	entity, err := tx.Department.Create().
		SetActive(input.Active).
		SetName(input.Name).
		SetNillableLogo(input.Logo).
		SetNillableLogoRect(input.LogoRect).
		SetNillableAddress(input.Address).
		SetNillablePhoneNumber(input.PhoneNumber).
		SetNillableParentID(input.ParentID).
		SetNillableAdministratorID(input.AdministratorID).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	if entity.AdministratorID != nil && *entity.AdministratorID > 0 {
		if err := staffrepo.SyncDepartmentAdminInTx(ctx, tx, *entity.AdministratorID, entity.ID); err != nil {
			return nil, err
		}
	}

	return mapper.MapAs[*generated.Department, *model.DepartmentDTO](entity), nil
}

func (r *departmentRepo) Update(ctx context.Context, input model.DepartmentDTO) (*model.DepartmentDTO, error) {
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

	entity, err := tx.Department.UpdateOneID(input.ID).
		SetActive(input.Active).
		SetName(input.Name).
		SetNillableLogo(input.Logo).
		SetNillableLogoRect(input.LogoRect).
		SetNillableAddress(input.Address).
		SetNillablePhoneNumber(input.PhoneNumber).
		SetNillableParentID(input.ParentID).
		SetNillableAdministratorID(input.AdministratorID).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	if entity.AdministratorID != nil && *entity.AdministratorID > 0 {
		if err := staffrepo.SyncDepartmentAdminInTx(ctx, tx, *entity.AdministratorID, entity.ID); err != nil {
			return nil, err
		}
	}

	return mapper.MapAs[*generated.Department, *model.DepartmentDTO](entity), nil
}

func (r *departmentRepo) GetByID(ctx context.Context, id int) (*model.DepartmentDTO, error) {
	entity, err := r.db.Department.Query().
		Where(department.ID(id), department.Deleted(false)).
		Only(ctx)

	if err != nil {
		return nil, err
	}

	departmentDTO := mapper.MapAs[*generated.Department, *model.DepartmentDTO](entity)

	return departmentDTO, nil
}

func (r *departmentRepo) GetBySlug(ctx context.Context, slug string) (*model.DepartmentDTO, error) {
	entity, err := r.db.Department.Query().
		Where(department.Slug(slug), department.Deleted(false)).
		Only(ctx)

	if err != nil {
		return nil, err
	}

	departmentDTO := mapper.MapAs[*generated.Department, *model.DepartmentDTO](entity)

	return departmentDTO, nil
}

func (r *departmentRepo) List(ctx context.Context, query table.TableQuery) (table.TableListResult[model.DepartmentDTO], error) {
	list, err := table.TableListV2(
		ctx,
		r.db.Department.Query().
			Where(department.Deleted(false)),
		query,
		department.Table,
		department.FieldID,
		department.FieldID,
		func(q *generated.DepartmentQuery) *generated.DepartmentQuery {
			return q
		},
		func(src []*generated.Department) []*model.DepartmentDTO {
			return mapper.MapListAs[*generated.Department, *model.DepartmentDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.DepartmentDTO]
		return zero, err
	}
	return list, nil
}

func (r *departmentRepo) ChildrenList(ctx context.Context, parentID int, query table.TableQuery) (table.TableListResult[model.DepartmentDTO], error) {
	list, err := table.TableListV2(
		ctx,
		r.db.Department.Query().
			Where(
				department.Deleted(false),
				department.ParentIDEQ(parentID),
			),
		query,
		department.Table,
		department.FieldID,
		department.FieldID,
		func(q *generated.DepartmentQuery) *generated.DepartmentQuery {
			return q
		},
		func(src []*generated.Department) []*model.DepartmentDTO {
			return mapper.MapListAs[*generated.Department, *model.DepartmentDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.DepartmentDTO]
		return zero, err
	}
	return list, nil
}

func (r *departmentRepo) Search(ctx context.Context, query dbutils.SearchQuery) (dbutils.SearchResult[model.DepartmentDTO], error) {
	return dbutils.Search(
		ctx,
		r.db.Department.Query().
			Where(department.Deleted(false)),
		[]string{
			dbutils.GetNormField(department.FieldName),
			dbutils.GetNormField(department.FieldSlug),
		},
		query,
		department.Table,
		department.FieldID,
		department.FieldName,
		department.Or,
		func(src []*generated.Department) []*model.DepartmentDTO {
			return mapper.MapListAs[*generated.Department, *model.DepartmentDTO](src)
		},
	)
}

func (r *departmentRepo) Delete(ctx context.Context, id int) error {
	return r.db.Department.UpdateOneID(id).
		SetDeleted(true).
		Exec(ctx)
}

func (r *departmentRepo) ExistsMembership(ctx context.Context, userID, deptID int) (bool, error) {
	n, err := r.db.DepartmentMember.
		Query().
		Where(
			departmentmember.UserID(userID),
			departmentmember.DepartmentID(deptID),
		).
		Count(ctx)
	return n > 0, err
}

func (r *departmentRepo) GetFirstDepartmentOfUser(ctx context.Context, userID int) (*model.DepartmentDTO, error) {
	dm, err := r.db.DepartmentMember.Query().
		Where(departmentmember.UserID(userID)).
		Order(departmentmember.ByCreatedAt()).
		First(ctx)

	if err != nil {
		return nil, err
	}

	d, err := dm.QueryDepartment().
		Where(department.Deleted(false)).
		Only(ctx)

	if err != nil {
		return nil, err
	}

	res := mapper.MapAs[*generated.Department, *model.DepartmentDTO](d)

	return res, nil
}
