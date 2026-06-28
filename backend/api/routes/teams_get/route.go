package teams_get

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

// @Summary [No Auth] Gets all team details by ID
// @Description Requires no privileges.
// @Description Retrieves all team details by ID.
// @Tags teams
// @Produce json
// @Param id path int true "Team ID"
// @Success 200 {object} TeamData "List of teams"
// @Failure 400 {object} models.Error "Possible errors: `Invalid team ID, must be non negative` | `id must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `Team not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching team`"
// @Router /api/teams/:id [get]
func Route(c *fiber.Ctx) error {
	tid := c.Locals("tid")
	role := c.Locals("role")

	teamIDInt, err := c.ParamsInt("id")
	if err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidTeamID)
	}
	teamID := int32(teamIDInt)
	valid, err := validator.Var(c, teamID, "id")
	if err != nil || !valid {
		return err
	}

	allData := false
	if tid != nil {
		allData = tid.(int32) == int32(teamID)
	}
	if !allData && role != nil {
		allData = utils.In(role.(sqlc.UserRole), []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	}
	teamData, err := GetTeam(c.Context(), int32(teamID), allData)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}
	if teamData == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.TeamNotFound)
	}

	return c.Status(fiber.StatusOK).JSON(teamData)
}
