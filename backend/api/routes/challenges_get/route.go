package challenges_get

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Player+] Gets challenge details
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Retrieves challenge details (with role **Player** only solves if the challenge is visible).
// @Tags challenges
// @Produce json
// @Param id path int true "Challenge ID"
// @Success 200 {object} Chall "solves is only included if the requester has Player role, otherwise all the challenge details are included except the solves"
// @Failure 400 {object} models.Error "Possible errors: `Invalid challenge ID, must be non negative` | `id must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge`"
// @Router /api/challenges/:id [get]
func Route(c *fiber.Ctx) error {
	uid := c.Locals("uid").(int32)
	tid := c.Locals("tid").(int32)
	role := c.Locals("role").(sqlc.UserRole)

	challengeIDInt, err := c.ParamsInt("id")
	if err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidChallengeID)
	}
	challengeID := int32(challengeIDInt)
	valid, err := validator.Var(c, challengeID, "id")
	if err != nil || !valid {
		return err
	}

	all := utils.In(role, []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	challenge, err := GetChallenge(c.Context(), challengeID, uid, tid, all)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	return c.Status(fiber.StatusOK).JSON(challenge)
}
