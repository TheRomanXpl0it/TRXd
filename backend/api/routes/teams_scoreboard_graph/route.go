package teams_scoreboard_graph

import (
	"net/http"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [No Auth] Gets the scoreboard graph data of the top N teams
// @Description Requires no privileges.
// @Description Retrieves a list of the top N teams with score > 0, sorted by score in descending order and by last player submission time, and their submissions history.
// @Tags teams
// @Produce json
// @Success 200 {object} []Top "The total number of teams and the queried teams from the scoreboard."
// @Failure 500 {object} models.Error "Possible errors: `Error fetching scoreboard graph`"
// @Router /api/scoreboard/graph [get]
func Route(c *fiber.Ctx) error {
	top, err := QueryTeamScoreboardGraph(c.Context())
	if err != nil {
		return utils.Error(c, http.StatusInternalServerError, consts.ErrorFetchingScoreboardGraph, err)
	}

	return c.Status(fiber.StatusOK).JSON(top)
}
