package service

import (
	"context"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	sharedsearch "github.com/khiemnd777/noah_api/shared/modules/search"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	searchutils "github.com/khiemnd777/noah_api/shared/search"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const productSearchEntityType = "product"

func buildProductSearchDoc(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.ProductDTO) *searchmodel.Doc {
	if dto == nil || dto.Name == nil {
		return nil
	}

	kwPtr, _ := searchutils.BuildKeywords(ctx, cfMgr, "product", []any{
		dto.Code,
		dto.CategoryName,
		dto.BrandNameNames,
		dto.RawMaterialNames,
		dto.TechniqueNames,
		dto.RestorationTypeNames,
	}, dto.CustomFields)

	return &searchmodel.Doc{
		EntityType: productSearchEntityType,
		EntityID:   int64(dto.ID),
		Title:      *dto.Name,
		Subtitle:   dto.CategoryName,
		Keywords:   &kwPtr,
		Content:    nil,
		Attributes: map[string]any{},
		OrgID:      utils.Ptr(int64(deptID)),
		OwnerID:    nil,
	}
}

func publishProductSearch(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.ProductDTO) {
	doc := buildProductSearchDoc(ctx, cfMgr, deptID, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func publishProductUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: productSearchEntityType,
		EntityID:   int64(id),
	})
}
