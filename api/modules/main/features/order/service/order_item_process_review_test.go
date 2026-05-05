package service

import (
	"context"
	"strings"
	"testing"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
)

func TestOrderItemProcessServiceCheckInOrOut_DentistReviewRequiresNote(t *testing.T) {
	svc := &orderItemProcessService{}

	_, err := svc.CheckInOrOut(context.Background(), 1, 2, &model.OrderItemProcessInProgressDTO{
		ID:                        10,
		RequiresDentistReview:     true,
		DentistReviewRequestNote:  ptrString("   "),
		OrderItemID:               20,
		DentistReviewResponseNote: nil,
		DentistReviewID:           nil,
		DentistReviewStatus:       nil,
	})
	if err == nil {
		t.Fatal("expected missing dentist review note error")
	}
	if !strings.Contains(err.Error(), "dentist review request note is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestOrderItemProcessServiceResolveDentistReview_RejectsInvalidResult(t *testing.T) {
	svc := &orderItemProcessService{}

	_, err := svc.ResolveDentistReview(context.Background(), 1, 2, 3, &model.OrderItemProcessDentistReviewResolveDTO{
		Result: "maybe",
		Note:   ptrString("reviewed"),
	})
	if err == nil {
		t.Fatal("expected invalid dentist review result error")
	}
	if !strings.Contains(err.Error(), "invalid dentist review result") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func ptrString(v string) *string {
	return &v
}
