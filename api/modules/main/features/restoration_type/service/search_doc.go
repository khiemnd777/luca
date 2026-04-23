package service

import (
	"context"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	sharedsearch "github.com/khiemnd777/noah_api/shared/modules/search"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const restorationTypeSearchEntityType = "restoration_type"

func BuildRestorationTypeSearchDoc(deptID int, dto *model.RestorationTypeDTO) *searchmodel.Doc {
	if dto == nil || dto.Name == nil {
		return nil
	}

	keywords := joinSearchParts("|", utils.DerefString(dto.Code), *dto.Name, utils.DerefString(dto.CategoryName))

	return &searchmodel.Doc{
		EntityType: restorationTypeSearchEntityType,
		EntityID:   int64(dto.ID),
		Title:      *dto.Name,
		Subtitle:   dto.CategoryName,
		Keywords:   utils.Ptr(keywords),
		Content:    nil,
		Attributes: map[string]any{"code": utils.DerefString(dto.Code)},
		OrgID:      utils.Ptr(int64(deptID)),
		OwnerID:    nil,
	}
}

func publishRestorationTypeSearch(ctx context.Context, deptID int, dto *model.RestorationTypeDTO) {
	doc := BuildRestorationTypeSearchDoc(deptID, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func PublishSearch(deptID int, dto *model.RestorationTypeDTO) {
	publishRestorationTypeSearch(context.Background(), deptID, dto)
}

func publishRestorationTypeUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: restorationTypeSearchEntityType,
		EntityID:   int64(id),
	})
}
