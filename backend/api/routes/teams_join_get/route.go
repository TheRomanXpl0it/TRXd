package teams_join_get

import (
	"trxd/api/routes/teams_join"
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/utils/jwt"

	"github.com/gofiber/fiber/v2"
)

func joinTeam(c *fiber.Ctx, tid int32) error {
	uid := c.Locals("uid").(int32)

	team, err := db.GetTeamFromUser(c.Context(), uid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}
	if team != nil {
		return utils.Error(c, fiber.StatusConflict, consts.AlreadyInTeam)
	}

	team, err = db.GetTeamByID(c.Context(), tid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}
	if team == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.TeamNotFound)
	}

	err = teams_join.AddTeamMember(c.Context(), tid, uid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorJoiningTeam, err)
	}

	return c.SendStatus(fiber.StatusOK)
}

func getTeamToken(c *fiber.Ctx, tid int32) error {
	if tid < 0 {
		return utils.Error(c, fiber.StatusNotFound, consts.TeamNotFound)
	}

	token, err := jwt.GenerateJWT(c.Context(), jwt.Map{"team_id": tid})
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.InternalServerError, err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token": token,
	})
}

// @Summary [Player+] Creates a jwt team token / Joins a team with a JWT
// @Description Requires **Player** privileges or higher.
// @Description Makes a user join a team given the JWT in the `token` parameter, or it generates the token for the user's team.
// @Tags teams
// @Accept json
// @Produce json
// @Param token query string false "the JWT to join a team"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `invalid token`"
// @Failure 404 {object} models.Error "Possible errors: `Team not found`"
// @Failure 409 {object} models.Error "Possible errors: `Already in a team`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching team` | `Error joining team`"
// @Router /api/teams/join [get]
func Route(c *fiber.Ctx) error {
	token := c.Query("token", "")
	if token == "" {
		tid := c.Locals("tid").(int32)
		return getTeamToken(c, tid)
	}

	jwtMap, err := jwt.ParseAndValidateJWT(c.Context(), token)
	if err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidToken)
	}

	tid, ok := jwtMap["team_id"]
	if !ok {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidToken)
	}

	castedTID, ok := tid.(float64)
	if !ok {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidToken)
	}

	return joinTeam(c, int32(castedTID))
}
