package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	relation "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/product"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/mapper"
	collectionutils "github.com/khiemnd777/noah_api/shared/metadata/collection"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type ProductRepository interface {
	Create(ctx context.Context, deptID int, input *model.ProductUpsertDTO) (*model.ProductDTO, error)
	Update(ctx context.Context, deptID int, input *model.ProductUpsertDTO) (*model.ProductDTO, error)
	GetByID(ctx context.Context, deptID int, id int) (*model.ProductDTO, error)
	List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.ProductDTO], error)
	VariantList(ctx context.Context, deptID int, templateID int, query table.TableQuery) (table.TableListResult[model.ProductDTO], error)
	Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.ProductDTO], error)
	Delete(ctx context.Context, deptID int, id int) error
}

type productRepo struct {
	db    *generated.Client
	deps  *module.ModuleDeps[config.ModuleConfig]
	cfMgr *customfields.Manager
}

func NewProductRepository(db *generated.Client, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) ProductRepository {
	return &productRepo{db: db, deps: deps, cfMgr: cfMgr}
}

var productTreeCfg = collectionutils.TreeConfig{
	TableName:        "products",
	IDColumn:         "id",
	ParentIDColumn:   "template_id",
	ShowIfFieldName:  "templateId",
	CollectionGroup:  "product",
	CollectionPrefix: "product",
}

func toTreeNode(e *generated.Product) *collectionutils.TreeNode {
	return &collectionutils.TreeNode{
		ID:           e.ID,
		ParentID:     e.TemplateID,
		Name:         e.Name,
		CollectionID: e.CollectionID,
	}
}

