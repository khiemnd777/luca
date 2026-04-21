package search

import (
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/modules/search"
	"github.com/khiemnd777/noah_api/shared/modules/search/model"
)

func init() {
	logger.Debug("[GuardSearch] Register Technique")
	search.RegisterGuard("technique", func(ctx search.GuardCtx, rows []model.Row) []model.Row {
		if !rbac.HasAnyPerm(ctx.Perms, "product.search") {
			return []model.Row{}
		}
		out := make([]model.Row, 0, len(rows))
		out = append(out, rows...)
		return out
	})
}
