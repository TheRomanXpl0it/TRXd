package challenges_delete

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
}

// @Summary [Author+] Deletes a challenge
// @Description Requires **Author** privileges or higher.
// @Description Deletes a challenge with the provided ID.
// @Tags challenges
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0`"
// @Failure 500 {object} models.Error "Possible errors: `Error deleting challenge`"
// @Router /api/challenges [delete]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	err = DeleteChallenge(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingChallenge, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
