package service

import (
	"bytes"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNormalizeDeliveryNotePaperSize_DefaultsToA5(t *testing.T) {
	got, err := normalizeDeliveryNotePaperSize("")
	if err != nil {
		t.Fatalf("normalizeDeliveryNotePaperSize returned error: %v", err)
	}
	if got != deliveryNotePaperSizeA5 {
		t.Fatalf("expected %s, got %s", deliveryNotePaperSizeA5, got)
	}
}

func TestNormalizeDeliveryNotePaperSize_AcceptsA4(t *testing.T) {
	got, err := normalizeDeliveryNotePaperSize("a4")
	if err != nil {
		t.Fatalf("normalizeDeliveryNotePaperSize returned error: %v", err)
	}
	if got != deliveryNotePaperSizeA4 {
		t.Fatalf("expected %s, got %s", deliveryNotePaperSizeA4, got)
	}
}

func TestNormalizeDeliveryNotePaperSize_RejectsInvalidValue(t *testing.T) {
	_, err := normalizeDeliveryNotePaperSize("letter")
	if err == nil {
		t.Fatal("expected error for unsupported paper size")
	}
}

func TestGetDeliveryNoteTemplate_Cached(t *testing.T) {
	tpl1, err := getDeliveryNoteTemplate()
	if err != nil {
		t.Fatalf("getDeliveryNoteTemplate first call: %v", err)
	}
	tpl2, err := getDeliveryNoteTemplate()
	if err != nil {
		t.Fatalf("getDeliveryNoteTemplate second call: %v", err)
	}
	if tpl1 == nil || tpl2 == nil {
		t.Fatal("expected non-nil templates")
	}
	if tpl1 != tpl2 {
		t.Fatal("expected cached template instance to be reused")
	}
}

func TestConvertImageToBase64_WithFileSchemePNG(t *testing.T) {
	tmpDir := t.TempDir()
	imgPath := filepath.Join(tmpDir, "logo.png")

	// 1x1 transparent PNG
	pngB64 := "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X8xkAAAAASUVORK5CYII="
	pngBytes, err := base64.StdEncoding.DecodeString(pngB64)
	if err != nil {
		t.Fatalf("decode test png: %v", err)
	}
	if err := os.WriteFile(imgPath, pngBytes, 0o600); err != nil {
		t.Fatalf("write test png: %v", err)
	}

	dataURI, err := ConvertImageToBase64("file://" + imgPath)
	if err != nil {
		t.Fatalf("ConvertImageToBase64 returned error: %v", err)
	}
	if !strings.HasPrefix(dataURI, "data:image/png;base64,") {
		t.Fatalf("unexpected data URI prefix: %s", dataURI[:min(32, len(dataURI))])
	}
}

func TestConvertImageToBase64_NotFound(t *testing.T) {
	_, err := ConvertImageToBase64("/no/such/file.png")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestBuildQRCodeImageURL_EscapesPayload(t *testing.T) {
	out := BuildQRCodeImageURL("https://example.com/delivery/qr/a b", 160)
	if !strings.Contains(out, "data=https%3A%2F%2Fexample.com%2Fdelivery%2Fqr%2Fa+b") {
		t.Fatalf("unexpected QR image URL: %s", out)
	}
}

func TestDeliveryNoteTemplate_DoesNotRenderPaymentSection(t *testing.T) {
	tpl, err := getDeliveryNoteTemplate()
	if err != nil {
		t.Fatalf("getDeliveryNoteTemplate: %v", err)
	}

	viewData := buildDeliveryNoteViewData(DeliveryNote{
		Company: DeliveryNoteCompany{Name: "Test Company"},
		Order: DeliveryNoteOrder{
			Number: "ORD-001",
			Date:   time.Date(2026, time.April, 4, 10, 30, 0, 0, time.UTC),
		},
		ShowAmounts: true,
		Items: []DeliveryNoteItem{
			{
				Description: "Rang su",
				Quantity:    2,
				UnitPrice:   100000,
			},
		},
		Attachments: DeliveryNoteAttachments{
			Items: []DeliveryNoteAttachmentItem{{ID: 1, Name: "Bộ chứng từ", Checked: true}},
		},
		ImplantAccessories: DeliveryNoteImplantAccessories{
			Items: []DeliveryNoteImplantAccessoryItem{{ID: 1, Name: "Tay vặn", Checked: true}},
		},
		PaymentMethod: DeliveryNotePaymentMethod{
			TienMat: true,
			CongNo:  true,
		},
	}, deliveryNotePaperSizeA4)

	var html bytes.Buffer
	if err := tpl.Execute(&html, viewData); err != nil {
		t.Fatalf("execute delivery note template: %v", err)
	}

	rendered := html.String()
	if strings.Contains(rendered, "3. Thanh toán") {
		t.Fatal("expected payment section title to be removed from rendered delivery note")
	}
	if strings.Contains(rendered, "Tiền mặt") || strings.Contains(rendered, "Công nợ") {
		t.Fatal("expected payment method labels to be removed from rendered delivery note")
	}
	if !strings.Contains(rendered, "size: A4 portrait;") {
		t.Fatal("expected selected paper size to be rendered into template css")
	}
	if !strings.Contains(rendered, "Đơn giá") || !strings.Contains(rendered, "Thành tiền") {
		t.Fatal("expected amount columns to be rendered when show amounts is enabled")
	}
	if !strings.Contains(rendered, "GIẢM GIÁ") || !strings.Contains(rendered, "THÀNH TIỀN") {
		t.Fatal("expected amount summary rows to be rendered when show amounts is enabled")
	}
}

func TestDeliveryNoteTemplate_HidesAmountColumnsAndTotals(t *testing.T) {
	tpl, err := getDeliveryNoteTemplate()
	if err != nil {
		t.Fatalf("getDeliveryNoteTemplate: %v", err)
	}

	viewData := buildDeliveryNoteViewData(DeliveryNote{
		Company: DeliveryNoteCompany{Name: "Test Company"},
		Order: DeliveryNoteOrder{
			Number: "ORD-002",
			Date:   time.Date(2026, time.April, 4, 10, 30, 0, 0, time.UTC),
		},
		ShowAmounts: false,
		Items: []DeliveryNoteItem{
			{
				Description: "Rang su",
				Quantity:    2,
				UnitPrice:   100000,
			},
		},
	}, deliveryNotePaperSizeA5)

	var html bytes.Buffer
	if err := tpl.Execute(&html, viewData); err != nil {
		t.Fatalf("execute delivery note template: %v", err)
	}

	rendered := html.String()
	if strings.Contains(rendered, "Đơn giá") || strings.Contains(rendered, "Thành tiền") {
		t.Fatal("expected amount columns to be removed when show amounts is disabled")
	}
	if strings.Contains(rendered, "GIẢM GIÁ") || strings.Contains(rendered, "THÀNH TIỀN") || strings.Contains(rendered, "MÃ KHUYẾN MÃI") {
		t.Fatal("expected amount summary rows to be removed when show amounts is disabled")
	}
	if !strings.Contains(rendered, "TỔNG CỘNG") {
		t.Fatal("expected total quantity row to remain when show amounts is disabled")
	}
}

func TestResolveDeliveryNoteShowAmounts_DefaultsToTrue(t *testing.T) {
	if !resolveDeliveryNoteShowAmounts(nil) {
		t.Fatal("expected nil show_amounts to default to true")
	}

	disabled := false
	if resolveDeliveryNoteShowAmounts(&disabled) {
		t.Fatal("expected explicit false show_amounts to be preserved")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
