package validator

import (
	"strings"

	"golang.org/x/text/unicode/norm"
)

func NormalizeString(value string) string {
	return norm.NFC.String(strings.TrimSpace(value))
}
