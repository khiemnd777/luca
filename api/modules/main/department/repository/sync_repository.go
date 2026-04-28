package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"

	categoryrepo "github.com/khiemnd777/noah_api/modules/main/features/category/repository"
)

type DepartmentSyncRepository interface {
	ListCategories(ctx context.Context, deptID int) ([]DepartmentSyncCategoryRecord, error)
	ListSimpleRefs(ctx context.Context, table string, deptID int) ([]DepartmentSyncSimpleRefRecord, error)
	FindSimpleRefID(ctx context.Context, table string, deptID int, categoryID int, code string) (*int, error)
	ListProcesses(ctx context.Context, deptID int) ([]DepartmentSyncProcessRecord, error)
	ListSections(ctx context.Context, deptID int) ([]DepartmentSyncSectionRecord, error)
	ListMaterials(ctx context.Context, deptID int) ([]DepartmentSyncMaterialRecord, error)
	ListProducts(ctx context.Context, deptID int) ([]DepartmentSyncProductRecord, error)
	ListCollectionFieldSpecs(ctx context.Context, collectionID int) ([]categoryrepo.CategoryFieldSpec, error)
}

type departmentSyncRepo struct {
	db *sql.DB
}

func NewDepartmentSyncRepository(db *sql.DB) DepartmentSyncRepository {
	return &departmentSyncRepo{db: db}
}

type DepartmentSyncCategoryRecord struct {
	ID           int
	CollectionID *int
	Name         string
	Level        int
	ParentID     *int
	Active       bool
	CustomFields map[string]any
	ProcessNames []string
}

type DepartmentSyncSimpleRefRecord struct {
	ID           int
	Code         string
	CategoryName string
	CategoryPath string
	Name         string
}

type DepartmentSyncProcessRecord struct {
	ID           int
	Name         string
	Code         *string
	CustomFields map[string]any
}

type DepartmentSyncSectionRecord struct {
	ID           int
	Name         string
	Code         *string
	Description  string
	Active       bool
	Color        *string
	LeaderID     *int
	LeaderName   *string
	CustomFields map[string]any
	ProcessNames []string
}

type DepartmentSyncMaterialRecord struct {
	ID           int
	Name         string
	Code         *string
	Type         *string
	IsImplant    bool
	CustomFields map[string]any
}

type DepartmentSyncProductRecord struct {
	ID                   int
	Code                 *string
	Name                 *string
	CategoryName         *string
	CategoryLV1          *string
	CategoryLV2          *string
	CategoryLV3          *string
	RetailPrice          *float64
	CostPrice            *float64
	CustomFields         map[string]any
	ProcessNames         []string
	BrandNameCodes       []string
	BrandNameNames       []string
	RawMaterialCodes     []string
	RawMaterialNames     []string
	TechniqueCodes       []string
	TechniqueNames       []string
	RestorationTypeCodes []string
	RestorationTypeNames []string
	TemplateID           *int
	TemplateCode         *string
	IsTemplate           bool
}

func (r *departmentSyncRepo) ListCategories(ctx context.Context, deptID int) ([]DepartmentSyncCategoryRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			c.id,
			c.collection_id,
			c.name,
			c.level,
			c.parent_id,
			c.active,
			COALESCE(c.custom_fields, '{}'::jsonb) AS custom_fields,
			COALESCE((
				SELECT json_agg(p.name ORDER BY COALESCE(cp.display_order, 0), cp.id)
				FROM category_processes cp
				JOIN processes p ON p.id = cp.process_id
				WHERE cp.category_id = c.id
			), '[]'::json) AS process_names
		FROM categories c
		WHERE c.department_id = $1
			AND c.deleted_at IS NULL
		ORDER BY c.level, c.id
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncCategoryRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncCategoryRecord
		var customFieldsRaw []byte
		var processNamesRaw []byte
		if err := rows.Scan(
			&rec.ID,
			&rec.CollectionID,
			&rec.Name,
			&rec.Level,
			&rec.ParentID,
			&rec.Active,
			&customFieldsRaw,
			&processNamesRaw,
		); err != nil {
			return nil, err
		}
		rec.CustomFields = decodeJSONMap(customFieldsRaw)
		rec.ProcessNames = decodeJSONStringArray(processNamesRaw)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) FindSimpleRefID(ctx context.Context, table string, deptID int, categoryID int, code string) (*int, error) {
	query := `
		SELECT id
		FROM ` + table + `
		WHERE department_id = $1
			AND code_norm = lower(unaccent_immutable($2))
			AND deleted_at IS NULL
		LIMIT 1
	`

	var id int
	err := r.db.QueryRowContext(ctx, query, deptID, code).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &id, nil
}

