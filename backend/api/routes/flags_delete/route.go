package flags_delete

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
	Flag    string `json:"flag" validate:"required,flag"`
}

// @Summary [Author+] Deletes a flag for a challenge
// @Description Requires **Author** privileges or higher.
// @Description Deletes a flag of a challenge.
// @Tags flags
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Flag must not exceed 256`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error deleting flag`"
// @Router /api/flags [delete]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	challenge, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	err = DeleteFlag(c.Context(), *data.ChallID, data.Flag)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingFlag, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
