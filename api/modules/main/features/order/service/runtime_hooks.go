package service

import (
	"github.com/khiemnd777/noah_api/shared/cache"
	"github.com/khiemnd777/noah_api/shared/modules/notification"
	"github.com/khiemnd777/noah_api/shared/modules/realtime"
	"github.com/khiemnd777/noah_api/shared/pubsub"
)

var (
	invalidateKeysHook  = cache.InvalidateKeys
	publishAsyncHook    = pubsub.PublishAsync
	notifyHook          = notification.Notify
	broadcastAllHook    = realtime.BroadcastAll
	broadcastToDeptHook = realtime.BroadcastToDept
)
