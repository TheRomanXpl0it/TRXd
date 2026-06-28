package users_password

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/utils/crypto_utils"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	UserID      *int32 `json:"user_id" validate:"omitnil,id"`
	NewPassword string `json:"new_password" validate:"omitempty,password"`
}

type Response struct {
	NewPassword string `json:"new_password,omitempty"`
}

// @Summary [Player+] Reset a user's password
// @Description Requires **Player** privileges or higher (the user is also required to be in a user).
// @Description Resets a user's password given the credentials.
// @Description A user can reset their own user's password, while an admin can reset any user's password by providing the user ID in the request body.
// @Description If the new password is not provided, a random password will be generated and returned in the response.
// @Tags users
// @Accept json
// @Produce json
// @Param data body Data false "the user ID to reset the password for (only required if the user is an admin and wants to reset the password for a specific user) and the new password (if not provided, a random password will be generated)"
// @Success 200 {object} Response "the new password if it was generated, otherwise an empty response"
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `UserID must be at least 0` | `Invalid user ID, must be non negative` | `NewPassword must be at least 8` | `NewPassword must not exceed 64`"
// @Failure 500 {object} models.Error "Possible errors: `Error generating random password` | `Error resetting user password`"
// @Router /api/users/password [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	var uid int32
	role := c.Locals("role").(sqlc.UserRole)
	if role == sqlc.UserRoleAdmin && data.UserID != nil {
		uid = *data.UserID
	} else {
		uid = c.Locals("uid").(int32)
	}

	var newPassword string
	if data.NewPassword != "" {
		newPassword = data.NewPassword
	} else {
		newPassword, err = crypto_utils.GeneratePassword()
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorGeneratingPassword, err)
		}
	}

	err = ResetUserPassword(c.Context(), uid, newPassword)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorResettingUserPassword, err)
	}

	if data.NewPassword != "" {
		return c.SendStatus(fiber.StatusOK)
	}
	return c.Status(fiber.StatusOK).JSON(Response{
		NewPassword: newPassword,
	})
}
