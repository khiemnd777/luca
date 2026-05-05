package orderby

import (
	"errors"
	"testing"
)

func TestValidateCustomFieldOrderKeyAcceptsAllowedKeys(t *testing.T) {
	tests := []string{
		"color",
		"size_code",
		"pricing.tier-1",
	}

	for _, tt := range tests {
		t.Run(tt, func(t *testing.T) {
			if err := ValidateCustomFieldOrderKey(tt); err != nil {
				t.Fatalf("ValidateCustomFieldOrderKey(%q) error = %v, want nil", tt, err)
			}
		})
	}
}

func TestValidateCustomFieldOrderKeyRejectsUnsafeKeys(t *testing.T) {
	tests := []string{
		"",
		"name') DESC, pg_sleep(5)--",
		"name;drop table users",
		"name with space",
		"(select 1)",
		"name--comment",
	}

	for _, tt := range tests {
		t.Run(tt, func(t *testing.T) {
			err := ValidateCustomFieldOrderKey(tt)
			if !errors.Is(err, ErrInvalidOrderBy) {
				t.Fatalf("ValidateCustomFieldOrderKey(%q) error = %v, want ErrInvalidOrderBy", tt, err)
			}
		})
	}
}
