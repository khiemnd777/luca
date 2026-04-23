package repository

import (
	"context"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	catalogrefcode "github.com/khiemnd777/noah_api/modules/main/features/catalog_ref_code"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/category"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/restorationtype"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type RestorationTypeRepository interface {
	Create(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error)
	Update(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error)
	GetByID(ctx context.Context, deptID int, id int) (*model.RestorationTypeDTO, error)
	List(ctx context.Context, deptID int, categoryID *int, query table.TableQuery) (table.TableListResult[model.RestorationTypeDTO], error)
	Search(ctx context.Context, deptID int, categoryID *int, query dbutils.SearchQuery) (dbutils.SearchResult[model.RestorationTypeDTO], error)
	Delete(ctx context.Context, deptID int, id int) error
}

type restorationTypeRepo struct {
	db      *generated.Client
	deps    *module.ModuleDeps[config.ModuleConfig]
	codeSvc catalogrefcode.Service
}

func NewRestorationTypeRepository(db *generated.Client, deps *module.ModuleDeps[config.ModuleConfig], codeSvc catalogrefcode.Service) RestorationTypeRepository {
	return &restorationTypeRepo{db: db, deps: deps, codeSvc: codeSvc}
}

func (r *restorationTypeRepo) Create(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	tx := dbutils.TxFromContext(ctx)
	var err error
	if tx == nil {
		tx, err = r.db.Tx(ctx)
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
	}

	code := r.codeSvc.Normalize(input.Code)
	if code == nil {
		nextCode, err := r.codeSvc.Next(ctx, tx, catalogrefcode.Scope{
			DepartmentID: deptID,
			Module:       catalogrefcode.ModuleRestorationType,
		})
		if err != nil {
			return nil, err
		}
		code = &nextCode
	}

	categoryName := input.CategoryName
	if categoryName == nil && input.CategoryID != nil {
		cat, err := tx.Category.Query().
			Where(
				category.ID(*input.CategoryID),
				category.DeletedAtIsNil(),
			).
			Only(ctx)
		if err != nil {
			return nil, err
		}
		categoryName = cat.Name
	}

	entity, err := tx.RestorationType.Create().
		SetNillableDepartmentID(&deptID).
		SetNillableCategoryID(input.CategoryID).
		SetNillableCategoryName(categoryName).
		SetNillableCode(code).
		SetNillableName(input.Name).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.RestorationType, *model.RestorationTypeDTO](entity)
	return dto, nil
}

func (r *restorationTypeRepo) Update(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	tx := dbutils.TxFromContext(ctx)
	var err error
	if tx == nil {
		tx, err = r.db.Tx(ctx)
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
	}

	code := r.codeSvc.Normalize(input.Code)
	categoryName := input.CategoryName
	if categoryName == nil && input.CategoryID != nil {
		cat, err := tx.Category.Query().
			Where(
				category.ID(*input.CategoryID),
				category.DeletedAtIsNil(),
			).
			Only(ctx)
		if err != nil {
			return nil, err
		}
		categoryName = cat.Name
	}

	entity, err := tx.RestorationType.UpdateOneID(input.ID).
		SetNillableDepartmentID(&deptID).
		SetNillableCategoryID(input.CategoryID).
		SetNillableCategoryName(categoryName).
		SetNillableCode(code).
		SetNillableName(input.Name).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.RestorationType, *model.RestorationTypeDTO](entity)
	return dto, nil
}

func (r *restorationTypeRepo) GetByID(ctx context.Context, deptID, id int) (*model.RestorationTypeDTO, error) {
	entity, err := r.db.RestorationType.Query().
		Where(
			restorationtype.ID(id),
			restorationtype.DepartmentIDEQ(deptID),
			restorationtype.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.RestorationType, *model.RestorationTypeDTO](entity)
	return dto, nil
}

func (r *restorationTypeRepo) List(ctx context.Context, deptID int, categoryID *int, query table.TableQuery) (table.TableListResult[model.RestorationTypeDTO], error) {
	q := r.db.RestorationType.Query().
		Where(restorationtype.DepartmentIDEQ(deptID), restorationtype.DeletedAtIsNil())
	if categoryID != nil {
		q = q.Where(restorationtype.CategoryIDEQ(*categoryID))
	}

	list, err := table.TableList(
		ctx,
		q,
		query,
		restorationtype.Table,
		restorationtype.FieldID,
		restorationtype.FieldID,
		func(src []*generated.RestorationType) []*model.RestorationTypeDTO {
			return mapper.MapListAs[*generated.RestorationType, *model.RestorationTypeDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.RestorationTypeDTO]
		return zero, err
	}
	return list, nil
}

func (r *restorationTypeRepo) Search(ctx context.Context, deptID int, categoryID *int, query dbutils.SearchQuery) (dbutils.SearchResult[model.RestorationTypeDTO], error) {
	q := r.db.RestorationType.Query().
		Where(restorationtype.DepartmentIDEQ(deptID), restorationtype.DeletedAtIsNil())
	if categoryID != nil {
		q = q.Where(restorationtype.CategoryIDEQ(*categoryID))
	}

	return dbutils.Search(
		ctx,
		q,
		[]string{
			dbutils.GetNormField(restorationtype.FieldCode),
			dbutils.GetNormField(restorationtype.FieldName),
		},
		query,
		restorationtype.Table,
		restorationtype.FieldID,
		restorationtype.FieldID,
		restorationtype.Or,
		func(src []*generated.RestorationType) []*model.RestorationTypeDTO {
			return mapper.MapListAs[*generated.RestorationType, *model.RestorationTypeDTO](src)
		},
	)
}

func (r *restorationTypeRepo) Delete(ctx context.Context, deptID int, id int) error {
	return r.db.RestorationType.UpdateOneID(id).
		Where(restorationtype.DepartmentIDEQ(deptID)).
		SetDeletedAt(time.Now()).
		Exec(ctx)
}
