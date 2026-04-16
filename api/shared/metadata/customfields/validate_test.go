package customfields

import (
	"context"
	"errors"
	"testing"
)

type stubStore struct {
	getIDBySlug func(ctx context.Context, slug string) (*int, error)
	loadSchema  func(ctx context.Context, slug string) (*Schema, error)
}

func (s stubStore) GetIDBySlug(ctx context.Context, slug string) (*int, error) {
	return s.getIDBySlug(ctx, slug)
}

func (s stubStore) LoadSchema(ctx context.Context, slug string) (*Schema, error) {
	return s.loadSchema(ctx, slug)
}

func TestValidateIgnoresMissingCollectionWhenCustomFieldsEmpty(t *testing.T) {
	mgr := NewManager(stubStore{
		getIDBySlug: func(ctx context.Context, slug string) (*int, error) {
			return nil, ErrCollectionNotFound
		},
		loadSchema: func(ctx context.Context, slug string) (*Schema, error) {
			t.Fatalf("loadSchema should not be called when collection is missing")
			return nil, nil
		},
	})

	got, err := mgr.Validate(context.Background(), "clinic", nil, false)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil {
		t.Fatalf("expected validate result")
	}
	if len(got.Clean) != 0 {
		t.Fatalf("expected no clean fields, got %v", got.Clean)
	}
	if len(got.Errs) != 0 {
		t.Fatalf("expected no validation errors, got %v", got.Errs)
	}
}

func TestValidateFailsWhenCollectionMissingAndCustomFieldsProvided(t *testing.T) {
	mgr := NewManager(stubStore{
		getIDBySlug: func(ctx context.Context, slug string) (*int, error) {
			return nil, ErrCollectionNotFound
		},
		loadSchema: func(ctx context.Context, slug string) (*Schema, error) {
			t.Fatalf("loadSchema should not be called when collection is missing")
			return nil, nil
		},
	})

	_, err := mgr.Validate(context.Background(), "clinic", map[string]any{"foo": "bar"}, false)
	if !errors.Is(err, ErrCollectionNotFound) {
		t.Fatalf("expected ErrCollectionNotFound, got %v", err)
	}
}

func TestGetSearchFieldValuesSkipsLookupWhenCustomFieldsEmpty(t *testing.T) {
	mgr := NewManager(stubStore{
		getIDBySlug: func(ctx context.Context, slug string) (*int, error) {
			t.Fatalf("GetIDBySlug should not be called when custom fields are empty")
			return nil, nil
		},
		loadSchema: func(ctx context.Context, slug string) (*Schema, error) {
			t.Fatalf("LoadSchema should not be called when custom fields are empty")
			return nil, nil
		},
	})

	values, err := mgr.GetSearchFieldValues(context.Background(), "clinic", map[string]any{})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(values) != 0 {
		t.Fatalf("expected no values, got %v", values)
	}
}
