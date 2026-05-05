package orderby

import (
	"errors"
	"regexp"
	"strings"
)

var (
	ErrInvalidOrderBy = errors.New("invalid order by")

	customFieldOrderKeyPattern = regexp.MustCompile(`^[A-Za-z0-9_][A-Za-z0-9_.-]*$`)
)

func ValidateCustomFieldOrderKey(key string) error {
	if strings.Contains(key, "--") {
		return ErrInvalidOrderBy
	}
	if !customFieldOrderKeyPattern.MatchString(key) {
		return ErrInvalidOrderBy
	}
	return nil
}
