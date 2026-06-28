package users_logout

import (
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [No Auth] Logs out the current user
// @Description Requires no privileges.
// @Description Destroys the current user session.
// @Tags users
// @Produce json
// @Success 200
// @Failure 500 {object} models.Error "Possible errors: `Error fetching session` | `Error destroying session`"
// @Router /api/logout [post]
func Route(c *fiber.Ctx) error {
	sess, err := db.Store.Get(c)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingSession, err)
	}

	err = sess.Destroy()
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDestroyingSession, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
