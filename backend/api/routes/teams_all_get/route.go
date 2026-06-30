package teams_all_get

import (
	"math"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

type Response struct {
	Total int64      `json:"total"`
	Teams []TeamData `json:"teams"`
}

// @Summary [No Auth] Gets all teams
// @Description Requires no privileges.
// @Description Retrieves a list of all teams, can be paginated by using the `offset` and `limit` query parameters.
// @Tags teams
// @Produce json
// @Param offset query int false "Number of items to skip before starting to collect the result set. Default is 0."
// @Param limit query int false "Number of items to return. Default is 0, which means no limit."
// @Success 200 {object} Response "List of teams. Note: the `badges` field is a JSON array of objects, each containing `name` and `description` fields as strings."
// @Failure 400 {object} models.Error "Possible errors: `Invalid parameter`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching teams`"
// @Router /api/teams [get]
func Route(c *fiber.Ctx) error {
	offset := c.QueryInt("offset", 0)
	if offset < 0 || offset > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	limit := c.QueryInt("limit", 0)
	if limit < 0 || limit > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	totalTeams, teamsData, err := GetTeams(c.Context(), int32(offset), int32(limit))
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeams, err)
	}

	return c.Status(fiber.StatusOK).JSON(Response{
		Total: totalTeams,
		Teams: teamsData,
	})
}
