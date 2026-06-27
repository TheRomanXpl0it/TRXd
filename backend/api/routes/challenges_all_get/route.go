package challenges_all_get

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Player+] Gets all challenges
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Retrieves a list of all challenges (with role **Player** only visible one are returned).
// @Tags challenges
// @Produce json
// @Success 200 {object} []Chall "List of challenges with all dysplayable details (except solves)"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenges`"
// @Router /api/challenges [get]
func Route(c *fiber.Ctx) error {
	uid := c.Locals("uid").(int32)
	tid := c.Locals("tid").(int32)
	role := c.Locals("role").(sqlc.UserRole)

	all := utils.In(role, []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	challenges, err := GetChallenges(c.Context(), uid, tid, all)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenges, err)
	}

	return c.Status(fiber.StatusOK).JSON(challenges)
}
