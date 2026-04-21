package service

import (
	"context"
	"fmt"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	sharedsearch "github.com/khiemnd777/noah_api/shared/modules/search"
	searchmodel "github.com/khiemnd777/noah_api/shared/modules/search/model"
	searchutils "github.com/khiemnd777/noah_api/shared/search"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const materialSearchEntityType = "material"

func buildMaterialSearchDoc(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.MaterialDTO) *searchmodel.Doc {
	if dto == nil || dto.Name == nil {
		return nil
	}

	implantLabel := "false"
	if dto.IsImplant {
		implantLabel = "true"
	}
	kwPtr, _ := searchutils.BuildKeywords(ctx, cfMgr, "material", []any{
		dto.Code,
		dto.Type,
		implantLabel,
	}, dto.CustomFields)
	subtitleValue := joinSearchParts(" | ", utils.DerefString(dto.Code), utils.DerefString(dto.Type), fmt.Sprintf("implant=%t", dto.IsImplant))
	var subtitle *string
	if subtitleValue != "" {
		subtitle = utils.Ptr(subtitleValue)
	}

	return &searchmodel.Doc{
		EntityType: materialSearchEntityType,
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

func publishMaterialSearch(ctx context.Context, cfMgr *customfields.Manager, deptID int, dto *model.MaterialDTO) {
	doc := buildMaterialSearchDoc(ctx, cfMgr, deptID, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func publishMaterialUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: materialSearchEntityType,
		EntityID:   int64(id),
	})
}
