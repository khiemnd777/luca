package service

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/khiemnd777/noah_api/modules/notification/notificationModel"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
)

func buildPushPayload(notification *generated.Notification) notificationModel.PushNotificationPayload {
	title := "Bạn có thông báo mới"
	body := "Có một cập nhật mới trong hệ thống."
	deepLink := "/notification"

	switch notification.Type {
	case "order:new", "order:checkin":
		title = fmt.Sprintf("Đơn hàng #%s mới liên quan đến bộ phận bạn phụ trách", stringFromData(notification.Data, "order_item_code"))
		body = joinBodyLines(
			kvLine("Phòng ban", joinDataList(notification.Data, "related_section_names")),
			kvLine("Công đoạn", joinDataList(notification.Data, "related_process_names")),
		)
		deepLink = valueOrDefault(stringFromData(notification.Data, "href"), orderLink(notification.Data))
	case "order:checkout":
		title = fmt.Sprintf("Đơn hàng #%s đang chờ xử lý", stringFromData(notification.Data, "order_item_code"))
		body = joinBodyLines(
			kvLine("Sản phẩm", joinNonEmpty(" - ", stringFromData(notification.Data, "product_code"), stringFromData(notification.Data, "product_name"))),
			kvLine("Công đoạn", stringFromData(notification.Data, "process_name")),
			kvLine("Phòng ban", stringFromData(notification.Data, "section_name")),
		)
		deepLink = valueOrDefault(stringFromData(notification.Data, "href"), "/check-code")
	case "order:process:completed":
		title = fmt.Sprintf("Đơn hàng #%s đã hoàn thành gia công", stringFromData(notification.Data, "order_item_code"))
		body = joinBodyLines(
			kvLine("Sản phẩm", joinNonEmpty(" - ", stringFromData(notification.Data, "product_code"), stringFromData(notification.Data, "product_name"))),
			kvLine("Công đoạn", stringFromData(notification.Data, "process_name")),
			kvLine("Phòng ban", stringFromData(notification.Data, "section_name")),
		)
		deepLink = valueOrDefault(stringFromData(notification.Data, "href"), orderLink(notification.Data))
	case "order:delivery:completed":
		title = fmt.Sprintf("Đơn hàng #%s đã giao hoàn tất", stringFromData(notification.Data, "order_item_code"))
		body = joinBodyLines(
			kvLine("Mã", stringFromData(notification.Data, "order_item_code")),
		)
		deepLink = valueOrDefault(stringFromData(notification.Data, "href"), orderLink(notification.Data))
	default:
		if msg := stringFromData(notification.Data, "message"); msg != "" {
			body = msg
		} else if msg := stringFromData(notification.Data, "title"); msg != "" {
			title = msg
		}
		if href := stringFromData(notification.Data, "href"); href != "" {
			deepLink = href
		}
	}

	title = safeFallback(title, "Bạn có thông báo mới")
	body = safeFallback(body, "Có một cập nhật mới trong hệ thống.")

	return notificationModel.PushNotificationPayload{
		NotificationID: notification.ID,
		Type:           notification.Type,
		Title:          title,
		Body:           body,
		Data:           notification.Data,
		DeepLink:       deepLink,
		Topic:          buildPushTopic(notification.Type),
	}
}

func buildPushTopic(notifType string) string {
	normalized := strings.NewReplacer(":", "-", "_", "-", "/", "-").Replace(strings.ToLower(strings.TrimSpace(notifType)))
	if normalized == "" {
		normalized = "notification"
	}
	if len(normalized) <= 32 {
		return normalized
	}
	sum := sha1.Sum([]byte(normalized))
	return hex.EncodeToString(sum[:16])
}

func orderLink(data map[string]any) string {
	orderID := stringFromData(data, "order_id")
	if orderID == "" {
		return "/order"
	}
	return fmt.Sprintf("/order/%s", orderID)
}

func stringFromData(data map[string]any, key string) string {
	if data == nil {
		return ""
	}
	raw, ok := data[key]
	if !ok || raw == nil {
		return ""
	}
	return fmt.Sprintf("%v", raw)
}

func joinDataList(data map[string]any, key string) string {
	if data == nil {
		return ""
	}

	raw, ok := data[key]
	if !ok || raw == nil {
		return ""
	}

	switch value := raw.(type) {
	case []string:
		return joinNonEmpty(", ", value...)
	case []any:
		parts := make([]string, 0, len(value))
		for _, item := range value {
			parts = append(parts, fmt.Sprintf("%v", item))
		}
		return joinNonEmpty(", ", parts...)
	default:
		return fmt.Sprintf("%v", raw)
	}
}

func kvLine(label, value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	return fmt.Sprintf("%s: %s", label, value)
}

func joinBodyLines(lines ...string) string {
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		filtered = append(filtered, line)
	}
	return strings.Join(filtered, "\n")
}

func joinNonEmpty(sep string, parts ...string) string {
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		filtered = append(filtered, part)
	}
	return strings.Join(filtered, sep)
}

func safeFallback(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func valueOrDefault(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}
