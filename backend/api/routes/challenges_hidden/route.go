package challenges_hidden

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallIDs []int32 `json:"chall_ids" validate:"required,dive,id"`
}

// @Summary [Author+] Toggles a list of challenges between hidden and visible
// @Description Requires **Author** privileges or higher.
// @Description Toggles the hidden status of the specified challenges.
// @Tags challenges
// @Accept json
// @Produce json
// @Param data body Data true "a list of challenge IDs to toggle hidden status"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallIDs[i] must be at least 0`"
// @Failure 500 {object} models.Error "Possible errors: `Error updating challenge`"
// @Router /api/challenges/hidden [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	err = ToggleChallengesHidden(c.Context(), data.ChallIDs)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingChallenge, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
