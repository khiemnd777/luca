package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/khiemnd777/noah_api/modules/notification/config"
	"github.com/khiemnd777/noah_api/modules/notification/notificationModel"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
)

type PushProvider interface {
	Enabled() bool
	Send(ctx context.Context, sub *generated.DevicePushSubscription, payload notificationModel.PushNotificationPayload) (*PushSendResult, error)
}

type PushSendResult struct {
	OK                  bool
	StatusCode          int
	StatusText          string
	DisableSubscription bool
}

type WebPushProvider struct {
	cfg config.PushConfig
}

func NewWebPushProvider(cfg config.PushConfig) PushProvider {
	return &WebPushProvider{cfg: cfg}
}

func (p *WebPushProvider) Enabled() bool {
	return p.cfg.Enabled &&
		strings.TrimSpace(p.cfg.PublicKey) != "" &&
		strings.TrimSpace(p.cfg.PrivateKey) != "" &&
		strings.TrimSpace(p.cfg.Subject) != ""
}

func (p *WebPushProvider) Send(
	ctx context.Context,
	sub *generated.DevicePushSubscription,
	payload notificationModel.PushNotificationPayload,
) (*PushSendResult, error) {
	if !p.Enabled() {
		return &PushSendResult{}, nil
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	ttl := p.cfg.TTL
	if ttl <= 0 {
		ttl = 2 * time.Minute
	}

	resp, err := webpush.SendNotification(body, &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}, &webpush.Options{
		HTTPClient:       http.DefaultClient,
		Subscriber:       p.cfg.Subject,
		VAPIDPublicKey:   p.cfg.PublicKey,
		VAPIDPrivateKey:  p.cfg.PrivateKey,
		TTL:              int(ttl.Seconds()),
		Urgency:          webpush.Urgency(strings.ToLower(strings.TrimSpace(p.cfg.Urgency))),
		Topic:            payload.Topic,
		RecordSize:       0,
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	statusText := strings.TrimSpace(string(respBody))
	if statusText == "" {
		statusText = resp.Status
	}

	result := &PushSendResult{
		OK:         resp.StatusCode >= 200 && resp.StatusCode < 300,
		StatusCode: resp.StatusCode,
		StatusText: fmt.Sprintf("%s: %s", resp.Status, statusText),
	}
	if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
		result.DisableSubscription = true
	}

	return result, nil
}
