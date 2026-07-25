package submissions_create

import (
	"strings"
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/utils/discord"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
	Flag    string `json:"flag" validate:"required,flag"`
}

type Response struct {
	Status     sqlc.SubmissionStatus `json:"status"`
	FirstBlood bool                  `json:"first_blood"`
}

// @Summary [Player+] Create a new submission for a challenge
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Creates submission for a challenge for the player's team (if **Player**, only on visible challenges).
// @Description If **Author** role or higher the submission is not created the flag is only validated.
// @Description If the discord webhook is configured and the submission is a first blood, a message will be sent to the discord channel.
// @Tags submissions
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200 {object} Response "Submission status and if it's a first blood"
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Flag must not exceed 256 `"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error submitting flag`"
// @Router /api/submissions [post]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
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

	uid := c.Locals("uid").(int32)
	role := c.Locals("role").(sqlc.UserRole)
	if role == sqlc.UserRolePlayer && challenge.Hidden {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	data.Flag = strings.TrimSpace(data.Flag)

	status, first_blood, err := SubmitFlag(c.Context(), uid, role, *data.ChallID, data.Flag)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorSubmittingFlag, err)
	}

	if first_blood && role == sqlc.UserRolePlayer {
		go discord.BroadcastFirstBlood(c.Context(), challenge, uid)
	}

	return c.Status(fiber.StatusOK).JSON(Response{
		Status:     status,
		FirstBlood: first_blood,
	})
}
