package teams_update

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
)

type Data struct {
	Name    string  `json:"name" validate:"omitempty,team_name"`
	Country *string `json:"country" validate:"omitempty,country"`
}

// @Summary [Player+] Updates a player own team's name and/or country
// @Description Requires **Player** privileges or higher (the user is also required to be in a team).
// @Description Updates the name and/or country of the team the user is currently in.
// @Description If the name is already taken, the request will fail with a `409 Conflict` status code.
// @Tags teams
// @Accept json
// @Produce json
// @Param data body Data true "the new team name and/or country"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 64` | `Invalid name` | `Invalid country code, must be ISO3166-1 alpha-3`"
// @Failure 409 {object} models.Error "Possible errors: `Name already taken`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching team` | `Error beginning transaction` | `Error updating team` | `Error committing transaction`"
// @Router /api/teams [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	data.Name = validator.NormalizeString(data.Name)

	if data.Name == "" && data.Country == nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.MissingRequiredFields)
	}
	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	tx, err := db.BeginTx(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorBeginningTransaction, err)
	}
	defer db.Rollback(tx)

	tid := c.Locals("tid").(int32)
	err = UpdateTeam(c.Context(), tx, tid, data.Name, data.Country)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == consts.PGUniqueViolation {
				return utils.Error(c, fiber.StatusConflict, consts.NameAlreadyTaken)
			}
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingTeam, err)
	}

	err = tx.Commit()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCommittingTransaction, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
