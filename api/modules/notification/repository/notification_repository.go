package repository

import (
	"context"
	"time"

	"github.com/khiemnd777/noah_api/modules/notification/config"
	"github.com/khiemnd777/noah_api/modules/notification/notificationModel"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/devicepushsubscription"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/notification"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
	"github.com/khiemnd777/noah_api/shared/module"
)

type NotificationRepository struct {
	client *generated.Client
	deps   *module.ModuleDeps[config.ModuleConfig]
}

func NewNotificationRepository(client *generated.Client, deps *module.ModuleDeps[config.ModuleConfig]) *NotificationRepository {
	return &NotificationRepository{
		client: client,
		deps:   deps,
	}
}

func (r *NotificationRepository) LatestNotification(ctx context.Context, userID int) (*notificationModel.Notification, error) {
	single, err := r.client.Notification.Query().
		Where(
			notification.UserID(userID),
			notification.Read(false),
			notification.Deleted(false),
		).
		Order(generated.Desc(notification.FieldCreatedAt)).
		First(ctx)

	if err != nil {
		return nil, err
	}

	result := &notificationModel.Notification{
		ID:         single.ID,
		UserID:     single.UserID,
		NotifierID: single.NotifierID,
		CreatedAt:  single.CreatedAt,
		Type:       single.Type,
		Read:       single.Read,
		Data:       single.Data,
	}

	if notifier, err := r.client.User.
		Query().
		Where(user.ID(single.NotifierID)).
		Only(ctx); err == nil {
		result.Notifier = notifier
	}

	return result, nil
}

func (r *NotificationRepository) GetByMessageID(ctx context.Context, messageID string) (*notificationModel.Notification, error) {
	single, err := r.client.Notification.Query().
		Where(
			notification.MessageID(messageID),
			notification.Read(false),
			notification.Deleted(false),
		).
		Only(ctx)

	if err != nil {
		return nil, err
	}

	result := &notificationModel.Notification{
		ID:         single.ID,
		UserID:     single.UserID,
		NotifierID: single.NotifierID,
		CreatedAt:  single.CreatedAt,
		Type:       single.Type,
		Read:       single.Read,
		Data:       single.Data,
	}

	if notifier, err := r.client.User.
		Query().
		Where(user.ID(single.NotifierID)).
		Only(ctx); err == nil {
		result.Notifier = notifier
	}

	return result, nil
}

func (r *NotificationRepository) ShortListByUser(ctx context.Context, userID int) ([]*notificationModel.Notification, error) {
	notifs, err := r.client.Notification.
		Query().
		Where(notification.UserIDEQ(userID), notification.Deleted(false)).
		Order(generated.Desc(notification.FieldCreatedAt)).
		Limit(7).
		All(ctx)

	if err != nil {
		return nil, err
	}

	var result []*notificationModel.Notification

	for _, n := range notifs {
		nElm := notificationModel.Notification{
			ID:         n.ID,
			UserID:     n.UserID,
			NotifierID: n.NotifierID,
			CreatedAt:  n.CreatedAt,
			Type:       n.Type,
			Read:       n.Read,
			Data:       n.Data,
		}
		notifier, err := r.client.User.
			Query().
			Where(user.ID(n.NotifierID)).
			Only(ctx)
		if err == nil {
			nElm.Notifier = notifier
		}

		result = append(result, &nElm)
	}

	return result, nil
}

func (r *NotificationRepository) ListByUserPaginated(ctx context.Context, userID, limit, offset int) ([]*notificationModel.Notification, bool, error) {
	notifs, err := r.client.Notification.
		Query().
		Where(notification.UserIDEQ(userID), notification.Deleted(false)).
		Order(generated.Desc(notification.FieldCreatedAt)).
		Offset(offset).
		Limit(limit + 1).
		All(ctx)

	if err != nil {
		return nil, false, err
	}

	hasMore := len(notifs) > limit
	if hasMore {
		notifs = notifs[:limit]
	}

	var result []*notificationModel.Notification

	for _, n := range notifs {
		nElm := notificationModel.Notification{
			ID:         n.ID,
			UserID:     n.UserID,
			NotifierID: n.NotifierID,
			CreatedAt:  n.CreatedAt,
			Type:       n.Type,
			Read:       n.Read,
			Data:       n.Data,
		}
		notifier, err := r.client.User.
			Query().
			Where(user.ID(n.NotifierID)).
			Only(ctx)
		if err == nil {
			nElm.Notifier = notifier
		}

		result = append(result, &nElm)
	}

	return result, hasMore, nil
}

func (r *NotificationRepository) Create(ctx context.Context, messageID string, userID, notifierID int, notifType string, data map[string]any) (*generated.Notification, error) {
	return r.client.Notification.
		Create().
		SetUserID(userID).
		SetNotifierID(notifierID).
		SetMessageID(messageID).
		SetType(notifType).
		SetRead(false).
		SetData(data).
		Save(ctx)
}

func (r *NotificationRepository) MarkAsRead(ctx context.Context, notificationID int) error {
	return r.client.Notification.
		UpdateOneID(notificationID).
		SetRead(true).
		Exec(ctx)
}

func (r *NotificationRepository) CountUnread(ctx context.Context, userID int) (*int, error) {
	count, err := r.client.Notification.
		Query().
		Where(
			notification.UserIDEQ(userID),
			notification.Read(false),
			notification.Deleted(false),
		).
		Count(ctx)

	if err != nil {
		return nil, err
	}

	return &count, nil
}

func (r *NotificationRepository) Delete(ctx context.Context, notificationID int) error {
	return r.client.Notification.
		UpdateOneID(notificationID).
		SetDeleted(true).
		Exec(ctx)
}

