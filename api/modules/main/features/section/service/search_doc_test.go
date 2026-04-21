package service

import (
	"context"
	"testing"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
)

func stringPtr(v string) *string {
	return &v
}

func TestBuildSectionSearchDoc(t *testing.T) {
	t.Parallel()

	dto := &model.SectionDTO{
		ID:           7,
		DepartmentID: 2,
		Name:         "Đúc sườn",
		Code:         stringPtr("DS"),
		Description:  "Gia công khung sườn",
		ProcessNames: stringPtr("Wax, Casting"),
		CustomFields: map[string]any{"zone": "A1"},
	}

	doc := buildSectionSearchDoc(context.Background(), nil, dto)
	if doc == nil {
		t.Fatal("buildSectionSearchDoc() = nil")
	}
	if doc.EntityType != sectionSearchEntityType {
		t.Fatalf("entity type = %q, want %q", doc.EntityType, sectionSearchEntityType)
	}
	if doc.EntityID != 7 {
		t.Fatalf("entity id = %d, want 7", doc.EntityID)
	}
	if doc.Title != "Đúc sườn" {
		t.Fatalf("title = %q, want %q", doc.Title, "Đúc sườn")
	}
	if doc.OrgID == nil || *doc.OrgID != 2 {
		t.Fatalf("org_id = %v, want 2", doc.OrgID)
	}
	if doc.Subtitle == nil {
		t.Fatal("subtitle = nil, want value")
	}
	wantSubtitle := "DS | Gia công khung sườn | Wax, Casting"
	if *doc.Subtitle != wantSubtitle {
		t.Fatalf("subtitle = %q, want %q", *doc.Subtitle, wantSubtitle)
	}
	if doc.Keywords == nil {
		t.Fatal("keywords = nil")
	}
	if got := *doc.Keywords; got == "" {
		t.Fatal("keywords = empty, want non-empty")
	}
}

func TestBuildSectionSearchDocReturnsNilForIncompleteDTO(t *testing.T) {
	t.Parallel()

	if doc := buildSectionSearchDoc(context.Background(), nil, &model.SectionDTO{}); doc != nil {
		t.Fatalf("buildSectionSearchDoc() = %#v, want nil", doc)
	}
}
