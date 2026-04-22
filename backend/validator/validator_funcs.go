package validator

import (
	"encoding/json"
	"math"
	"strconv"
	"unicode"

	"github.com/go-playground/validator/v10"
)

func validCountry(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}
	err := validate.Var(value, "iso3166_1_alpha3")
	return err == nil
}

func validJson(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}

	var tmp map[string]string
	err := json.Unmarshal([]byte(value), &tmp)
	return err == nil
}

func validFloat(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true
	}
	res, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return false
	}

	return 0.0 < res && res <= math.MaxInt32
}

func validString(fl validator.FieldLevel) bool {
	value := fl.Field().String()

	for _, r := range value {
		switch {
		case r == ' ':
			continue
		case unicode.IsControl(r):
			return false
		case unicode.In(r, unicode.Cf, unicode.Zl, unicode.Zp):
			return false
		case unicode.IsSpace(r):
			return false
		}
	}

	return true
}
