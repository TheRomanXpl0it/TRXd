package users_search

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

func FetchName(c *fiber.Ctx, name string) ([]SearchUser, error) {
	valid, err := validator.Var(c, name, "user_name")
	if err != nil || !valid {
		return nil, err
	}

	users, err := SearchUsersByName(c.Context(), name)
	if err != nil {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUser, err)
	}

	return users, nil
}

func FetchEmail(c *fiber.Ctx, email string) ([]SearchUser, error) {
	if len(email) > consts.MaxEmailLen {
		return nil, utils.Error(c, fiber.StatusBadRequest, consts.InvalidEmail)
	}

	users, err := SearchUsersByEmail(c.Context(), email)
	if err != nil {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUser, err)
	}

	return users, nil
}

func Route(c *fiber.Ctx) error {
	userName := c.Query("name")
	userEmail := c.Query("email")

	userName = validator.NormalizeString(userName)
	userEmail = validator.NormalizeString(userEmail)

	if userName == "" && userEmail == "" {
		return utils.Error(c, fiber.StatusBadRequest, consts.MissingRequiredFields)
	}

	var users []SearchUser
	var err error

	if userName != "" {
		users, err = FetchName(c, userName)
	} else if userEmail != "" {
		users, err = FetchEmail(c, userEmail)
	}

	if err != nil || users == nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(users)
}
