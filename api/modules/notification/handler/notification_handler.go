package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/modules/notification/config"
	"github.com/khiemnd777/noah_api/modules/notification/notificationModel"
	"github.com/khiemnd777/noah_api/modules/notification/service"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type NotificationHandler struct {
	svc  *service.NotificationService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewNotificationHandler(svc *service.NotificationService, deps *module.ModuleDeps[config.ModuleConfig]) *NotificationHandler {
	return &NotificationHandler{
		svc:  svc,
		deps: deps,
	}
}

func (h *NotificationHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/push-config", h.GetPushConfig)
	app.RouterGet(router, "/push-subscriptions", h.ListPushSubscriptions)
	app.RouterPost(router, "/push-subscriptions", h.UpsertPushSubscription)
	app.RouterDelete(router, "/push-subscriptions/:id", h.DeletePushSubscription)
	app.RouterPost(router, "/push-subscriptions/test", h.TestPushSubscription)
	app.RouterGet(router, "/unread/count", h.CountUnread)
	app.RouterGet(router, "/short", h.ShortList)
	app.RouterGet(router, "/latest", h.LatestNotification)
	app.RouterGet(router, "/message", h.GetByMessage)
	app.RouterPut(router, "/:id/read", h.MarkAsRead)
	app.RouterDelete(router, "/:id", h.Delete)
	app.RouterDelete(router, "", h.DeleteAll)
	app.RouterGet(router, "", h.ListPaginated)
}

func (h *NotificationHandler) RegisterRoutesInternal(router fiber.Router) {
	app.RouterPost(router, "/create", h.Create)
}

func (h *NotificationHandler) GetPushConfig(c *fiber.Ctx) error {
	return c.JSON(h.svc.GetPushPublicConfig())
}

func (h *NotificationHandler) ListPushSubscriptions(c *fiber.Ctx) error {
	userID, _ := utils.GetUserIDInt(c)

	items, err := h.svc.ListPushSubscriptions(c.UserContext(), userID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to list push subscriptions")
	}

	return c.JSON(items)
}

func (h *NotificationHandler) UpsertPushSubscription(c *fiber.Ctx) error {
	var req notificationModel.PushSubscriptionUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "Invalid request body")
	}
	if req.Endpoint == "" || req.P256DH == "" || req.Auth == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "Push subscription endpoint and keys are required")
	}

	userID, _ := utils.GetUserIDInt(c)
	item, err := h.svc.UpsertPushSubscription(c.UserContext(), userID, req)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to save push subscription")
	}

	return c.JSON(item)
}

func (h *NotificationHandler) DeletePushSubscription(c *fiber.Ctx) error {
	subscriptionID, err := utils.GetParamAsInt(c, "id")
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "Invalid push subscription ID")
	}

	userID, _ := utils.GetUserIDInt(c)
	if err := h.svc.DeletePushSubscription(c.UserContext(), userID, subscriptionID); err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to delete push subscription")
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *NotificationHandler) TestPushSubscription(c *fiber.Ctx) error {
	userID, _ := utils.GetUserIDInt(c)

	stats, err := h.svc.SendTestPush(c.UserContext(), userID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to send test notification")
	}

	return c.JSON(stats)
}

func (h *NotificationHandler) LatestNotification(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	userID, _ := utils.GetUserIDInt(c)
	latest, err := h.svc.LatestNotification(c.UserContext(), userID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to get latest notification")
	}
	return c.JSON(latest)
}

func (h *NotificationHandler) GetByMessage(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	messageID := utils.GetQueryAsString(c, "message_id")
	not, err := h.svc.GetByMessageID(c.UserContext(), messageID)

	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to get notification by message")
	}
	return c.JSON(not)
}

func (h *NotificationHandler) ListPaginated(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	userID, _ := utils.GetUserIDInt(c)
	page := utils.GetQueryAsInt(c, "page")
	limit := utils.GetQueryAsInt(c, "limit", 14)

	items, hasMore, err := h.svc.ListByUserPaginated(c.UserContext(), userID, page, limit)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to list notifications")
	}

	return c.JSON(fiber.Map{
		"items":    items,
		"has_more": hasMore,
	})
}

func (h *NotificationHandler) ShortList(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	userID, _ := utils.GetUserIDInt(c)

	items, err := h.svc.ShortListByUser(c.UserContext(), userID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to get notifications")
	}

	return c.JSON(items)
}

func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	notifID, err := utils.GetParamAsInt(c, "id")

	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "Invalid notification ID")
	}

	userID, _ := utils.GetUserIDInt(c)
	err = h.svc.MarkAsRead(c.UserContext(), userID, notifID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to mark as read")
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *NotificationHandler) Create(c *fiber.Ctx) error {
	var req struct {
		UserID     int            `json:"user_id"`
		NotifierID int            `json:"notifier_id"`
		MessageID  string         `json:"message_id"`
		Type       string         `json:"type"`
		Data       map[string]any `json:"data"`
	}

	if err := c.BodyParser(&req); err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "Invalid request body")
	}

	if req.Type == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "Type is required")
	}

	notification, err := h.svc.Create(c.UserContext(), req.MessageID, req.UserID, req.NotifierID, req.Type, req.Data)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to create notification")
	}

	return c.JSON(notification)
}

func (h *NotificationHandler) CountUnread(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	userID, _ := utils.GetUserIDInt(c)

	count, err := h.svc.CountUnread(c.UserContext(), userID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to count unread notifications")
	}

	return c.JSON(fiber.Map{
		"unread_count": count,
	})
}

func (h *NotificationHandler) Delete(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	notifID, err := utils.GetParamAsInt(c, "id")
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "Invalid notification ID")
	}

	userID, _ := utils.GetUserIDInt(c)

	if err := h.svc.Delete(c.UserContext(), userID, notifID); err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to delete notification")
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *NotificationHandler) DeleteAll(c *fiber.Ctx) error {
	if err := rbac.GuardAnyRole(c, h.deps.Ent.(*generated.Client), "admin", "staff"); err != nil {
		return err
	}

	userID, _ := utils.GetUserIDInt(c)

	if err := h.svc.DeleteAll(c.UserContext(), userID); err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, "Failed to delete all notifications")
	}

	return c.SendStatus(fiber.StatusOK)
}
