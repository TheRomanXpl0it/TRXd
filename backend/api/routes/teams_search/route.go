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
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeams, err)
	}

	return teams, nil
}

func FetchEmail(c *fiber.Ctx, email string) ([]SearchTeam, error) {
	if len(email) > consts.MaxEmailLen {
		return nil, utils.Error(c, fiber.StatusBadRequest, consts.InvalidEmail)
	}

	teams, err := SearchTeamsByEmail(c.Context(), email)
	if err != nil {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingTeams, err)
	}

	return teams, nil
}

// @Summary [Author+] Gets a list of searched teams
// @Description Requires **Author** privileges or higher.
// @Description Retrieves a list of all teams with matching **name** or **email**.
// @Description The search is done through a case-insensitive substring match and trigrams matching.
// @Tags teams
// @Produce json
// @Param name query string false "The name of the team to search for"
// @Param email query string false "The email of the team to search for"
// @Success 200 {object} []SearchTeam "the result of the search, a list of teams"
// @Failure 400 {object} models.Error "Possible errors: `Missing required fields` | `Name must not exceed 64` | `Invalid name` | `Invalid email format`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching teams`"
// @Router /api/teams/search [get]
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
