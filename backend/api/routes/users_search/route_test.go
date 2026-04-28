package users_search_test

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
	session.Post("/login", JSON{"email": "admin@test.com", "password": "testpass"}, http.StatusOK)

	session.Get("/users/search", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/users/search?name=", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/users/search?name=%20", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/users/search?name="+strings.Repeat("A", consts.MaxUserNameLen+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MaxError, "user_name", consts.MaxUserNameLen)))

	session.Get("/users/search?name=%E2%80%8E", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidName))

	session.Get("/users/search?name=AAA", nil, http.StatusOK)
	session.CheckResponse([]JSON{})

	expected := []JSON{
		{
			"country": "",
			"email":   "a@a.a",
			"name":    "a",
			"role":    "Player",
		},
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
	}
	session.Get("/users/search?name="+"a", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
	}
	session.Get("/users/search?name="+"admin", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	session.Get("/users/search?name="+"admir", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	session.Get("/users/search?name="+"admi", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"email":   "other@test.com",
			"name":    "bob",
			"role":    "Player",
		},
	}
	session.Get("/users/search?name="+"bo", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"email":   "b@b.b",
			"name":    "b",
			"role":    "Player",
		},
		{
			"country": "",
			"email":   "other@test.com",
			"name":    "bob",
			"role":    "Player",
		},
	}
	session.Get("/users/search?name="+"b", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	// SEARCH EMAIL

	test_utils.RegisterUser(t, "admin2", "admin@test2.com", "testpass", sqlc.UserRoleAdmin)
	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "admin@test2.com", "password": "testpass"}, http.StatusOK)

	session.Get("/users/search", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/users/search?email=", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Get("/users/search?email="+strings.Repeat("A", consts.MaxEmailLen+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidEmail))

	session.Get("/users/search?email=AAA", nil, http.StatusOK)
	session.CheckResponse([]JSON{})

	expected = []JSON{
		{
			"country": "",
			"email":   "a@a.a",
			"name":    "a",
			"role":    "Player",
		},
	}
	session.Get("/users/search?email="+"a@a.a", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test.com",
			"name":    "admin",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@email.com",
			"name":    "e",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "other@test.com",
			"name":    "bob",
			"role":    "Player",
		},
	}
	session.Get("/users/search?email="+"admin@test2.com", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

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
			"name":    "e",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
	}
	session.Get("/users/search?email="+"admin", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")

	expected = []JSON{
		{
			"country": "",
			"email":   "a@a.a",
			"name":    "a",
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
			"email":   "admin@email.com",
			"name":    "e",
			"role":    "Admin",
		},
		{
			"country": "",
			"email":   "admin@test2.com",
			"name":    "admin2",
			"role":    "Admin",
		},
	}
	session.Get("/users/search?email="+"a", nil, http.StatusOK)
	session.CheckFilteredResponse(expected, "id")
}
