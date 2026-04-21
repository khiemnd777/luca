package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/notification/config"
	"github.com/khiemnd777/noah_api/modules/notification/notificationModel"
	"github.com/khiemnd777/noah_api/modules/notification/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/module"
)

type NotificationService struct {
	repo         *repository.NotificationRepository
	deps         *module.ModuleDeps[config.ModuleConfig]
	pushProvider PushProvider
}

func NewNotificationService(repo *repository.NotificationRepository, deps *module.ModuleDeps[config.ModuleConfig]) *NotificationService {
	return &NotificationService{
		repo:         repo,
		deps:         deps,
		pushProvider: NewWebPushProvider(deps.Config.Push),
	}
}

func (s *NotificationService) LatestNotification(ctx context.Context, userID int) (*notificationModel.Notification, error) {
	return s.repo.LatestNotification(ctx, userID)
}

func (s *NotificationService) ShortListByUser(ctx context.Context, userID int) ([]*notificationModel.Notification, error) {
	key := fmt.Sprintf("user:%d:notifications:short", userID)
	return cache.GetList(key, cache.TTLLong, func() ([]*notificationModel.Notification, error) {
		return s.repo.ShortListByUser(ctx, userID)
	})
}

func (s *NotificationService) ListByUserPaginated(
	ctx context.Context,
	userID, page, limit int,
) ([]*notificationModel.Notification, bool, error) {
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	if page == 1 {
		key := fmt.Sprintf("user:%d:notifications:first-page", userID)
		return cache.GetListWithHasMore(key, cache.TTLLong, func() ([]*notificationModel.Notification, bool, error) {
			return s.repo.ListByUserPaginated(ctx, userID, limit, offset)
		})
	}

	return s.repo.ListByUserPaginated(ctx, userID, limit, offset)
}

func (s *NotificationService) GetByMessageID(ctx context.Context, messageID string) (*notificationModel.Notification, error) {
	return s.repo.GetByMessageID(ctx, messageID)
}

func (s *NotificationService) Create(ctx context.Context, messageID string, userID, notifierID int, notifType string, data map[string]any) (*generated.Notification, error) {
	var result *generated.Notification
	err := cache.UpdateManyAndInvalidate([]string{
		fmt.Sprintf("user:%d:notifications:short", userID),
		fmt.Sprintf("user:%d:notifications:first-page", userID),
		fmt.Sprintf("user:%d:notifications:unread", userID),
	}, func() error {
		notification, createErr := s.repo.Create(ctx, messageID, userID, notifierID, notifType, data)
		result = notification
		return createErr
	})
	if err != nil || result == nil {
		return result, err
	}

	go s.dispatchNotificationPush(context.Background(), result)

	return result, nil
}

func (s *NotificationService) MarkAsRead(ctx context.Context, userID, notificationID int) error {
	return cache.UpdateManyAndInvalidate([]string{
		fmt.Sprintf("user:%d:notifications:short", userID),
		fmt.Sprintf("user:%d:notifications:first-page", userID),
		fmt.Sprintf("user:%d:notifications:unread", userID),
	}, func() error {
		return s.repo.MarkAsRead(ctx, notificationID)
	})
}

func (s *NotificationService) CountUnread(ctx context.Context, userID int) (*int, error) {
	key := fmt.Sprintf("user:%d:notifications:unread", userID)
	return cache.Get(key, cache.TTLLong, func() (*int, error) {
		return s.repo.CountUnread(ctx, userID)
	})
}

func (s *NotificationService) Delete(ctx context.Context, userID, notificationID int) error {
	return cache.UpdateManyAndInvalidate([]string{
		fmt.Sprintf("user:%d:notifications:short", userID),
		fmt.Sprintf("user:%d:notifications:first-page", userID),
		fmt.Sprintf("user:%d:notifications:unread", userID),
	}, func() error {
		return s.repo.Delete(ctx, notificationID)
	})
}

func (s *NotificationService) DeleteAll(ctx context.Context, userID int) error {
	return cache.UpdateManyAndInvalidate([]string{
		fmt.Sprintf("user:%d:notifications:short", userID),
		fmt.Sprintf("user:%d:notifications:first-page", userID),
		fmt.Sprintf("user:%d:notifications:unread", userID),
	}, func() error {
		return s.repo.DeleteAll(ctx, userID)
	})
}

func (s *NotificationService) GetPushPublicConfig() notificationModel.PushPublicConfig {
	pushCfg := s.deps.Config.Push
	enabled := s.pushProvider.Enabled()

	return notificationModel.PushPublicConfig{
		Enabled:   enabled,
		PublicKey: strings.TrimSpace(pushCfg.PublicKey),
		Subject:   strings.TrimSpace(pushCfg.Subject),
	}
}

