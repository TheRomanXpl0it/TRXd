package challenges_update_test

import (
	"fmt"
	"math"
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

var testData = []struct {
	testBody         JSON
	expectedStatus   int
	expectedResponse JSON
}{
	{
		testBody:         nil,
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.MissingRequiredFields),
	},
	{
		testBody:         JSON{"chall_id": ""},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.NoDataToUpdate),
	},
	{
		testBody:         JSON{"chall_id": "", "name": strings.Repeat("a", consts.MaxChallNameLen+1)},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Name", consts.MaxChallNameLen)),
	},
	{
		testBody:         JSON{"chall_id": "", "category": strings.Repeat("a", consts.MaxCategoryLen+1)},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Category", consts.MaxCategoryLen)),
	},
	{
		testBody:         JSON{"chall_id": "", "description": strings.Repeat("a", consts.MaxChallDescLen+1)},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Description", consts.MaxChallDescLen)),
	},
	{
		testBody:         JSON{"chall_id": "", "authors": ""},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidJSON),
	},
	{
		testBody:         JSON{"chall_id": "", "authors": []string{strings.Repeat("a", consts.MaxAuthorNameLen+1)}},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Authors[0]", consts.MaxAuthorNameLen)),
	},
	{
		testBody:         JSON{"chall_id": "", "tags": []string{strings.Repeat("a", consts.MaxTagNameLen+1)}},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Tags[0]", consts.MaxTagNameLen)),
	},
	{
		testBody:         JSON{"chall_id": "", "instance_type": "aaa"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.OneOfError, "InstanceType", consts.InstanceTypesStr)),
	},
	{
		testBody:         JSON{"chall_id": "", "max_points": -1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MinError, "MaxPoints", 0)),
	},
	{
		testBody:         JSON{"chall_id": "", "score_type": "aaa"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.OneOfError, "ScoreType", consts.ScoreTypesStr)),
	},
	{
		testBody:         JSON{"chall_id": "", "port": consts.MinPort - 1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MinError, "Port", consts.MinPort)),
	},
	{
		testBody:         JSON{"chall_id": "", "port": consts.MaxPort + 1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MaxError, "Port", consts.MaxPort)),
	},
	{
		testBody:         JSON{"chall_id": "", "conn_type": "aaa"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.OneOfError, "ConnType", consts.ConnTypesStr)),
	},
	{
		testBody:         JSON{"chall_id": "", "lifetime": -1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MinError, "Lifetime", 0)),
	},
	{
		testBody:         JSON{"chall_id": "", "lifetime": math.MaxInt32 + 1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidJSON),
	},
	{
		testBody:         JSON{"chall_id": "", "envs": "<invalid-json>"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidEnvs),
	},
	{
		testBody:         JSON{"chall_id": "", "max_memory": -1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MinError, "MaxMemory", 0)),
	},
	{
		testBody:         JSON{"chall_id": "", "max_memory": math.MaxInt32 + 1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidJSON),
	},
	{
		testBody:         JSON{"chall_id": "", "max_cpu": "<invalid-float>"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidMaxCpu),
	},
	{
		testBody:         JSON{"chall_id": "", "max_cpu": "0.0"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidMaxCpu),
	},
	{
		testBody:         JSON{"chall_id": "", "max_cpu": "-1.0"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidMaxCpu),
	},
	{
		testBody:         JSON{"chall_id": "", "max_cpu": fmt.Sprintf("%d.0", math.MaxInt32+1)},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidMaxCpu),
	},
	{
		testBody:         JSON{"chall_id": -1, "name": "test"},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(test_utils.Format(consts.MinError, "ChallID", 0)),
	},
	{
		testBody:         JSON{"chall_id": 9999, "name": "test"},
		expectedStatus:   http.StatusNotFound,
		expectedResponse: errorf(consts.ChallengeNotFound),
	},
	{
		testBody:         JSON{"chall_id": math.MaxInt32 + 1},
		expectedStatus:   http.StatusBadRequest,
		expectedResponse: errorf(consts.InvalidJSON),
	},
	{
		testBody:         JSON{"chall_id": "", "name": "chall-2"},
		expectedStatus:   http.StatusConflict,
		expectedResponse: errorf(consts.ChallengeNameAlreadyExists),
	},
	{
		testBody:         JSON{"chall_id": "", "category": "<invalid-category>"},
		expectedStatus:   http.StatusNotFound,
		expectedResponse: errorf(consts.CategoryNotFound),
	},
	{
		testBody: JSON{
			"chall_id":      "",
			"name":          "Test",
			"category":      "cat-2",
			"description":   "new test desc",
			"authors":       []string{"author1", "author2"},
			"tags":          []string{"tag1", "tag2", "tag3"},
			"instance_type": "Container",
			"hidden":        false,
			"max_points":    1000,
			"score_type":    "Dynamic",
			"host":          "http://ctf.theromanxpl0.it",
			"port":          1234,
			"conn_type":     "TCP",
			"hash_domain":   true,

			"image":      "ubuntu:latest",
			"compose":    "",
			"lifetime":   60,
			"renewable":  true,
			"envs":       `{"key": "value"}`,
			"max_memory": 512,
			"max_cpu":    "1.0",
		},
		expectedStatus: http.StatusOK,
	},
}

