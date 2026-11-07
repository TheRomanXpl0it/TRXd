package challenges_order

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID  *int32 `json:"chall_id" validate:"required,id"`
	NewOrder *int32 `json:"new_order" validate:"required,min=0"`
}

// @Summary [Author+] Changes the order of a challenge.
// @Description Requires **Author** privileges or higher.
// @Description Changes the order of the specified challenge.
// @Tags challenges
// @Accept json
// @Produce json
// @Param data body Data true "the challenge ID and the new order"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `NewOrder must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error updating challenge` | `Internal server error`"
// @Router /api/challenges/order [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	chall, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.InternalServerError, err)
	}
	if chall == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	err = UpdateChallengeOrder(c.Context(), *data.ChallID, *data.NewOrder)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingChallenge, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
