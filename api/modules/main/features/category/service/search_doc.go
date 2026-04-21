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

const categorySearchEntityType = "category"

func buildCategorySearchDoc(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.CategoryDTO) *searchmodel.Doc {
	if dto == nil || dto.Name == nil {
		return nil
	}

	path := joinSearchParts(" > ",
		utils.DerefString(dto.CategoryNameLv1),
		utils.DerefString(dto.CategoryNameLv2),
		utils.DerefString(dto.CategoryNameLv3),
	)
	kwPtr, _ := searchutils.BuildKeywords(ctx, cfMgr, "category", []any{dto.Name, path}, dto.CustomFields)
	subtitle := utils.Ptr(path)
	if path == "" {
		subtitle = nil
	}

	return &searchmodel.Doc{
		EntityType: categorySearchEntityType,
		EntityID:   int64(dto.ID),
		Title:      *dto.Name,
		Subtitle:   subtitle,
		Keywords:   &kwPtr,
		Content:    nil,
		Attributes: map[string]any{},
		OrgID:      utils.Ptr(int64(deptID)),
		OwnerID:    nil,
	}
}

func publishCategorySearch(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.CategoryDTO) {
	doc := buildCategorySearchDoc(ctx, cfMgr, deptID, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func publishCategoryUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: categorySearchEntityType,
		EntityID:   int64(id),
	})
}
