package users_register_test

import (
	"fmt"
	"net/http"
	"testing"
	"trxd/api"
	"trxd/utils/consts"
	jwt_utils "trxd/utils/jwt"
	"trxd/utils/test_utils"
)

func TestRouteNormalizesSignupName(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	test_utils.UpdateConfig(t, "allow-register", "true")
	test_utils.UpdateConfig(t, "email-verification", "false")
	test_utils.UpdateConfig(t, "user-mode", "false")

	session := test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"name":     "\u00a0Cafe\u0301\u00a0",
		"email":    "signup-normalized@test.test",
		"password": "testpass",
	}, http.StatusOK)
	session.CheckResponse(nil)

	session.Get("/info", nil, http.StatusOK)
	body := Json(session.Body())
	if body["name"] != "Café" {
		t.Fatalf("expected normalized signup name %q, got %#v", "Café", body["name"])
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"name":     "Café",
		"email":    "signup-normalized-2@test.test",
		"password": "testpass",
	}, http.StatusConflict)
	session.CheckResponse(errorf(consts.UserAlreadyExists))
}

func TestRouteNormalizesSignupNameInUserModeTeamCreation(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	test_utils.UpdateConfig(t, "allow-register", "true")
	test_utils.UpdateConfig(t, "email-verification", "false")
	test_utils.UpdateConfig(t, "user-mode", "true")
	defer test_utils.UpdateConfig(t, "user-mode", "false")

	session := test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"name":     "\u00a0Duo\u0301 Squad\u00a0",
		"email":    "signup-user-mode@test.test",
		"password": "testpass",
	}, http.StatusOK)
	session.CheckResponse(nil)

	session.Get("/info", nil, http.StatusOK)
	info := Json(session.Body())
	if info["name"] != "Duó Squad" {
		t.Fatalf("expected normalized player name %q, got %#v", "Duó Squad", info["name"])
	}

	teamIDFloat, ok := info["team_id"].(float64)
	if !ok {
		t.Fatalf("expected team_id in signup response, got %#v", info["team_id"])
	}

	session.Get(fmt.Sprintf("/teams/%d", int(teamIDFloat)), nil, http.StatusOK)
	team := Json(session.Body())
	if team["name"] != "Duó Squad" {
		t.Fatalf("expected normalized team name %q, got %#v", "Duó Squad", team["name"])
	}
}

func TestRouteRejectsInvalidSignupNames(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	test_utils.UpdateConfig(t, "allow-register", "true")
	test_utils.UpdateConfig(t, "email-verification", "false")
	test_utils.UpdateConfig(t, "user-mode", "false")

	tests := []struct {
		name  string
		value string
	}{
		{name: "whitespace only", value: "   "},
		{name: "newline", value: "bad\nname"},
		{name: "tab", value: "bad\tname"},
		{name: "zero width space", value: "bad\u200bname"},
		{name: "rtl override", value: "bad\u202ename"},
		{name: "non breaking space", value: "bad\u00a0name"},
	}

	for i, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			session := test_utils.NewApiTestSession(t, app)
			session.Post("/register", JSON{
				"name":     test.value,
				"email":    fmt.Sprintf("signup-invalid-%d@test.test", i),
				"password": "testpass",
			}, http.StatusBadRequest)
			session.CheckResponse(errorf(consts.InvalidUserName))
		})
	}
}

func TestRouteNormalizesAndRejectsNamesInVerificationSignupFlow(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	test_utils.UpdateConfig(t, "allow-register", "true")
	test_utils.UpdateConfig(t, "user-mode", "false")
	test_utils.UpdateConfig(t, "email-verification", "true")
	defer test_utils.UpdateConfig(t, "email-verification", "false")

	tokenStr, err := jwt_utils.GenerateJWT(t.Context(), jwt_utils.Map{"email": "verify-normalized@test.test"})
	if err != nil {
		t.Fatalf("failed to generate JWT: %v", err)
	}

	session := test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"token":    tokenStr,
		"name":     "\u00a0Noe\u0308l\u00a0",
		"password": "testpass",
	}, http.StatusOK)
	session.CheckResponse(nil)

	session.Get("/info", nil, http.StatusOK)
	body := Json(session.Body())
	if body["name"] != "Noël" {
		t.Fatalf("expected normalized verification signup name %q, got %#v", "Noël", body["name"])
	}

	tokenStr, err = jwt_utils.GenerateJWT(t.Context(), jwt_utils.Map{"email": "verify-normalized-2@test.test"})
	if err != nil {
		t.Fatalf("failed to generate JWT: %v", err)
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"token":    tokenStr,
		"name":     "Noël",
		"password": "testpass",
	}, http.StatusConflict)
	session.CheckResponse(errorf(consts.UserAlreadyExists))

	tokenStr, err = jwt_utils.GenerateJWT(t.Context(), jwt_utils.Map{"email": "verify-invalid@test.test"})
	if err != nil {
		t.Fatalf("failed to generate JWT: %v", err)
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{
		"token":    tokenStr,
		"name":     "bad\u200bname",
		"password": "testpass",
	}, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidUserName))
}
