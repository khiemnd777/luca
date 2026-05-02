package service

import (
	"testing"
	"time"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	planningrepo "github.com/khiemnd777/noah_api/modules/main/features/dashboard/production_planning/repository"
)

func TestBuildRiskItemBuckets(t *testing.T) {
	now := time.Date(2026, 5, 1, 9, 0, 0, 0, time.UTC)
	cfg := &model.ProductionPlanningConfigDTO{
		Enabled:            true,
		ConfigComplete:     true,
		DefaultDurationMin: 30,
		BusinessHours: model.ProductionPlanningBusinessHoursDTO{
			StartHour: 8,
			EndHour:   17,
			WorkDays:  []int{1, 2, 3, 4, 5},
		},
		ProcessDurations: map[string]int{},
	}
	svc := &productionPlanningService{}

	tests := []struct {
		name       string
		deliveryAt time.Time
		wantBucket string
		wantLate   bool
	}{
		{name: "overdue", deliveryAt: now.Add(-time.Minute), wantBucket: model.PlanningRiskBucketOverdue, wantLate: true},
		{name: "due 2h", deliveryAt: now.Add(2 * time.Hour), wantBucket: model.PlanningRiskBucketDue2h},
		{name: "due 4h", deliveryAt: now.Add(4 * time.Hour), wantBucket: model.PlanningRiskBucketDue4h},
		{name: "due 6h", deliveryAt: now.Add(6 * time.Hour), wantBucket: model.PlanningRiskBucketDue6h},
		{name: "normal", deliveryAt: now.Add(7 * time.Hour), wantBucket: model.PlanningRiskBucketNormal},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item := svc.buildRiskItem(now, cfg, &planningrepo.WorkItem{
				OrderID:               1,
				OrderItemID:           2,
				InProgressID:          3,
				DeliveryAt:            &tc.deliveryAt,
				RemainingProcessCount: 1,
			})
			if item.RiskBucket != tc.wantBucket {
				t.Fatalf("bucket = %s, want %s", item.RiskBucket, tc.wantBucket)
			}
			if item.PredictedLate != tc.wantLate && tc.wantLate {
				t.Fatalf("predicted late = %v, want %v", item.PredictedLate, tc.wantLate)
			}
		})
	}
}

func TestAddBusinessMinutesSkipsAfterHoursAndWeekend(t *testing.T) {
	hours := model.ProductionPlanningBusinessHoursDTO{
		StartHour: 8,
		EndHour:   17,
		WorkDays:  []int{1, 2, 3, 4, 5},
	}
	start := time.Date(2026, 5, 1, 16, 30, 0, 0, time.UTC) // Friday
	got := addBusinessMinutes(start, 90, hours)
	want := time.Date(2026, 5, 4, 9, 0, 0, 0, time.UTC) // Monday
	if !got.Equal(want) {
		t.Fatalf("eta = %s, want %s", got, want)
	}
}
