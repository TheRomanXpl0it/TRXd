package users_update

import (
	"trxd/api/routes/teams_update"
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Name    string  `json:"name" validate:"omitempty,user_name"`
	Country *string `json:"country" validate:"omitempty,country"`
}

// @Summary [Player+] Updates a player own name and/or country
// @Description Requires **Player** privileges or higher.
// @Description Updates the name and/or country of the user.
// @Description If the name is already taken, the request will fail with a `409 Conflict` status code.
// @Description In single-user mode, the user's team name and/or country will also be updated to match the user's new name and/or country.
// @Tags users
// @Accept json
// @Produce json
// @Param data body Data true "the new user name and/or country"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 64` | `Invalid name` | `Invalid country code, must be ISO3166-1 alpha-3`"
// @Failure 409 {object} models.Error "Possible errors: `Name already taken`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching user` | `Error beginning transaction` | `Error updating user` | `Error updating team` | `Error committing transaction`"
// @Router /api/users [patch]
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

	uid := c.Locals("uid").(int32)

	tx, err := db.BeginTx(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorBeginningTransaction, err)
	}
	defer db.Rollback(tx)

	err = UpdateUser(c.Context(), tx, uid, data.Name, data.Country)
	if err != nil {
		if err.Error() == "[name already taken]" {
			return utils.Error(c, fiber.StatusConflict, consts.NameAlreadyTaken)
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingUser, err)
	}

	mode, err := db.GetConfig(c.Context(), "user-mode")
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	if mode == "true" {
		tid := c.Locals("tid").(int32)

		err = teams_update.UpdateTeam(c.Context(), tx, tid, data.Name, data.Country)
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingTeam, err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCommittingTransaction, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
