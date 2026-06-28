package users_role

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	UserID  *int32        `json:"user_id" validate:"required,id"`
	NewRole sqlc.UserRole `json:"new_role" validate:"required,user_role"`
}

// @Summary [Admin] Change a user's role
// @Description Requires **Admin** privileges.
// @Description Changes a user's role given the user ID and new role (only **Player** and **Author**).
// @Tags users
// @Accept json
// @Produce json
// @Param data body Data false "the user ID to change the role for and the new role"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `UserID must be at least 0` | `NewRole must be one of: Player Author Admin` | `Invalid role`"
// @Failure 500 {object} models.Error "Possible errors: `Error changing user role`"
// @Router /api/users/role [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	if data.NewRole == sqlc.UserRoleAdmin {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidRole)
	}

	err = ChangeUserRole(c.Context(), *data.UserID, data.NewRole)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorChangingUserRole, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
