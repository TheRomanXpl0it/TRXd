package categories_create

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Name string `json:"name" validate:"required,category_name"`
}

// @Summary [Author+] Creates a new category
// @Description Requires **Author** privileges or higher.
// @Description Creates a new category with the provided name.
// @Tags categories
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 32`"
// @Failure 409 {object} models.Error "Possible errors: `Category already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error creating category` | `Internal server error`"
// @Router /api/categories [post]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	category, err := CreateCategory(c.Context(), data.Name)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingCategory, err)
	}
	if category == nil {
		return utils.Error(c, fiber.StatusConflict, consts.CategoryAlreadyExists)
	}

	return c.SendStatus(fiber.StatusOK)
}
