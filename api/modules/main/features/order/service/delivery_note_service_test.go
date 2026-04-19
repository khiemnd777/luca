package service

import (
	"bytes"
	"encoding/base64"
	"io"
	"net/http"
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

func TestGetQRSlipA5Template_Cached(t *testing.T) {
	tpl1, err := getQRSlipA5Template()
	if err != nil {
		t.Fatalf("getQRSlipA5Template first call: %v", err)
	}
	tpl2, err := getQRSlipA5Template()
	if err != nil {
		t.Fatalf("getQRSlipA5Template second call: %v", err)
	}
	if tpl1 == nil || tpl2 == nil {
		t.Fatal("expected non-nil templates")
	}
	if tpl1 != tpl2 {
		t.Fatal("expected cached qr slip template instance to be reused")
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

func TestConvertImageToBase64_PreservesDataURI(t *testing.T) {
	const dataURI = "data:image/png;base64,abc123"

	got, err := ConvertImageToBase64(dataURI)
	if err != nil {
		t.Fatalf("ConvertImageToBase64 returned error: %v", err)
	}
	if got != dataURI {
		t.Fatalf("expected data URI to be returned unchanged, got %q", got)
	}
}

func TestConvertImageToBase64_RemoteSVG(t *testing.T) {
	originalTransport := http.DefaultTransport
	http.DefaultTransport = roundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     http.Header{"Content-Type": []string{"image/svg+xml"}},
			Body: io.NopCloser(strings.NewReader(
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text x="1" y="9">C</text></svg>`,
			)),
		}, nil
	})
	defer func() {
		http.DefaultTransport = originalTransport
	}()

	dataURI, err := ConvertImageToBase64("https://api.dicebear.com/9.x/initials/svg?seed=Company")
	if err != nil {
		t.Fatalf("ConvertImageToBase64 returned error: %v", err)
	}
	if !strings.HasPrefix(dataURI, "data:image/svg+xml;base64,") {
		t.Fatalf("unexpected data URI prefix: %s", dataURI[:min(40, len(dataURI))])
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
		Company: DeliveryNoteCompany{
			Name:              "Test Company",
			PhoneNumbersLabel: "0900000001 - 0900000002",
		},
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
			Items: []DeliveryNoteAttachmentItem{
				{ID: 1, Name: "Bộ chứng từ", Checked: true},
				{ID: 2, Name: "Máng ép", Checked: false},
				{ID: 3, Name: "Hộp đựng", Checked: true},
				{ID: 4, Name: "Sáp cắn", Checked: false},
				{ID: 5, Name: "Phiếu màu", Checked: true},
			},
		},
		ImplantAccessories: DeliveryNoteImplantAccessories{
			Items: []DeliveryNoteImplantAccessoryItem{
				{ID: 1, Name: "Tay vặn", Checked: true},
				{ID: 2, Name: "Transfer", Checked: false},
				{ID: 3, Name: "Analog", Checked: true},
			},
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
	if !strings.Contains(rendered, ".summary-row td {") {
		t.Fatal("expected compact summary row styles to be rendered")
	}
	if !strings.Contains(rendered, ".check-cell {\n      display: table-cell;\n      width: 25%;") {
		t.Fatal("expected checklist cells to render in four columns")
	}
	if strings.Count(rendered, "<div class=\"check-cell\"></div>") != 4 {
		t.Fatalf("expected checklist rendering to pad incomplete four-column rows, got %d fillers", strings.Count(rendered, "<div class=\"check-cell\"></div>"))
	}
	if !strings.Contains(rendered, "0900000001 - 0900000002") {
		t.Fatal("expected joined company phone numbers to be rendered")
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

func TestDeliveryNoteTemplate_HidesEmptyPhoneNumbers(t *testing.T) {
	tpl, err := getDeliveryNoteTemplate()
	if err != nil {
		t.Fatalf("getDeliveryNoteTemplate: %v", err)
	}

	viewData := buildDeliveryNoteViewData(DeliveryNote{
		Company: DeliveryNoteCompany{
			Name:    "Test Company",
			Address: "123 Nguyen Trai",
		},
		Order: DeliveryNoteOrder{
			Number: "ORD-003",
			Date:   time.Date(2026, time.April, 4, 10, 30, 0, 0, time.UTC),
		},
	}, deliveryNotePaperSizeA5)

	var html bytes.Buffer
	if err := tpl.Execute(&html, viewData); err != nil {
		t.Fatalf("execute delivery note template: %v", err)
	}

	rendered := html.String()
	if strings.Contains(rendered, "<div></div>") {
		t.Fatal("expected empty phone row to be omitted")
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

func TestQRSlipA5Template_RendersTwoColumnSummaryAndImage(t *testing.T) {
	tpl, err := getQRSlipA5Template()
	if err != nil {
		t.Fatalf("getQRSlipA5Template: %v", err)
	}

	viewData := buildQRSlipA5ViewData(QRSlipA5{
		Order: QRSlipA5Order{
			Number:      "ORD-004",
			ClinicName:  "Smile Lab",
			PatientName: "Nguyen Van B",
			DentistName: "BS Le",
		},
		Products: []QRSlipA5Item{
			{Description: "Răng sứ Zirconia", Note: "Răng 11", Quantity: 2},
			{Description: "Mão tạm", Note: "Hàm trên", Quantity: 1},
		},
		QRCode:         "https://example.com/qr",
		QRCodeImageURL: "https://example.com/qr.png",
	})

	var html bytes.Buffer
	if err := tpl.Execute(&html, viewData); err != nil {
		t.Fatalf("execute qr slip a5 template: %v", err)
	}

	rendered := html.String()
	if !strings.Contains(rendered, "grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);") {
		t.Fatal("expected two-column summary grid to be rendered")
	}
	if !strings.Contains(rendered, "width: 96mm;") {
		t.Fatal("expected reduced centered qr image size to be rendered")
	}
	if !strings.Contains(rendered, "Thông tin đơn hàng") || !strings.Contains(rendered, "Sản phẩm") {
		t.Fatal("expected two summary column titles to be rendered")
	}
	if !strings.Contains(rendered, "Răng sứ Zirconia x2") || !strings.Contains(rendered, "Mão tạm x1") {
		t.Fatal("expected product list entries to be rendered")
	}
	if !strings.Contains(rendered, "Răng 11") || !strings.Contains(rendered, "Hàm trên") {
		t.Fatal("expected product notes to be rendered on a second line")
	}
	if !strings.Contains(rendered, ".product-line-1") || !strings.Contains(rendered, ".product-line-2") {
		t.Fatal("expected product two-line styles to be rendered")
	}
	wantOrderFields := []string{
		"Mã đơn:",
		"ORD-004",
		"Phòng khám:",
		"Smile Lab",
		"Bệnh nhân:",
		"Nguyen Van B",
		"Bác sĩ:",
		"BS Le",
	}
	for _, field := range wantOrderFields {
		if !strings.Contains(rendered, field) {
			t.Fatalf("expected order summary to contain %q", field)
		}
	}
	if !strings.Contains(rendered, "https://example.com/qr.png") {
		t.Fatal("expected template to render qr image url")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
