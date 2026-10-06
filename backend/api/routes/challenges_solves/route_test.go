package challenges_solves_test

import (
	"fmt"
	"math"
	"net/http"
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

	session := test_utils.NewApiTestSession(t, app)
	session.Post("/register", JSON{"name": "test", "email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Post("/teams/register", JSON{"name": "test-team", "password": "testpass"}, http.StatusOK)
	session.Get("/challenges", nil, http.StatusOK)
	body := session.Body()
	var id int32
	for _, chall := range List(body) {
		if Json(chall)["name"] == "chall-1" {
			id = Int32(Json(chall)["id"])
			break
		}
	}

	expectedPlayer := []JSON{
		{
			"name": "A",
		},
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get("/challenges/AAA/solves", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidChallengeID))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", -1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "id", 0)))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", 99999), nil, http.StatusNotFound)
	session.CheckResponse(errorf(consts.ChallengeNotFound))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", math.MaxInt32+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "id", 0)))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", id), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedPlayer, "id", "timestamp")

	expectedAuthor := []JSON{
		{
			"name": "A",
		},
	}

	test_utils.RegisterUser(t, "test2", "test3@test.test", "testpass", sqlc.UserRoleAuthor)

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test3@test.test", "password": "testpass"}, http.StatusOK)
	session.Post("/teams/register", JSON{"name": "test-team-2", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", id), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedAuthor, "id", "timestamp")

	expectedAuthorHidden := []JSON{}

	session.Get("/challenges", nil, http.StatusOK)
	body = session.Body()
	var id5 int32
	for _, chall := range List(body) {
		switch Json(chall)["name"] {
		case "chall-5":
			id5 = Int32(Json(chall)["id"])
		}
	}

	session.Get(fmt.Sprintf("/challenges/%d/solves", id5), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedAuthorHidden, "id", "timestamp")

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d/solves", id5), nil, http.StatusNotFound)
	session.CheckResponse(errorf(consts.ChallengeNotFound))
}