func TestRoute(t *testing.T) {
	app := api.SetupApp(t.Context())
	defer api.Shutdown(app)

	test_utils.RegisterUser(t, "author", "author@test.test", "authorpass", sqlc.UserRoleAuthor)

	var challID int32
	session := test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "author@test.test", "password": "authorpass"}, http.StatusOK)
	session.Post("/categories", JSON{"name": "cat"}, -1)

	chall := test_utils.TryCreateChallenge(t, "chall", "cat", "test-desc", sqlc.InstanceTypeStatic, 1, sqlc.ScoreTypeStatic)
	if chall != nil {
		challID = chall.ID
	}

	session.Patch("/challenges", nil, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidJSON))

	for i, test := range testData {
		session := test_utils.NewApiTestSession(t, app)
		session.Post("/login", JSON{"email": "author@test.test", "password": "authorpass"}, http.StatusOK)

		if test.testBody != nil {
			if content, ok := test.testBody["chall_id"]; ok && content == "" {
				test.testBody["chall_id"] = challID
			}
		}

		session.Patch("/challenges", test.testBody, test.expectedStatus)
		session.CheckResponse(test.expectedResponse)

		if i == len(testData)-1 {
			session.Get("/challenges", nil, http.StatusOK)
			body := session.Body()
			expected := JSON{
				"attachments": []string{},
				"authors":     test.testBody["authors"],
				"category":    test.testBody["category"],
				"conn_type":   test.testBody["conn_type"],
				"description": test.testBody["description"],
				"first_blood": false,
				"hash_domain": test.testBody["hash_domain"],
				"hidden":      test.testBody["hidden"],
				"host":        test.testBody["host"],
				"id":          challID,
				"instance":    test.testBody["instance_type"] != "Static",
				"max_points":  test.testBody["max_points"],
				"name":        test.testBody["name"],
				"points":      test.testBody["max_points"],
				"port":        1234,
				"renewable":   test.testBody["renewable"],
				"score_type":  test.testBody["score_type"],
				"solved":      false,
				"solves":      0,
				"tags":        test.testBody["tags"],
				"timeout":     0,
			}
			var challengeBody any
			for _, v := range List(body) {
				if Int32(Json(v)["id"]) == challID {
					challengeBody = v
					break
				}
			}
			test_utils.Compare(t, expected, challengeBody)

			session.Get(fmt.Sprintf("/challenges/%d", challID), nil, http.StatusOK)
			body = session.Body()
			expected = JSON{
				"attachments":   []string{},
				"authors":       test.testBody["authors"],
				"category":      test.testBody["category"],
				"compose":       test.testBody["compose"],
				"conn_type":     test.testBody["conn_type"],
				"description":   test.testBody["description"],
				"envs":          test.testBody["envs"],
				"flags":         []string{},
				"hash_domain":   test.testBody["hash_domain"],
				"hidden":        test.testBody["hidden"],
				"host":          test.testBody["host"],
				"image":         test.testBody["image"],
				"instance_type": test.testBody["instance_type"],
				"lifetime":      test.testBody["lifetime"],
				"max_cpu":       test.testBody["max_cpu"],
				"max_memory":    test.testBody["max_memory"],
				"max_points":    test.testBody["max_points"],
				"name":          test.testBody["name"],
				"port":          test.testBody["port"],
				"renewable":     test.testBody["renewable"],
				"score_type":    test.testBody["score_type"],
				"solves_list":   []JSON{},
				"tags":          test.testBody["tags"],
			}
			test_utils.Compare(t, expected, body)
		}
	}

	testBody := JSON{
		"chall_id":    challID,
		"name":        "Test",
		"category":    "cat-2",
		"description": "",
		"authors":     []string{},
		"tags":        []string{},
		"hidden":      false,
		"max_points":  0,
		"host":        "",
		"port":        0,
		"hash_domain": false,

		"image":      "",
		"compose":    "",
		"lifetime":   0,
		"renewable":  false,
		"envs":       "",
		"max_memory": 0,
		"max_cpu":    "",
	}

	session = test_utils.NewApiTestSession(t, app)
	session.Post("/login", JSON{"email": "author@test.test", "password": "authorpass"}, http.StatusOK)
	session.Patch("/challenges", testBody, http.StatusOK)
	session.CheckResponse(nil)

	session.Get("/challenges", nil, http.StatusOK)
	body := session.Body()
	expected := JSON{
		"attachments": []string{},
		"authors":     testBody["authors"],
		"category":    testBody["category"],
		"conn_type":   "TCP",
		"description": testBody["description"],
		"first_blood": false,
		"hash_domain": testBody["hash_domain"],
		"hidden":      testBody["hidden"],
		"host":        testBody["host"],
		"id":          challID,
		"instance":    testBody["instance_type"] != "Static",
		"max_points":  testBody["max_points"],
		"name":        testBody["name"],
		"points":      testBody["max_points"],
		"port":        testBody["port"],
		"renewable":   testBody["renewable"],
		"score_type":  "Dynamic",
		"solved":      false,
		"solves":      0,
		"tags":        testBody["tags"],
		"timeout":     0,
	}
	var challengeBody any
	for _, v := range List(body) {
		if Int32(Json(v)["id"]) == challID {
			challengeBody = v
			break
		}
	}
	test_utils.Compare(t, expected, challengeBody)

	session.Get(fmt.Sprintf("/challenges/%d", challID), nil, http.StatusOK)
	body = session.Body()
	expected = JSON{
		"attachments":   []string{},
		"authors":       testBody["authors"],
		"category":      testBody["category"],
		"compose":       testBody["compose"],
		"conn_type":     "TCP",
		"description":   testBody["description"],
		"envs":          testBody["envs"],
		"flags":         []string{},
		"hash_domain":   testBody["hash_domain"],
		"hidden":        testBody["hidden"],
		"host":          testBody["host"],
		"image":         testBody["image"],
		"instance_type": "Container",
		"lifetime":      consts.DefaultConfigs["instance-lifetime"].Value.(int),
		"max_cpu":       fmt.Sprint(consts.DefaultConfigs["instance-max-cpu"].Value),
		"max_memory":    consts.DefaultConfigs["instance-max-memory"].Value.(int),
		"max_points":    testBody["max_points"],
		"name":          testBody["name"],
		"port":          testBody["port"],
		"renewable":     testBody["renewable"],
		"score_type":    "Dynamic",
		"solves_list":   []JSON{},
		"tags":          testBody["tags"],
	}
	test_utils.Compare(t, expected, body)
}