func (r *departmentSyncRepo) ListCollectionFieldSpecs(ctx context.Context, collectionID int) ([]categoryrepo.CategoryFieldSpec, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			name,
			label,
			type,
			COALESCE(required, false),
			COALESCE("unique", false),
			tag,
			COALESCE("table", false),
			COALESCE(form, false),
			COALESCE(search, false),
			default_value::text,
			options::text,
			COALESCE(order_index, 0),
			COALESCE(visibility, ''),
			relation::text
		FROM fields
		WHERE collection_id = $1
		ORDER BY order_index ASC, id ASC
	`, collectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]categoryrepo.CategoryFieldSpec, 0)
	for rows.Next() {
		var rec categoryrepo.CategoryFieldSpec
		var tag sql.NullString
		var defaultValue sql.NullString
		var options sql.NullString
		var relation sql.NullString
		if err := rows.Scan(
			&rec.Name,
			&rec.Label,
			&rec.Type,
			&rec.Required,
			&rec.Unique,
			&tag,
			&rec.Table,
			&rec.Form,
			&rec.Search,
			&defaultValue,
			&options,
			&rec.OrderIndex,
			&rec.Visibility,
			&relation,
		); err != nil {
			return nil, err
		}
		rec.Tag = nullableString(tag)
		rec.DefaultValue = nullableString(defaultValue)
		rec.Options = nullableString(options)
		rec.Relation = nullableString(relation)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) ListSimpleRefs(ctx context.Context, table string, deptID int) ([]DepartmentSyncSimpleRefRecord, error) {
	query := `
		SELECT
			r.id,
			COALESCE(r.category_name, ''),
			COALESCE(
				NULLIF(
					concat_ws(
						' > ',
						NULLIF(c.category_name_lv1, ''),
						NULLIF(c.category_name_lv2, ''),
						NULLIF(c.name, '')
					),
					''
				),
				COALESCE(r.category_name, '')
			),
			COALESCE(r.code, ''),
			COALESCE(r.name, '')
		FROM ` + table + ` r
		LEFT JOIN categories c ON c.id = r.category_id
		WHERE r.department_id = $1
			AND r.deleted_at IS NULL
		ORDER BY r.name, r.id
	`
	rows, err := r.db.QueryContext(ctx, query, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncSimpleRefRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncSimpleRefRecord
		if err := rows.Scan(&rec.ID, &rec.CategoryName, &rec.CategoryPath, &rec.Code, &rec.Name); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) ListProcesses(ctx context.Context, deptID int) ([]DepartmentSyncProcessRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(name, ''), code, COALESCE(custom_fields, '{}'::jsonb)
		FROM processes
		WHERE department_id = $1
			AND deleted_at IS NULL
		ORDER BY name, id
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncProcessRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncProcessRecord
		var customFieldsRaw []byte
		if err := rows.Scan(&rec.ID, &rec.Name, &rec.Code, &customFieldsRaw); err != nil {
			return nil, err
		}
		rec.CustomFields = decodeJSONMap(customFieldsRaw)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) ListSections(ctx context.Context, deptID int) ([]DepartmentSyncSectionRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			s.id,
			s.name,
			s.code,
			COALESCE(s.description, ''),
			s.active,
			s.color,
			s.leader_id,
			s.leader_name,
			COALESCE(s.custom_fields, '{}'::jsonb) AS custom_fields,
			COALESCE((
				SELECT json_agg(sp.process_name ORDER BY COALESCE(sp.display_order, 0), sp.id)
				FROM section_processes sp
				WHERE sp.section_id = s.id
			), '[]'::json) AS process_names
		FROM sections s
		WHERE s.department_id = $1
			AND s.deleted_at IS NULL
		ORDER BY s.name, s.id
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncSectionRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncSectionRecord
		var customFieldsRaw []byte
		var processNamesRaw []byte
		if err := rows.Scan(
			&rec.ID,
			&rec.Name,
			&rec.Code,
			&rec.Description,
			&rec.Active,
			&rec.Color,
			&rec.LeaderID,
			&rec.LeaderName,
			&customFieldsRaw,
			&processNamesRaw,
		); err != nil {
			return nil, err
		}
		rec.CustomFields = decodeJSONMap(customFieldsRaw)
		rec.ProcessNames = decodeJSONStringArray(processNamesRaw)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) ListMaterials(ctx context.Context, deptID int) ([]DepartmentSyncMaterialRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(name, ''), code, type, is_implant, COALESCE(custom_fields, '{}'::jsonb)
		FROM materials
		WHERE department_id = $1
			AND deleted_at IS NULL
		ORDER BY name, id
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncMaterialRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncMaterialRecord
		var customFieldsRaw []byte
		if err := rows.Scan(
			&rec.ID,
			&rec.Name,
			&rec.Code,
			&rec.Type,
			&rec.IsImplant,
			&customFieldsRaw,
		); err != nil {
			return nil, err
		}
		rec.CustomFields = decodeJSONMap(customFieldsRaw)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *departmentSyncRepo) ListProducts(ctx context.Context, deptID int) ([]DepartmentSyncProductRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			p.id,
			p.code,
			p.name,
			p.category_name,
			c.category_name_lv1,
			c.category_name_lv2,
			c.name AS category_name_lv3,
			p.retail_price,
			p.cost_price,
			COALESCE(p.custom_fields, '{}'::jsonb) AS custom_fields,
			COALESCE((
				SELECT json_agg(pr.name ORDER BY COALESCE(pp.display_order, 0), pp.id)
				FROM product_processes pp
				JOIN processes pr ON pr.id = pp.process_id
				WHERE pp.product_id = p.id
			), '[]'::json) AS process_names,
			COALESCE((
				SELECT json_agg(COALESCE(b.code, '') ORDER BY pbn.id)
				FROM product_brand_names pbn
				JOIN brand_names b ON b.id = pbn.brand_name_id
				WHERE pbn.product_id = p.id
			), '[]'::json) AS brand_codes,
			COALESCE((
				SELECT json_agg(b.name ORDER BY pbn.id)
				FROM product_brand_names pbn
				JOIN brand_names b ON b.id = pbn.brand_name_id
				WHERE pbn.product_id = p.id
			), '[]'::json) AS brand_names,
			COALESCE((
				SELECT json_agg(COALESCE(rm.code, '') ORDER BY prm.id)
				FROM product_raw_materials prm
				JOIN raw_materials rm ON rm.id = prm.raw_material_id
				WHERE prm.product_id = p.id
			), '[]'::json) AS raw_material_codes,
			COALESCE((
				SELECT json_agg(rm.name ORDER BY prm.id)
				FROM product_raw_materials prm
				JOIN raw_materials rm ON rm.id = prm.raw_material_id
				WHERE prm.product_id = p.id
			), '[]'::json) AS raw_material_names,
			COALESCE((
				SELECT json_agg(COALESCE(t.code, '') ORDER BY pt.id)
				FROM product_techniques pt
				JOIN techniques t ON t.id = pt.technique_id
				WHERE pt.product_id = p.id
			), '[]'::json) AS technique_codes,
			COALESCE((
				SELECT json_agg(t.name ORDER BY pt.id)
				FROM product_techniques pt
				JOIN techniques t ON t.id = pt.technique_id
				WHERE pt.product_id = p.id
			), '[]'::json) AS technique_names,
			COALESCE((
				SELECT json_agg(COALESCE(rt.code, '') ORDER BY prt.id)
				FROM product_restoration_types prt
				JOIN restoration_types rt ON rt.id = prt.restoration_type_id
				WHERE prt.product_id = p.id
			), '[]'::json) AS restoration_type_codes,
			COALESCE((
				SELECT json_agg(rt.name ORDER BY prt.id)
				FROM product_restoration_types prt
				JOIN restoration_types rt ON rt.id = prt.restoration_type_id
				WHERE prt.product_id = p.id
			), '[]'::json) AS restoration_type_names,
			p.template_id,
			tpl.code AS template_code,
			p.is_template
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		LEFT JOIN products tpl ON tpl.id = p.template_id
		WHERE p.department_id = $1
			AND p.deleted_at IS NULL
		ORDER BY p.is_template DESC, p.name, p.id
	`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DepartmentSyncProductRecord, 0)
	for rows.Next() {
		var rec DepartmentSyncProductRecord
		var customFieldsRaw []byte
		var processNamesRaw []byte
		var brandCodesRaw []byte
		var brandNamesRaw []byte
		var rawMaterialCodesRaw []byte
		var rawMaterialNamesRaw []byte
		var techniqueCodesRaw []byte
		var techniqueNamesRaw []byte
		var restorationTypeCodesRaw []byte
		var restorationTypeNamesRaw []byte
		if err := rows.Scan(
			&rec.ID,
			&rec.Code,
			&rec.Name,
			&rec.CategoryName,
			&rec.CategoryLV1,
			&rec.CategoryLV2,
			&rec.CategoryLV3,
			&rec.RetailPrice,
			&rec.CostPrice,
			&customFieldsRaw,
			&processNamesRaw,
			&brandCodesRaw,
			&brandNamesRaw,
			&rawMaterialCodesRaw,
			&rawMaterialNamesRaw,
			&techniqueCodesRaw,
			&techniqueNamesRaw,
			&restorationTypeCodesRaw,
			&restorationTypeNamesRaw,
			&rec.TemplateID,
			&rec.TemplateCode,
			&rec.IsTemplate,
		); err != nil {
			return nil, err
		}
		rec.CustomFields = decodeJSONMap(customFieldsRaw)
		rec.ProcessNames = decodeJSONStringArray(processNamesRaw)
		rec.BrandNameCodes = decodeJSONStringArray(brandCodesRaw)
		rec.BrandNameNames = decodeJSONStringArray(brandNamesRaw)
		rec.RawMaterialCodes = decodeJSONStringArray(rawMaterialCodesRaw)
		rec.RawMaterialNames = decodeJSONStringArray(rawMaterialNamesRaw)
		rec.TechniqueCodes = decodeJSONStringArray(techniqueCodesRaw)
		rec.TechniqueNames = decodeJSONStringArray(techniqueNamesRaw)
		rec.RestorationTypeCodes = decodeJSONStringArray(restorationTypeCodesRaw)
		rec.RestorationTypeNames = decodeJSONStringArray(restorationTypeNamesRaw)
		out = append(out, rec)
	}
	return out, rows.Err()
}

func decodeJSONMap(data []byte) map[string]any {
	out := map[string]any{}
	if len(data) == 0 {
		return out
	}
	_ = json.Unmarshal(data, &out)
	return out
}

func decodeJSONStringArray(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(data, &out); err != nil {
		return []string{}
	}
	normalized := make([]string, 0, len(out))
	for _, item := range out {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		normalized = append(normalized, item)
	}
	return normalized
}

func nullableString(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	s := strings.TrimSpace(v.String)
	if s == "" {
		return nil
	}
	return &s
}