func (s *NotificationService) UpsertPushSubscription(
	ctx context.Context,
	userID int,
	req notificationModel.PushSubscriptionUpsertRequest,
) (*notificationModel.PushSubscription, error) {
	req.Endpoint = strings.TrimSpace(req.Endpoint)
	req.P256DH = strings.TrimSpace(req.P256DH)
	req.Auth = strings.TrimSpace(req.Auth)
	req.Platform = sanitizePlatform(req.Platform)
	req.InstallMode = sanitizeInstallMode(req.InstallMode)
	req.PermissionState = sanitizePermissionState(req.PermissionState)

	return s.repo.UpsertPushSubscription(ctx, userID, req)
}

func (s *NotificationService) ListPushSubscriptions(
	ctx context.Context,
	userID int,
) ([]*notificationModel.PushSubscription, error) {
	return s.repo.ListPushSubscriptionsByUser(ctx, userID)
}

func (s *NotificationService) DeletePushSubscription(ctx context.Context, userID, id int) error {
	return s.repo.DeletePushSubscription(ctx, userID, id)
}

func (s *NotificationService) SendTestPush(ctx context.Context, userID int) (map[string]int, error) {
	payload := notificationModel.PushNotificationPayload{
		NotificationID: 0,
		Type:           "notification:test",
		Title:          "Thông báo thử nghiệm",
		Body:           "Thiết bị này đã sẵn sàng nhận notification từ Noah.",
		DeepLink:       "/account",
		Data: map[string]any{
			"kind": "test",
		},
		Topic: "notification-test",
	}

	return s.dispatchPayloadToUser(ctx, userID, payload)
}

func (s *NotificationService) dispatchNotificationPush(ctx context.Context, notification *generated.Notification) {
	if notification == nil {
		return
	}
	payload := buildPushPayload(notification)
	stats, err := s.dispatchPayloadToUser(ctx, notification.UserID, payload)
	if err != nil {
		logger.Warn("notification.push.dispatch_failed",
			"notification_id", notification.ID,
			"user_id", notification.UserID,
			"type", notification.Type,
			"error", err,
		)
		return
	}

	logger.Info("notification.push.dispatch_completed",
		"notification_id", notification.ID,
		"user_id", notification.UserID,
		"type", notification.Type,
		"sent", stats["sent"],
		"failed", stats["failed"],
		"disabled", stats["disabled"],
	)
}

func (s *NotificationService) dispatchPayloadToUser(
	ctx context.Context,
	userID int,
	payload notificationModel.PushNotificationPayload,
) (map[string]int, error) {
	stats := map[string]int{
		"sent":     0,
		"failed":   0,
		"disabled": 0,
	}

	if !s.pushProvider.Enabled() || !s.isTypeAllowed(payload.Type) {
		return stats, nil
	}

	subs, err := s.repo.ListActivePushSubscriptionsByUser(ctx, userID)
	if err != nil {
		return stats, err
	}

	for _, sub := range subs {
		now := time.Now()
		result, sendErr := s.pushProvider.Send(ctx, sub, payload)
		if sendErr != nil {
			stats["failed"]++
			_ = s.repo.MarkPushSubscriptionError(ctx, sub.ID, sendErr.Error(), now)
			continue
		}

		if result.DisableSubscription {
			stats["disabled"]++
			_ = s.repo.DisablePushSubscription(ctx, sub.ID, now, result.StatusText)
			continue
		}

		if result.OK {
			stats["sent"]++
			_ = s.repo.MarkPushSubscriptionSent(ctx, sub.ID, now)
			continue
		}

		stats["failed"]++
		_ = s.repo.MarkPushSubscriptionError(ctx, sub.ID, result.StatusText, now)
	}

	return stats, nil
}

func (s *NotificationService) isTypeAllowed(notifType string) bool {
	allowed := s.deps.Config.Push.AllowedTypes
	if len(allowed) == 0 {
		return true
	}

	for _, item := range allowed {
		if item == notifType {
			return true
		}
	}
	return false
}

func sanitizePlatform(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "ios", "android", "desktop":
		return strings.ToLower(strings.TrimSpace(v))
	default:
		return "unknown"
	}
}

func sanitizeInstallMode(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "standalone", "browser":
		return strings.ToLower(strings.TrimSpace(v))
	default:
		return "browser"
	}
}

func sanitizePermissionState(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "granted", "denied", "default":
		return strings.ToLower(strings.TrimSpace(v))
	default:
		return "default"
	}
}
