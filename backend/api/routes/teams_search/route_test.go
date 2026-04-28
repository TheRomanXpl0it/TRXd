package teams_search_test

import (
	"net/http"
	"strings"
	"testing"
	"trxd/api"
	"trxd/db/sqlc"
	"trxd/utils/consts"
	"trxd/utils/test_utils"
)

type JSON map[string]any

func errorf(val any) JSON {
	return JSON{"error": val}
}

func Json(val any) map[string]any {
	return val.(map[string]any)
}

func List(val any) []any {
	return val.([]any)
}

func Int32(val any) int32 {
	return int32(val.(float64))
}

func TestMain(m *testing.M) {
	test_utils.Main(m)
}

func TestRoute(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	// SEARCH NAME

	test_utils.RegisterUser(t, "admin", "admin@test.com", "testpass", sqlc.UserRoleAdmin)
	test_utils.RegisterUser(t, "bob", "other@test.com", "testpass", sqlc.UserRolePlayer)

	session := test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "other@test.com", "password": "testpass"}, http.StatusOK)
	session.Post("/teams/register", JSON{"name": "bab", "password": "testpass"}, http.StatusOK)

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "admin@test.com", "password": "testpass"}, http.StatusOK)
	session.Post("/teams/register", JSON{"name": "admin", "password": "testpass"}, http.StatusOK)

	session.Get("/teams/search", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/teams/search?name=", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/teams/search?name=%20", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/teams/search?name="+strings.Repeat("A", consts.MaxUserNameLen+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MaxError, "team_name", consts.MaxUserNameLen)))

	session.Get("/teams/search?name=%E2%80%8E", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidName))

	session.Get("/teams/search?name=AAA", nil, http.StatusOK)
	session.CheckResponse([]JSON{})

	expected := []JSON{
		{
			"country": "",
			"name":    "A",
		},
		{
			"country": "",
			"name":    "admin",
		},
		{
			"country": "",
			"name":    "bab",
		},
	}
	session.Get("/teams/search?name="+"A", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"name":    "admin",
		},
	}
	session.Get("/teams/search?name="+"admin", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	session.Get("/teams/search?name="+"admir", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	session.Get("/teams/search?name="+"admi", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	session.Get("/teams/search?name="+"bo", nil, http.StatusOK)
	session.CheckFilteredResponse([]JSON{}, "id")

	expected = []JSON{
		{
			"country": "",
			"name":    "bab",
		},
	}
	session.Get("/teams/search?name="+"ba", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	// SEARCH EMAIL

	test_utils.RegisterUser(t, "admin2", "admin@test2.com", "testpass", sqlc.UserRoleAdmin)
	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "admin@test2.com", "password": "testpass"}, http.StatusOK)

	session.Get("/teams/search", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/teams/search?email=", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/teams/search?email="+strings.Repeat("A", consts.MaxEmailLen+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidEmail))

	session.Get("/teams/search?email=AAA", nil, http.StatusOK)
	session.CheckResponse([]JSON{})

	expected = []JSON{
		{
			"country": "",
			"name":    "A",
		},
	}
	session.Get("/teams/search?email="+"a@a.a", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"name":    "admin",
		},
		{
			"country": "",
			"name":    "A",
		},
		{
			"country": "",
			"name":    "bab",
		},
	}
	session.Get("/teams/search?email="+"admin@test2.com", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"name":    "admin2",
		},
		{
			"country": "",
			"name":    "admin",
		},
		{
			"country": "",
			"name":    "A",
		},
		{
			"country": "",
			"name":    "bab",
		},
	}
	session.Post("/teams/register", JSON{"name": "admin2", "password": "testpass"}, http.StatusOK)
	session.CheckResponse(nil)
	session.Get("/teams/search?email="+"admin@test2.com", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"name":    "admin",
		},
		{
			"country": "",
			"name":    "A",
		},
		{
			"country": "",
			"name":    "admin2",
		},
	}
	session.Get("/teams/search?email="+"min", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	// USER MODE

	test_utils.UpdateConfig(t, "user-mode", "true")

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{"name": "user1", "email": "user1@example.com", "password": "testpass"}, http.StatusOK)
	session.CheckResponse(nil)

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "admin@test2.com", "password": "testpass"}, http.StatusOK)

	expected = []JSON{
		{
			"country": "",
			"email":   "user1@example.com",
			"name":    "user1",
			"role":    "Player",
		},
	}
	session.Get("/teams/search?name="+"user1", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")

	session.Get("/teams/search?email="+"user1@example.com", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")

	expected = []JSON{
		{
			"country": "",
			"email":   "a@a.a",
			"name":    "A",
			"role":    "Player",
		},
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "other@test.com",
			"name":    "bab",
			"role":    "Player",
		},
	}
	session.Get("/teams/search?name="+"A", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")

	expected = []JSON{
		{
			"country": "",
			"email":   "a@a.a",
			"name":    "A",
			"role":    "Player",
		},
	}
	session.Get("/teams/search?email="+"a@a.a", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")

	expected = []JSON{
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
	}
	session.Get("/teams/search?name="+"admin", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")

	expected = []JSON{
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@email.com",
			"name":    "A",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
	}
	session.Get("/teams/search?email="+"admin", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id", "user_id")
}
