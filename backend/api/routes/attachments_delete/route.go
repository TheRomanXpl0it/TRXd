package attachments_delete

import (
	"fmt"
	"os"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32    `json:"chall_id" validate:"required,id"`
	Names   *[]string `json:"names" validate:"required,attachments"`
}

// @Summary [Author+] Deletes attachments for a challenge
// @Description Requires **Author** privileges or higher.
// @Description Deletes attachments for an existing challenge with the provided names.
// @Tags attachments
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Names[i] must not exceed 128`"
// @Failure 404 {object} models.Error "Possible errors: `Attachment not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching attachment` | `Error deleting attachment`"
// @Router /api/attachments [delete]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	challID := *data.ChallID

	hashes := make([]string, 0, len(*data.Names))
	for _, name := range *data.Names {
		hash, err := GetAttachmentHash(c.Context(), challID, name)
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingAttachment, err)
		}
		if hash == "" {
			return utils.Error(c, fiber.StatusNotFound, consts.AttachmentNotFound)
		}

		hashes = append(hashes, hash)
	}
	for i, name := range *data.Names {
		err = DeleteAttachment(c.Context(), challID, name)
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingAttachment, err)
		}

		err = os.RemoveAll(fmt.Sprintf("attachments/%d/%s", challID, hashes[i]))
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingAttachment, err)
		}
	}

	return c.SendStatus(fiber.StatusOK)
}
