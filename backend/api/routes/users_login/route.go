package users_login

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Email    string `json:"email" validate:"required,user_email"`
	Password string `json:"password" validate:"required,password"`
}

// @Summary [No Auth] Logs in the current user given the credentials.
// @Description Requires no privileges.
// @Description Creates a new user session if the credentials are valid and the client is not already logged in.
// @Tags users
// @Accept json
// @Produce json
// @Param data body Data true "the email and password of the user to log in"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Email must not exceed 256` | `Invalid email format` | `Password must be at least 8` | `Password must not exceed 64`"
// @Failure 401 {object} models.Error "Possible errors: `Invalid email or password`"
// @Failure 403 {object} models.Error "Possible errors: `Already logged in`"
// @Failure 500 {object} models.Error "Possible errors: `Error logging in` | `Error fetching session` | `Error regenerating session` | `Error saving session`"
// @Router /api/login [post]
func Route(c *fiber.Ctx) error {
	uid := c.Locals("uid")
	if uid != nil {
		return utils.Error(c, fiber.StatusForbidden, consts.AlreadyLoggedIn)
	}

	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	user, err := LoginUser(c.Context(), data.Email, data.Password)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorLoggingIn, err)
	}
	if user == nil {
		return utils.Error(c, fiber.StatusUnauthorized, consts.InvalidCredentials)
	}

	sess, err := db.Store.Get(c)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingSession, err)
	}

	err = sess.Regenerate()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorRegeneratingSession, err)
	}

	sess.Set("uid", user.ID)

	err = sess.Save()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorSavingSession, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
