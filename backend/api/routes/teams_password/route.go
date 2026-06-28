package teams_password

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/utils/crypto_utils"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	TeamID      *int32 `json:"team_id" validate:"omitnil,id"`
	NewPassword string `json:"new_password" validate:"omitempty,password"`
}

type Response struct {
	NewPassword string `json:"new_password"`
}

// @Summary [Player+] Reset a team's password
// @Description Requires **Player** privileges or higher (the user is also required to be in a team).
// @Description Resets a team's password given the credentials.
// @Description A user can reset their own team's password, while an admin can reset any team's password by providing the team ID in the request body.
// @Description If the new password is not provided, a random password will be generated and returned in the response.
// @Tags teams
// @Accept json
// @Produce json
// @Param data body Data false "the team ID to reset the password for (only required if the user is an admin and wants to reset the password for a specific team) and the new password (if not provided, a random password will be generated)"
// @Success 200 {object} Response "the new password if it was generated, otherwise an empty response"
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `TeamID must be at least 0` | `Invalid team ID, must be non negative` | `NewPassword must be at least 8` | `NewPassword must not exceed 64`"
// @Failure 500 {object} models.Error "Possible errors: `Error generating random password` | `Error resetting team password`"
// @Router /api/teams/password [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	var tid int32
	role := c.Locals("role").(sqlc.UserRole)
	if role == sqlc.UserRoleAdmin && data.TeamID != nil {
		tid = *data.TeamID
	} else {
		tid = c.Locals("tid").(int32)
	}

	if tid < 0 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidTeamID)
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

	err = ResetTeamPassword(c.Context(), tid, newPassword)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorResettingTeamPassword, err)
	}

	if data.NewPassword != "" {
		return c.SendStatus(fiber.StatusOK)
	}
	return c.Status(fiber.StatusOK).JSON(Response{
		NewPassword: newPassword,
	})
}
