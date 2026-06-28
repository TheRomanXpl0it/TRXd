package teams_register

import (
	"strings"
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

// @Summary [Player+] Register a new team
// @Description Requires **Player** privileges or higher (the user is also required to be in a team).
// @Description Registers a new team with the provided name and password.
// @Description A user can register a new team, while an admin can register a team on behalf of another user.
// @Description If the name is already taken, the request will fail with a `409 Conflict` status code.
// @Tags teams
// @Accept json
// @Produce json
// @Param data body Data true "the team name and password"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 64` | `Invalid name` | `Password must be at least 8` | `Password must not exceed 64`"
// @Failure 409 {object} models.Error "Possible errors: `Already in a team` | `Team already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching team` | `Error beginning transaction` | `Error registering team` | `Error committing transaction`"
// @Router /api/teams/register [post]
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

	tx, err := db.BeginTx(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorBeginningTransaction, err)
	}
	defer db.Rollback(tx)

	team, err = RegisterTeam(c.Context(), tx, data.Name, data.Password, uid)
	if err != nil {
		if strings.HasPrefix(err.Error(), "[race condition]") {
			return utils.Error(c, fiber.StatusConflict, consts.AlreadyInTeam)
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorRegisteringTeam, err)
	}
	if team == nil {
		return utils.Error(c, fiber.StatusConflict, consts.TeamAlreadyExists)
	}

	err = tx.Commit()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCommittingTransaction, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
