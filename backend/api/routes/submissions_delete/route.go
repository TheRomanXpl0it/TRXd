package submissions_delete

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	SubID *int32 `json:"sub_id" validate:"required,id"`
}

// @Summary [Admin+] Delete a submission
// @Description Requires **Admin** privileges.
// @Description Deletes a submission specified by the submission ID.
// @Tags submissions
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `SubID must be at least 0`"
// @Failure 500 {object} models.Error "Possible errors: `Error deleting submission`"
// @Router /api/submissions [delete]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	err = DeleteSubmission(c.Context(), *data.SubID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingSubmission, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
