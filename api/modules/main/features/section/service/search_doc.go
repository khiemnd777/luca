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

const sectionSearchEntityType = "section"

func buildSectionSearchDoc(ctx context.Context, cfMgr *customfields.Manager, dto *model.SectionDTO) *searchmodel.Doc {
	if dto == nil || dto.ID <= 0 || dto.DepartmentID <= 0 || dto.Name == "" {
		return nil
	}

	processNames := ""
	if dto.ProcessNames != nil {
		processNames = *dto.ProcessNames
	}
	keywords := joinSearchParts("|",
		utils.DerefString(dto.Code),
		dto.Description,
		processNames,
	)
	if cfMgr != nil {
		if kwPtr, err := searchutils.BuildKeywords(ctx, cfMgr, "section", []any{
			dto.Code,
			dto.Description,
			processNames,
		}, dto.CustomFields); err == nil {
			keywords = kwPtr
		}
	}

	subtitleValue := joinSearchParts(" | ",
		utils.DerefString(dto.Code),
		dto.Description,
		processNames,
	)
	var subtitle *string
	if subtitleValue != "" {
		subtitle = utils.Ptr(subtitleValue)
	}

	return &searchmodel.Doc{
		EntityType: sectionSearchEntityType,
		EntityID:   int64(dto.ID),
		Title:      dto.Name,
		Subtitle:   subtitle,
		Keywords:   utils.Ptr(keywords),
		Content:    nil,
		Attributes: map[string]any{},
		OrgID:      utils.Ptr(int64(dto.DepartmentID)),
		OwnerID:    nil,
	}
}

func publishSectionSearch(ctx context.Context, cfMgr *customfields.Manager, dto *model.SectionDTO) {
	doc := buildSectionSearchDoc(ctx, cfMgr, dto)
	if doc == nil {
		return
	}
	sharedsearch.PublishUpsert(ctx, doc)
}

func publishSectionUnlink(ctx context.Context, id int) {
	sharedsearch.PublishUnlink(ctx, &searchmodel.UnlinkDoc{
		EntityType: sectionSearchEntityType,
		EntityID:   int64(id),
	})
}
