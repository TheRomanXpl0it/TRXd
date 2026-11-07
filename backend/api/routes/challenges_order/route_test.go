package challenges_order_test

import (
	"math"
	"net/http"
	"testing"
	"trxd/api"
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
	session.Post("/login", JSON{"email": "admin@email.com", "password": "testpass"}, http.StatusOK)
	session.Get("/challenges", nil, http.StatusOK)
	body := session.Body()

	challIDs := make(map[string]int32)
	order := make(map[string]int32)
	for _, chall := range List(body) {
		challIDs[Json(chall)["name"].(string)] = Int32(Json(chall)["id"])
		order[Json(chall)["name"].(string)] = Int32(Json(chall)["sort_order"])
	}

	session.Patch("/challenges/order", JSON{}, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.MissingRequiredFields))

	session.Patch("/challenges/order", JSON{"chall_id": -1}, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "ChallID", 0)))

	session.Patch("/challenges/order", JSON{"chall_id": math.MaxInt32 + 1}, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidJSON))

	session.Patch("/challenges/order", JSON{"chall_id": 99999, "new_order": -1}, http.StatusBadRequest)
	session.CheckResponse(errorf(test_utils.Format(consts.MinError, "NewOrder", 0)))

	session.Patch("/challenges/order", JSON{"chall_id": 99999, "new_order": math.MaxInt32 + 1}, http.StatusBadRequest)
	session.CheckResponse(errorf(consts.InvalidJSON))

	session.Patch("/challenges/order", JSON{"chall_id": 99999, "new_order": 1}, http.StatusNotFound)
	session.CheckResponse(errorf(consts.ChallengeNotFound))

	// put chall-3 down to the order of chall-4 and then back up to the order of chall-3
	for range 2 {
		session.Patch("/challenges/order", JSON{"chall_id": challIDs["chall-3"], "new_order": order["chall-4"]}, http.StatusOK)
		session.CheckResponse(nil)

		order["chall-3"], order["chall-4"] = order["chall-4"], order["chall-3"]

		session.Get("/challenges", nil, http.StatusOK)
		body = session.Body()
		for _, chall := range List(body) {
			sortOrder := order[Json(chall)["name"].(string)]
			if Int32(Json(chall)["sort_order"]) != sortOrder {
				t.Errorf(
					"challenge %s should be in a different position: %d != %d",
					Json(chall)["name"].(string),
					Int32(Json(chall)["sort_order"]),
					sortOrder,
				)
			}
		}
	}
}
