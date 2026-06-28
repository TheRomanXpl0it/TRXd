package users_register

import (
	"trxd/api/routes/teams_register"
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Name     string `json:"name" validate:"required,user_name"`
	Email    string `json:"email" validate:"required,user_email"`
	Password string `json:"password" validate:"required,password"`
	JWT      string `json:"token" validate:"omitempty,jwt"`
}

// @Summary [No Auth] Registers a new user.
// @Description Requires no privileges.
// @Description Creates a new user account if the provided information is valid.
// @Description If the `allow-register` configuration is set to false, registration will be disabled.
// @Description If the `user-mode` configuration is set to true, a new team will also be created for the user.
// @Description If the `mail-enabled` configuration is set to true, a valid JWT token must be provided for registration, it will be sent via the specified Email, then the endpoint will accept the JWT with also the Name and Password.
// @Tags users
// @Accept json
// @Produce json
// @Param data body Data true "the name, email and password of the user to register; or the email and then the JWT, name and password"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Email must not exceed 256` | `Invalid email format` | `Name must not exceed 64` | `Invalid name` | `Password must be at least 8` | `Password must not exceed 64` | `invalid JWT`"
// @Failure 401 {object} models.Error "Possible errors: `invalid email` | `invalid token` | `token is unverifiable: error while executing keyfunc: invalid signing method` | `token is unverifiable: error while executing keyfunc: invalid signing algorithm`"
// @Failure 403 {object} models.Error "Possible errors: `Registrations are disabled` | `Already registered`"
// @Failure 409 {object} models.Error "Possible errors: `User already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching configuration` | `Error beginning transaction` | `Invalid email expiration` | `Error signing verification token` | `Invalid domain` | `Error sending verification email` | `Error registering user` | `Error registering team` | `Team already exists` | `Error committing transaction` | `Error fetching session` | `Error regenerating session` | `Error saving session`"
// @Router /api/register [post]
func CanRegister(c *fiber.Ctx) (bool, error) {
	conf, err := db.GetConfig(c.Context(), "allow-register")
	if err != nil {
		return false, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	if conf != "true" {
		return false, utils.Error(c, fiber.StatusForbidden, consts.DisabledRegistrations)
	}

	uid := c.Locals("uid")
	if uid != nil {
		return false, utils.Error(c, fiber.StatusForbidden, consts.AlreadyRegistered)
	}

	return true, nil
}

func RegisterUser(c *fiber.Ctx, data Data) (int32, error) {
	tx, err := db.BeginTx(c.Context())
	if err != nil {
		return -1, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorBeginningTransaction, err)
	}
	defer db.Rollback(tx)

	user, err := DBRegisterUser(c.Context(), tx, data.Name, data.Email, data.Password)
	if err != nil {
		return -1, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorRegisteringUser, err)
	}
	if user == nil {
		return -1, utils.Error(c, fiber.StatusConflict, consts.UserAlreadyExists)
	}

	mode, err := db.GetConfig(c.Context(), "user-mode")
	if err != nil {
		return -1, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	if mode == "true" {
		team, err := teams_register.RegisterTeam(c.Context(), tx, data.Name, data.Password, user.ID)
		if err != nil {
			return -1, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorRegisteringTeam, err)
		}
		if team == nil {
			return -1, utils.Error(c, fiber.StatusInternalServerError, consts.TeamAlreadyExists, err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return -1, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCommittingTransaction, err)
	}

	return user.ID, nil
}

func loginUser(c *fiber.Ctx, userID int32) (bool, error) {
	sess, err := db.Store.Get(c)
	if err != nil {
		return false, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingSession, err)
	}

	err = sess.Regenerate()
	if err != nil {
		return false, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorRegeneratingSession, err)
	}

	sess.Set("uid", userID)

	err = sess.Save()
	if err != nil {
		return false, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorSavingSession, err)
	}

	return true, nil
}

func Route(c *fiber.Ctx) error {
	canRegister, err := CanRegister(c)
	if err != nil || !canRegister {
		return err
	}

	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	data.Name = validator.NormalizeString(data.Name)

	enabled, err := verifyMailEnabled(c)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}

	if enabled {
		if data.JWT == "" {
			return registerViaMail(c, data.Email)
		}

		mail, err := parseAndValidateToken(c, data.JWT)
		if err != nil || mail == "" {
			return err
		}

		data.Email = mail
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	userID, err := RegisterUser(c, data)
	if err != nil || userID == -1 {
		return err
	}

	success, err := loginUser(c, userID)
	if err != nil || !success {
		return err
	}

	return c.SendStatus(fiber.StatusOK)
}
