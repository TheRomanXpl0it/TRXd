package users_get

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

// @Summary [No Auth] Gets all user details by ID
// @Description Requires no privileges.
// @Description Retrieves all user details by ID.
// @Tags users
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} UserData "List of users"
// @Failure 400 {object} models.Error "Possible errors: `Invalid user ID, must be non negative` | `id must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `User not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching user`"
// @Router /api/users/:id [get]
func Route(c *fiber.Ctx) error {
	uid := c.Locals("uid")
	role := c.Locals("role")

	userIDInt, err := c.ParamsInt("id")
	if err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidUserID)
	}
	userID := int32(userIDInt)
	valid, err := validator.Var(c, userID, "id")
	if err != nil || !valid {
		return err
	}

	allData := false
	if uid != nil {
		allData = uid.(int32) == int32(userID)
	}
	if !allData && role != nil {
		allData = utils.In(role.(sqlc.UserRole), []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	}
	userData, err := GetUser(c.Context(), int32(userID), allData)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUser, err)
	}
	if userData == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.UserNotFound)
	}

	return c.Status(fiber.StatusOK).JSON(userData)
}
