package teams_join

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Name     string `json:"name" validate:"required,team_name"`
	Password string `json:"password" validate:"required,password"`
}

// @Summary [Player+] Create a new submission for a challenge
// @Description Requires **Player** privileges or higher (the user is also required to NOT be in a team).
// @Description Makes a user join a team given the credentials.
// @Tags teams
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 64` | `Password must be at least 8` | `Password must not exceed 64`"
// @Failure 401 {object} models.Error "Possible errors: `Invalid name or password`"
// @Failure 404 {object} models.Error "Possible errors: `Team not found`"
// @Failure 409 {object} models.Error "Possible errors: `Already in a team`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching team` | `Error joining team`"
// @Router /api/teams/join [post]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	data.Name = validator.NormalizeString(data.Name)

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	uid := c.Locals("uid").(int32)

	team, err := db.GetTeamFromUser(c.Context(), uid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}
	if team != nil {
		return utils.Error(c, fiber.StatusConflict, consts.AlreadyInTeam)
	}

	team, err = JoinTeam(c.Context(), data.Name, data.Password, uid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorJoiningTeam, err)
	}
	if team == nil {
		return utils.Error(c, fiber.StatusUnauthorized, consts.InvalidTeamCredentials)
	}

	return c.SendStatus(fiber.StatusOK)
}
