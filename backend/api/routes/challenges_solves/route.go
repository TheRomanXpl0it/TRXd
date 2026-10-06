package challenges_solves

import (
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Player+] Get challenge solves by id
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team, the challenge must be visible, and the competition has to be active).
// @Tags challenges
// @Produce json
// @Param id path int true "Challenge ID"
// @Success 200 {object} []sqlc.GetChallengeSolvesRow "solves from the specified challenge"
// @Failure 400 {object} models.Error "Possible errors: `Invalid challenge ID, must be non negative` | `id must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge`"
// @Router /api/challenges/:id/solves [get]
func Route(c *fiber.Ctx) error {
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

	chall, err := db.GetChallengeByID(c.Context(), challengeID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if chall == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	if chall.Hidden && !utils.In(role,
		[]sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin}) {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	challenge, err := GetChallengeSolves(c.Context(), challengeID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}

	return c.Status(fiber.StatusOK).JSON(challenge)
}
