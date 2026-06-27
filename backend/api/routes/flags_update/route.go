package flags_update

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
	Flag    string `json:"flag" validate:"required,flag"`
	Regex   *bool  `json:"regex"`
	NewFlag string `json:"new_flag" validate:"flag"`
}

// @Summary [Author+] Updates a flag for a challenge
// @Description Requires **Author** privileges or higher.
// @Description Updates a flag of a challenge.
// @Tags flags
// @Accept json
// @Produce json
// @Param data body Data true "`chall_id` and `flag` are required, at least one of `regex` or `new_flag` must be provided"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Flag must not exceed 256` | `NewFlag must not exceed 256`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 409 {object} models.Error "Possible errors: `Flag already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error updating flag`"
// @Router /api/flags [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	if data.Regex == nil && data.NewFlag == "" {
		return utils.Error(c, fiber.StatusBadRequest, consts.MissingRequiredFields)
	}
	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	challenge, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	ok, err := UpdateFlag(c.Context(), *data.ChallID, data.Flag, data.Regex, data.NewFlag)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingFlag, err)
	}
	if !ok {
		return utils.Error(c, fiber.StatusConflict, consts.FlagAlreadyExists)
	}

	return c.SendStatus(fiber.StatusOK)
}
