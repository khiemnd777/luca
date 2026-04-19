package service

import (
	"strings"
	"testing"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
)

func TestBuildQRSlipA5FromOrder_UsesLatestOrderItemQRCode(t *testing.T) {
	orderCode := "ORD-001"
	itemCode := "AORD-001"
	itemQR := "order/QU9SRC0wMDE="
	productName := "Răng sứ Zirconia"
	productNote := "Răng 11"

	slip, err := buildQRSlipA5FromOrder(&model.OrderDTO{
		Code: &orderCode,
		LatestOrderItem: &model.OrderItemDTO{
			Code:   &itemCode,
			QrCode: &itemQR,
		},
	}, []*model.OrderItemProductDTO{
		{
			ProductName: &productName,
			Quantity:    2,
			Note:        &productNote,
		},
	})
	if err != nil {
		t.Fatalf("buildQRSlipA5FromOrder: %v", err)
	}

	if slip.QRCode != itemQR {
		t.Fatalf("expected qr slip to use latest order item qr %q, got %q", itemQR, slip.QRCode)
	}
	if !strings.Contains(slip.QRCodeImageURL, "data=order%2FQU9SRC0wMDE%3D") {
		t.Fatalf("expected qr image url to be built from latest order item qr, got %q", slip.QRCodeImageURL)
	}
	if len(slip.Products) != 1 {
		t.Fatalf("expected one slip product, got %d", len(slip.Products))
	}
	if slip.Products[0].Description != "Răng sứ Zirconia" {
		t.Fatalf("expected slip product description to exclude note, got %q", slip.Products[0].Description)
	}
	if slip.Products[0].Note != "Răng 11" {
		t.Fatalf("expected slip product note to be split out, got %q", slip.Products[0].Note)
	}
	if slip.Products[0].Quantity != 2 {
		t.Fatalf("expected slip product quantity 2, got %d", slip.Products[0].Quantity)
	}
}

func TestBuildQRSlipA5FromOrder_FallsBackToGeneratedProcessQRCode(t *testing.T) {
	orderCode := "ORD-002"
	itemCode := "BORD-002"

	slip, err := buildQRSlipA5FromOrder(&model.OrderDTO{
		Code: &orderCode,
		LatestOrderItem: &model.OrderItemDTO{
			Code: &itemCode,
		},
	}, nil)
	if err != nil {
		t.Fatalf("buildQRSlipA5FromOrder fallback: %v", err)
	}

	if !strings.HasPrefix(slip.QRCode, "order/") {
		t.Fatalf("expected generated process qr to have order/ prefix, got %q", slip.QRCode)
	}
	if strings.Contains(slip.QRCode, "/delivery/qr/") {
		t.Fatalf("expected qr slip to avoid delivery qr url, got %q", slip.QRCode)
	}
}

func TestFormatDeliveryNotePhoneNumbers_JoinsNonEmptyValues(t *testing.T) {
	got := formatDeliveryNotePhoneNumbers("0900000001", "", " 0900000003 ")
	if got != "0900000001 - 0900000003" {
		t.Fatalf("expected joined phone numbers, got %q", got)
	}
}

func TestNormalizeDeliveryNotePhoneNumbers_SkipsEmptyValues(t *testing.T) {
	got := normalizeDeliveryNotePhoneNumbers("", "0900000002", " ")
	if len(got) != 1 || got[0] != "0900000002" {
		t.Fatalf("expected only non-empty phone numbers, got %#v", got)
	}
}
