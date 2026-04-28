package registrar

import (
	"fmt"

	policy "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/shared/logger"
)

func init() {
	logger.Debug("[RELATION] Register section - leader")
	policy.Register1("section_leader", policy.Config1{
		MainTable:    "sections",
		MainIDProp:   "ID",
		MainRefIDCol: "leader_id",

		RefTable:   "users",
		RefIDCol:   "id",
		RefNameCol: "name",
		RefFields:  []string{"id", "name"},

		Permissions: []string{"staff.view"},
		CachePrefix: "staff",
	})
	policy.RegisterRefSearch("section_leader", policy.ConfigSearch{
		RefTable:     "users",
		Alias:        "u",
		NormFields:   []string{"u.name"},
		RefFields:    []string{"id", "name"},
		SelectFields: []string{"u.id", "u.name"},
		Permissions:  []string{"staff.search"},
		CachePrefix:  "staff:search",
		ExtraJoins: func() string {
			return `
				JOIN staffs s ON s.user_staff = u.id
			`
		},
		ExtraWhere: func(params policy.ExtraWhereParams, args *[]any) string {
			if params.DepartmentID <= 0 {
				return ""
			}
			*args = append(*args, params.DepartmentID)
			return fmt.Sprintf("s.department_id = $%d", len(*args))
		},
	})
}
