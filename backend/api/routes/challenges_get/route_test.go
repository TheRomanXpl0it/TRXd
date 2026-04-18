package challenges_get_test

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

	expectedPlayer := JSON{
		"solves_list": []JSON{
			{
				"name": "A",
			},
		},
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get("/challenges/AAA", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidChallengeID))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d", -1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "id", 0)))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d", 99999), nil, http.StatusNotFound)
	session.CheckResponse(errorf(consts.ChallengeNotFound))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d", math.MaxInt32+1), nil, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "id", 0)))

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test2@test.test", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d", id), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedPlayer, "id", "timestamp")

	expectedAuthor := JSON{
		"attachments": []string{},
		"authors": []string{
			"author1",
			"author2",
		},
		"category":    "cat-1",
		"conn_type":   "TCP",
		"description": "TEST chall-1 DESC",
		"flags": []JSON{
			{
				"flag":  "flag{test-1}",
				"regex": false,
			},
			{
				"flag":  "flag\\{test-[a-z]{2}\\}",
				"regex": true,
			},
		},
		"hidden":     false,
		"host":       "ctf.theromanxpl0.it",
		"max_points": 500,
		"name":       "chall-1",
		"port":       1234,
		"score_type": "Dynamic",
		"solves_list": []JSON{
			{
				"name": "A",
			},
		},
		"tags": []string{
			"tag-1",
			"test-tag",
		},
		"type": "Normal",
	}

	test_utils.RegisterUser(t, "test2", "test3@test.test", "testpass", sqlc.UserRoleAuthor)

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "test3@test.test", "password": "testpass"}, http.StatusOK)
	session.Post("/teams/register", JSON{"name": "test-team-2", "password": "testpass"}, http.StatusOK)
	session.Get(fmt.Sprintf("/challenges/%d", id), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedAuthor, "id", "timestamp")

	expectedAuthorHidden := JSON{
		"attachments": []string{},
		"authors": []string{
			"author3",
		},
		"category":    "cat-2",
		"conn_type":   "NONE",
		"description": "TEST chall-5 DESC",
		"flags": []JSON{
			{
				"flag":  "flag{test-5}",
				"regex": false,
			},
		},
		"hidden":      true,
		"host":        "",
		"max_points":  500,
		"name":        "chall-5",
		"port":        0,
		"score_type":  "Static",
		"solves_list": []JSON{},
		"tags": []string{
			"tag-5",
		},
		"type": "Normal",
	}

	session.Get("/challenges", nil, http.StatusOK)
	body = session.Body()
	var id3, id5 int32
	for _, chall := range List(body) {
		switch Json(chall)["name"] {
		case "chall-3":
			id3 = Int32(Json(chall)["id"])
		case "chall-5":
			id5 = Int32(Json(chall)["id"])
		}
	}

	session.Get(fmt.Sprintf("/challenges/%d", id5), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedAuthorHidden, "id", "timestamp")

	expectedDocker := JSON{
		"attachments": []string{},
		"authors": []string{
			"author1",
		},
		"category":    "cat-1",
		"conn_type":   "HTTP",
		"description": "TEST chall-3 DESC",
		"docker_config": JSON{
			"compose":     "",
			"envs":        "",
			"hash_domain": true,
			"image":       "echo-server:latest",
			"lifetime":    0,
			"max_cpu":     "",
			"max_memory":  0,
			"renewable":   true,
		},
		"flags": []JSON{
			{
				"flag":  "flag{test-3}",
				"regex": false,
			},
		},
		"hidden":     false,
		"host":       "chall-3.test.com",
		"max_points": 500,
		"name":       "chall-3",
		"port":       1337,
		"score_type": "Dynamic",
		"solves_list": []JSON{
			{
				"name": "A",
			},
		},
		"tags": []string{
			"tag-3",
		},
		"type": "Container",
	}

	session.Get(fmt.Sprintf("/challenges/%d", id3), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedDocker, "id", "timestamp")

	session.Post("/instances", JSON{"chall_id": id3}, http.StatusOK)
	body = session.Body()
	if body == nil {
		t.Fatal("Expected instance, got nil")
	}

	expectedInstance := JSON{
		"attachments": []string{},
		"authors": []string{
			"author1",
		},
		"category":    "cat-1",
		"conn_type":   "HTTP",
		"description": "TEST chall-3 DESC",
		"docker_config": JSON{
			"compose":     "",
			"envs":        "",
			"hash_domain": true,
			"image":       "echo-server:latest",
			"lifetime":    0,
			"max_cpu":     "",
			"max_memory":  0,
			"renewable":   true,
		},
		"flags": []JSON{
			{
				"flag":  "flag{test-3}",
				"regex": false,
			},
		},
		"hidden":     false,
		"host":       "chall-3.test.com",
		"max_points": 500,
		"name":       "chall-3",
		"port":       1337,
		"score_type": "Dynamic",
		"solves_list": []JSON{
			{
				"name": "A",
			},
		},
		"tags": []string{
			"tag-3",
		},
		"type": "Container",
	}

	session.Get(fmt.Sprintf("/challenges/%d", id3), nil, http.StatusOK)
	session.CheckFilteredResponse(expectedInstance, "id", "timestamp", "timeout")
}