func (r *productRepo) loadProductRelation(
	ctx context.Context,
	query string,
	productID int,
) ([]int, *string, error) {
	rows, err := r.deps.DB.QueryContext(ctx, query, productID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	ids := make([]int, 0)
	names := make([]string, 0)
	for rows.Next() {
		var (
			id   int
			name sql.NullString
		)
		if err := rows.Scan(&id, &name); err != nil {
			return nil, nil, err
		}
		ids = append(ids, id)
		if name.Valid && name.String != "" {
			names = append(names, name.String)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	if len(names) == 0 {
		return ids, nil, nil
	}

	joined := strings.Join(names, "|")
	return ids, &joined, nil
}

func (r *productRepo) hydrateProductRelationFields(ctx context.Context, dto *model.ProductDTO) error {
	if dto == nil || dto.ID <= 0 {
		return nil
	}

	processIDs, processNames, err := r.loadProductRelation(ctx, `
		SELECT pr.id, pr.name
		FROM product_processes pp
		JOIN processes pr ON pr.id = pp.process_id
		WHERE pp.product_id = $1
		ORDER BY COALESCE(pp.display_order, 0), pp.id
	`, dto.ID)
	if err != nil {
		return err
	}

	brandNameIDs, brandNameNames, err := r.loadProductRelation(ctx, `
		SELECT b.id, b.name
		FROM product_brand_names pbn
		JOIN brand_names b ON b.id = pbn.brand_name_id
		WHERE pbn.product_id = $1
		ORDER BY pbn.id
	`, dto.ID)
	if err != nil {
		return err
	}

	rawMaterialIDs, rawMaterialNames, err := r.loadProductRelation(ctx, `
		SELECT rm.id, rm.name
		FROM product_raw_materials prm
		JOIN raw_materials rm ON rm.id = prm.raw_material_id
		WHERE prm.product_id = $1
		ORDER BY prm.id
	`, dto.ID)
	if err != nil {
		return err
	}

	techniqueIDs, techniqueNames, err := r.loadProductRelation(ctx, `
		SELECT t.id, t.name
		FROM product_techniques pt
		JOIN techniques t ON t.id = pt.technique_id
		WHERE pt.product_id = $1
		ORDER BY pt.id
	`, dto.ID)
	if err != nil {
		return err
	}

	restorationTypeIDs, restorationTypeNames, err := r.loadProductRelation(ctx, `
		SELECT rt.id, rt.name
		FROM product_restoration_types prt
		JOIN restoration_types rt ON rt.id = prt.restoration_type_id
		WHERE prt.product_id = $1
		ORDER BY prt.id
	`, dto.ID)
	if err != nil {
		return err
	}

	dto.ProcessIDs = processIDs
	dto.ProcessNames = processNames
	dto.BrandNameIDs = brandNameIDs
	dto.BrandNameNames = brandNameNames
	dto.RawMaterialIDs = rawMaterialIDs
	dto.RawMaterialNames = rawMaterialNames
	dto.TechniqueIDs = techniqueIDs
	dto.TechniqueNames = techniqueNames
	dto.RestorationTypeIDs = restorationTypeIDs
	dto.RestorationTypeNames = restorationTypeNames

	relationFields := map[string]any{}
	if len(processIDs) > 0 {
		relationFields["process_ids"] = processIDs
	}
	if len(brandNameIDs) > 0 {
		relationFields["brand_name_ids"] = brandNameIDs
	}
	if len(rawMaterialIDs) > 0 {
		relationFields["raw_material_ids"] = rawMaterialIDs
	}
	if len(techniqueIDs) > 0 {
		relationFields["technique_ids"] = techniqueIDs
	}
	if len(restorationTypeIDs) > 0 {
		relationFields["restoration_type_ids"] = restorationTypeIDs
	}
	if len(relationFields) > 0 {
		dto.RelationFields = relationFields
	}

	return nil
}

func (r *productRepo) Create(ctx context.Context, deptID int, input *model.ProductUpsertDTO) (*model.ProductDTO, error) {
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

	in := &input.DTO

	q := tx.Product.Create().
		SetNillableDepartmentID(&deptID).
		SetNillableCode(in.Code).
		SetNillableName(in.Name).
		SetNillableCategoryID(in.CategoryID).
		SetNillableCategoryName(in.CategoryName).
		SetNillableRetailPrice(in.RetailPrice).
		SetNillableCostPrice(in.CostPrice)

	if in.TemplateID == nil {
		q.SetIsTemplate(true).
			SetNillableTemplateID(nil)
	} else {
		q.SetIsTemplate(false).
			SetNillableTemplateID(in.TemplateID)
	}

	// metadata
	if input.Collections != nil && len(*input.Collections) > 0 {
		_, err = customfields.PrepareCustomFields(ctx,
			r.cfMgr,
			*input.Collections,
			in.CustomFields,
			q,
			false,
		)
		if err != nil {
			return nil, err
		}
	}

	entity, err := q.Save(ctx)
	if err != nil {
		return nil, err
	}

	// template
	if entity.IsTemplate {
		// Upsert collection for node
		if err = collectionutils.UpsertCollectionForNode(
			ctx,
			tx,
			productTreeCfg,
			toTreeNode(entity),
			nil,
		); err != nil {
			logger.Debug(
				"product.create: upsert collection for node failed",
				"product_id", entity.ID,
				"is_template", entity.IsTemplate,
				"error", err,
			)
			return nil, err
		}

		// Upsert collections for ANCESTORS
		if err = collectionutils.UpsertAncestorCollections(
			ctx,
			tx,
			productTreeCfg,
			entity.ID,
		); err != nil {
			logger.Error(fmt.Sprintf("[ERROR] %v", err))
			return nil, err
		}
	}

	out := mapper.MapAs[*generated.Product, *model.ProductDTO](entity)

	if _, err = relation.UpsertM2M(ctx, tx, "products_processes", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_brand_names", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_techniques", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_raw_materials", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_restoration_types", entity, input.DTO, out); err != nil {
		return nil, err
	}

	return out, nil
}

func (r *productRepo) Update(ctx context.Context, deptID int, input *model.ProductUpsertDTO) (*model.ProductDTO, error) {
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

	in := &input.DTO

	_, err = tx.Product.Query().
		Where(
			product.ID(in.ID),
			product.DepartmentIDEQ(deptID),
			product.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	q := tx.Product.UpdateOneID(in.ID).
		SetNillableCode(in.Code).
		SetNillableName(in.Name).
		SetNillableCategoryID(in.CategoryID).
		SetNillableCategoryName(in.CategoryName).
		SetNillableRetailPrice(in.RetailPrice).
		SetNillableCostPrice(in.CostPrice)

	if in.TemplateID == nil {
		q.SetIsTemplate(true)
	} else {
		q.SetIsTemplate(false).
			SetNillableTemplateID(in.TemplateID)
	}

	// custom fields
	if input.Collections != nil && len(*input.Collections) > 0 {
		_, err = customfields.PrepareCustomFields(ctx,
			r.cfMgr,
			*input.Collections,
			in.CustomFields,
			q,
			false,
		)
		if err != nil {
			return nil, err
		}
	}

	entity, err := q.Save(ctx)
	if err != nil {
		return nil, err
	}

	// collections
	if entity.IsTemplate {
		// upsert collection for THIS NODE
		if err = collectionutils.UpsertCollectionForNode(
			ctx,
			tx,
			productTreeCfg,
			toTreeNode(entity),
			nil,
		); err != nil {
			return nil, err
		}

		// upsert collections for ANCESTORS (current branch)
		if err = collectionutils.UpsertAncestorCollections(
			ctx,
			tx,
			productTreeCfg,
			entity.ID,
		); err != nil {
			return nil, err
		}
	}

	out := mapper.MapAs[*generated.Product, *model.ProductDTO](entity)

	if _, err = relation.UpsertM2M(ctx, tx, "products_processes", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_brand_names", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_techniques", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_raw_materials", entity, input.DTO, out); err != nil {
		return nil, err
	}
	if _, err = relation.UpsertM2M(ctx, tx, "products_restoration_types", entity, input.DTO, out); err != nil {
		return nil, err
	}

	return out, nil
}

func (r *productRepo) GetByID(ctx context.Context, deptID int, id int) (*model.ProductDTO, error) {
	q := r.db.Product.Query().
		Where(
			product.ID(id),
			product.DepartmentIDEQ(deptID),
			product.DeletedAtIsNil(),
		)

	entity, err := q.Only(ctx)
	if err != nil {
		return nil, err
	}

	dto := mapper.MapAs[*generated.Product, *model.ProductDTO](entity)
	if err := r.hydrateProductRelationFields(ctx, dto); err != nil {
		return nil, err
	}
	return dto, nil
}

func (r *productRepo) List(ctx context.Context, deptID int, query table.TableQuery) (table.TableListResult[model.ProductDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Product.Query().
			Where(
				product.DeletedAtIsNil(),
				product.DepartmentIDEQ(deptID),
				product.IsTemplate(true),
			),
		query,
		product.Table,
		product.FieldID,
		product.FieldID,
		func(src []*generated.Product) []*model.ProductDTO {
			return mapper.MapListAs[*generated.Product, *model.ProductDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.ProductDTO]
		return zero, err
	}
	return list, nil
}

func (r *productRepo) VariantList(ctx context.Context, deptID int, templateID int, query table.TableQuery) (table.TableListResult[model.ProductDTO], error) {
	list, err := table.TableList(
		ctx,
		r.db.Product.Query().
			Where(
				product.DeletedAtIsNil(),
				product.DepartmentIDEQ(deptID),
				product.TemplateIDEQ(templateID),
				product.IsTemplate(false),
			),
		query,
		product.Table,
		product.FieldID,
		product.FieldID,
		func(src []*generated.Product) []*model.ProductDTO {
			return mapper.MapListAs[*generated.Product, *model.ProductDTO](src)
		},
	)
	if err != nil {
		var zero table.TableListResult[model.ProductDTO]
		return zero, err
	}
	return list, nil
}

func (r *productRepo) Search(ctx context.Context, deptID int, query dbutils.SearchQuery) (dbutils.SearchResult[model.ProductDTO], error) {
	return dbutils.Search(
		ctx,
		r.db.Product.Query().
			Where(
				product.DeletedAtIsNil(),
				product.DepartmentIDEQ(deptID),
			),
		[]string{
			dbutils.GetNormField(product.FieldCode),
			dbutils.GetNormField(product.FieldName),
		},
		query,
		product.Table,
		product.FieldID,
		product.FieldID,
		product.Or,
		func(src []*generated.Product) []*model.ProductDTO {
			return mapper.MapListAs[*generated.Product, *model.ProductDTO](src)
		},
	)
}

func (r *productRepo) Delete(ctx context.Context, deptID int, id int) error {
	tx, err := r.db.Tx(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	entity, err := tx.Product.Query().
		Where(
			product.IDEQ(id),
			product.DepartmentIDEQ(deptID),
			product.DeletedAtIsNil(),
		).
		Only(ctx)
	if err != nil {
		return err
	}

	err = tx.Product.UpdateOneID(id).
		SetDeletedAt(time.Now()).
		Exec(ctx)

	if err != nil {
		return err
	}

	if entity.IsTemplate {
		if err = collectionutils.UpsertAncestorCollections(
			ctx,
			tx,
			productTreeCfg,
			id,
		); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				err = nil
			} else {
				return err
			}
		}
	}

	return nil
}
