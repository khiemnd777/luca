package registrar

import (
	"fmt"

	policy "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/shared/logger"
)

func init() {
	logger.Debug("[RELATION] Register sections - processes")

	policy.RegisterM2M("sections_processes",
		policy.ConfigM2M{
			MainTable:           "sections",
			RefTable:            "processes",
			EntityPropMainID:    "ID",
			DTOPropRefIDs:       "ProcessIDs",
			DTOPropDisplayNames: "ProcessNames",
			ExtraFields: []policy.ExtraM2MField{
				{Column: "section_name", EntityProp: "Name"},
			},
			RefNameColumn: "process_name",
			RefValueCache: &policy.RefValueCacheConfig{
				Columns: []policy.RefValueCacheColumn{
					{RefColumn: "section_id", M2MColumn: "section_id"},
					{RefColumn: "section_name", M2MColumn: "section_name"},
				},
			},

			RefList: &policy.RefListConfig{
				Permissions: []string{"process.view"},
				RefFields:   []string{"id", "code", "name", "section_name"},
				CachePrefix: "process:list",
			},
		},
	)

	policy.RegisterRefSearch("sections_processes", policy.ConfigSearch{
		RefTable:    "processes",
		NormFields:  []string{"code", "name"},
		RefFields:   []string{"id", "code", "name", "section_name"},
		Permissions: []string{"process.search"},
		CachePrefix: "process:list",
		ExtraWhere: func(params policy.ExtraWhereParams, args *[]any) string {
			*args = append(*args, params.DepartmentID)
			return fmt.Sprintf(`
				r.deleted_at IS NULL AND
				r.department_id = $%d::INT AND
				NOT EXISTS (
					SELECT 1 FROM section_processes sp
					WHERE sp.process_id = r.id
				)
			`, len(*args))
		},
	})
}
