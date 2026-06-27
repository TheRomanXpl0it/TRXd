package categories_get

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Player+] Gets all categories
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Retrieves a list of all categories (with role **Player** only visible one are returned).
// @Tags categories
// @Produce json
// @Success 200 {object} []string "List of category names"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching categories`"
// @Router /api/categories [get]
func Route(c *fiber.Ctx) error {
	role := c.Locals("role").(sqlc.UserRole)

	all := utils.In(role, []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	categories, err := GetCategories(c.Context(), all)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingCategories, err)
	}

	return c.Status(fiber.StatusOK).JSON(categories)
}
