package search

import (
	"context"

	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/modules/search/model"
	"github.com/khiemnd777/noah_api/shared/pubsub"
)

var publishAsync = pubsub.PublishAsync

func PublishUpsert(ctx context.Context, doc *model.Doc) {
	if doc == nil {
		return
	}
	dbutils.RegisterAfterCommit(ctx, func() {
		_ = publishAsync("search:upsert", doc)
	})
}

func PublishUnlink(ctx context.Context, doc *model.UnlinkDoc) {
	if doc == nil {
		return
	}
	dbutils.RegisterAfterCommit(ctx, func() {
		_ = publishAsync("search:unlink", doc)
	})
}
