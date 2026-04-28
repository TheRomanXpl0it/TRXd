package teams_search

import (
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

func FetchName(c *fiber.Ctx, name string) ([]SearchTeam, error) {
	valid, err := validator.Var(c, name, "team_name")
	if err != nil || !valid {
		return nil, err
	}

	teams, err := SearchTeamsByName(c.Context(), name)
	if err != nil {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}

	return teams, nil
}

func FetchEmail(c *fiber.Ctx, email string) ([]SearchTeam, error) {
	if len(email) > consts.MaxEmailLen {
		return nil, utils.Error(c, fiber.StatusBadRequest, consts.InvalidEmail)
	}

	teams, err := SearchTeamsByEmail(c.Context(), email)
	if err != nil {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeam, err)
	}

	return teams, nil
}

func Route(c *fiber.Ctx) error {
	teamName := c.Query("name")
	teamEmail := c.Query("email")

	teamName = validator.NormalizeString(teamName)
	teamEmail = validator.NormalizeString(teamEmail)

	if teamName == "" && teamEmail == "" {
		return utils.Error(c, fiber.StatusBadRequest, consts.MissingRequiredFields)
	}

	var teams []SearchTeam
	var err error

	if teamName != "" {
		teams, err = FetchName(c, teamName)
	} else if teamEmail != "" {
		teams, err = FetchEmail(c, teamEmail)
	}

	if err != nil || teams == nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(teams)
}
