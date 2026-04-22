package users_register

import (
	"errors"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var errInvalidSignupName = errors.New("invalid signup name")

func normalizeSignupName(name string) (string, error) {
	name = norm.NFC.String(strings.TrimSpace(name))
	if name == "" {
		return "", errInvalidSignupName
	}

	for _, r := range name {
		switch {
		case r == ' ':
			continue
		case unicode.IsControl(r):
			return "", errInvalidSignupName
		case unicode.In(r, unicode.Cf, unicode.Zl, unicode.Zp):
			return "", errInvalidSignupName
		case unicode.IsSpace(r):
			return "", errInvalidSignupName
		}
	}

	return name, nil
}