func (r *NotificationRepository) DeleteAll(ctx context.Context, userID int) error {
	_, err := r.client.Notification.
		Update().
		Where(
			notification.UserID(userID),
			notification.Deleted(false),
		).
		SetDeleted(true).
		Save(ctx)
	return err
}

func (r *NotificationRepository) UpsertPushSubscription(
	ctx context.Context,
	userID int,
	req notificationModel.PushSubscriptionUpsertRequest,
) (*notificationModel.PushSubscription, error) {
	existing, err := r.client.DevicePushSubscription.Query().
		Where(devicepushsubscription.Endpoint(req.Endpoint)).
		Only(ctx)
	if err != nil && !generated.IsNotFound(err) {
		return nil, err
	}

	now := time.Now()
	deviceLabel := nilIfEmpty(req.DeviceLabel)
	userAgent := nilIfEmpty(req.UserAgent)

	if existing != nil {
		entity, updateErr := r.client.DevicePushSubscription.UpdateOne(existing).
			SetUserID(userID).
			SetP256dh(req.P256DH).
			SetAuth(req.Auth).
			SetPlatform(req.Platform).
			SetInstallMode(req.InstallMode).
			SetPermissionState(req.PermissionState).
			SetLastSeenAt(now).
			ClearDisabledAt().
			ClearRevokedAt().
			ClearLastErrorAt().
			ClearLastError().
			SetUpdatedAt(now).
			SetNillableDeviceLabel(deviceLabel).
			SetNillableUserAgent(userAgent).
			Save(ctx)
		if updateErr != nil {
			return nil, updateErr
		}
		return mapPushSubscription(entity), nil
	}

	entity, createErr := r.client.DevicePushSubscription.Create().
		SetUserID(userID).
		SetEndpoint(req.Endpoint).
		SetP256dh(req.P256DH).
		SetAuth(req.Auth).
		SetPlatform(req.Platform).
		SetInstallMode(req.InstallMode).
		SetPermissionState(req.PermissionState).
		SetLastSeenAt(now).
		SetNillableDeviceLabel(deviceLabel).
		SetNillableUserAgent(userAgent).
		Save(ctx)
	if createErr != nil {
		return nil, createErr
	}

	return mapPushSubscription(entity), nil
}

func (r *NotificationRepository) ListPushSubscriptionsByUser(
	ctx context.Context,
	userID int,
) ([]*notificationModel.PushSubscription, error) {
	rows, err := r.client.DevicePushSubscription.Query().
		Where(devicepushsubscription.UserIDEQ(userID)).
		Order(generated.Desc(devicepushsubscription.FieldUpdatedAt)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*notificationModel.PushSubscription, 0, len(rows))
	for _, row := range rows {
		result = append(result, mapPushSubscription(row))
	}

	return result, nil
}

func (r *NotificationRepository) DeletePushSubscription(ctx context.Context, userID, id int) error {
	return r.client.DevicePushSubscription.DeleteOneID(id).
		Where(devicepushsubscription.UserIDEQ(userID)).
		Exec(ctx)
}

func (r *NotificationRepository) ListActivePushSubscriptionsByUser(
	ctx context.Context,
	userID int,
) ([]*generated.DevicePushSubscription, error) {
	return r.client.DevicePushSubscription.Query().
		Where(
			devicepushsubscription.UserIDEQ(userID),
			devicepushsubscription.DisabledAtIsNil(),
			devicepushsubscription.RevokedAtIsNil(),
		).
		Order(generated.Desc(devicepushsubscription.FieldUpdatedAt)).
		All(ctx)
}

func (r *NotificationRepository) MarkPushSubscriptionSent(ctx context.Context, id int, sentAt time.Time) error {
	return r.client.DevicePushSubscription.UpdateOneID(id).
		SetLastSeenAt(sentAt).
		SetLastSentAt(sentAt).
		ClearLastErrorAt().
		ClearLastError().
		Exec(ctx)
}

func (r *NotificationRepository) MarkPushSubscriptionError(ctx context.Context, id int, errMsg string, at time.Time) error {
	return r.client.DevicePushSubscription.UpdateOneID(id).
		SetLastSeenAt(at).
		SetLastErrorAt(at).
		SetLastError(errMsg).
		Exec(ctx)
}

func (r *NotificationRepository) DisablePushSubscription(ctx context.Context, id int, at time.Time, errMsg string) error {
	return r.client.DevicePushSubscription.UpdateOneID(id).
		SetLastSeenAt(at).
		SetDisabledAt(at).
		SetRevokedAt(at).
		SetLastErrorAt(at).
		SetLastError(errMsg).
		Exec(ctx)
}

func mapPushSubscription(ent *generated.DevicePushSubscription) *notificationModel.PushSubscription {
	if ent == nil {
		return nil
	}

	return &notificationModel.PushSubscription{
		ID:              ent.ID,
		UserID:          ent.UserID,
		Endpoint:        ent.Endpoint,
		Platform:        ent.Platform,
		DeviceLabel:     stringValue(ent.DeviceLabel),
		UserAgent:       stringValue(ent.UserAgent),
		InstallMode:     ent.InstallMode,
		PermissionState: ent.PermissionState,
		LastSeenAt:      ent.LastSeenAt,
		LastSentAt:      ent.LastSentAt,
		LastErrorAt:     ent.LastErrorAt,
		LastError:       ent.LastError,
		DisabledAt:      ent.DisabledAt,
		RevokedAt:       ent.RevokedAt,
		CreatedAt:       ent.CreatedAt,
		UpdatedAt:       ent.UpdatedAt,
	}
}

func nilIfEmpty(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

func stringValue(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
