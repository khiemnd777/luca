package service

import (
	"context"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	sharedsearch "github.com/khiemnd777/noah_api/shared/modules/search"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const brandNameSearchEntityType = "brand_name"

func BuildBrandNameSearchDoc(deptID int, dto *model.BrandNameDTO) *searchmodel.Doc {
	if dto == nil || dto.Name == nil {
		return nil
	}

	keywords := joinSearchParts("|", *dto.Name, utils.DerefString(dto.CategoryName))

	return &searchmodel.Doc{
		EntityType: brandNameSearchEntityType,
		EntityID:   int64(dto.ID),
		Title:      *dto.Name,
		Subtitle:   dto.CategoryName,
		Keywords:   utils.Ptr(keywords),
		Content:    nil,
		Attributes: map[string]any{},
		OrgID:      utils.Ptr(int64(deptID)),
		OwnerID:    nil,
	}
}

func publishBrandNameSearch(ctx context.Context, deptID int, dto *model.BrandNameDTO) {
	doc := BuildBrandNameSearchDoc(deptID, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func PublishSearch(deptID int, dto *model.BrandNameDTO) {
	publishBrandNameSearch(context.Background(), deptID, dto)
}

func publishBrandNameUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: brandNameSearchEntityType,
		EntityID:   int64(id),
	})
}
