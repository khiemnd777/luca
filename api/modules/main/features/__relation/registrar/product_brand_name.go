package registrar

import (
	policy "github.com/khiemnd777/noah_api/modules/main/features/__relation/policy"
	"github.com/khiemnd777/noah_api/shared/logger"
)

func init() {
	logger.Debug("[RELATION] Register products - brand names")
	policy.RegisterM2M("products_brand_names",
		policy.ConfigM2M{
			MainTable:           "products",
			RefTable:            "brand_names",
			EntityPropMainID:    "ID",
			DTOPropRefIDs:       "BrandNameIDs",
			DTOPropDisplayNames: "BrandNameNames",

			RefList: &policy.RefListConfig{
				Permissions: []string{"product.view"},
				RefFields:   []string{"id", "category_id", "code", "name"},
				CachePrefix: "brand_name:list",
			},
		},
	)

	policy.RegisterRefSearch("products_brand_names", policy.ConfigSearch{
		RefTable:    "brand_names",
		NormFields:  []string{"code", "name"},
		RefFields:   []string{"id", "category_id", "code", "name"},
		Permissions: []string{"product.search"},
		CachePrefix: "brand_name:search",
	})
}
