package registrar

import (
	policy "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/shared/logger"
)

func init() {
	logger.Debug("[RELATION] Register orderitem - process")
	policy.Register1("orderitem_process", policy.Config1{
		RefTable:  "order_item_processes",
		RefIDCol:  "id",
		RefFields: []string{"id", "product_id", "product_code", "product_name", "process_name", "section_name", "color"},

		Permissions: []string{"order.view"},
		CachePrefix: "order:process",
	})

	/*
		SELECT u.id AS id,
					u.name AS name
		FROM staffs s
		JOIN users u ON u.id = s.user_id
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles ro ON ro.id = ur.role_id
		WHERE (u.name_norm LIKE $1)      -- keyword, normalized
			AND ro.role_name = $2          -- extra where
		ORDER BY name ASC                -- order_by name -> uses column alias
		LIMIT 21 OFFSET 0;               -- limit+1 for has_more
	*/
	policy.RegisterRefSearch("orderitem_process", policy.ConfigSearch{
		RefTable:     "order_item_processes",
		Alias:        "p",
		NormFields:   []string{"p.product_code_norm", "p.product_name_norm", "p.process_name_norm", "p.section_name_norm"},
		RefFields:    []string{"id", "product_id", "product_code", "product_name", "process_name", "section_name", "color"},
		SelectFields: []string{"p.id", "p.product_id", "p.product_code", "p.product_name", "p.process_name", "p.section_name", "p.color"},
		Permissions:  []string{"order.search", "order.development"},
		CachePrefix:  "order:process",
	})
}
