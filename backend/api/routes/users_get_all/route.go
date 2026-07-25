package users_get_all

import (
	"math"
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

type Response struct {
	Total int64      `json:"total"`
	Users []UserData `json:"users"`
}

// @Summary [No Auth] Gets all users
// @Description Requires no privileges.
// @Description Retrieves a list of all users, can be paginated by using the `offset` and `limit` query parameters.
// @Tags users
// @Produce json
// @Param offset query int false "Number of items to skip before starting to collect the result set. Default is 0."
// @Param limit query int false "Number of items to return. Default is 0, which means no limit."
// @Success 200 {object} Response "List of users"
// @Failure 400 {object} models.Error "Possible errors: `Invalid parameter`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching users`"
// @Router /api/users [get]
func Route(c *fiber.Ctx) error {
	role := c.Locals("role")

	offset := c.QueryInt("offset", 0)
	if offset < 0 || offset > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	limit := c.QueryInt("limit", 0)
	if limit < 0 || limit > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	allData := false
	if role != nil {
		allData = utils.In(role.(sqlc.UserRole), []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin})
	}
	totalUsers, usersData, err := GetUsers(c.Context(), allData, int32(offset), int32(limit))
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUsers, err)
	}

	return c.Status(fiber.StatusOK).JSON(Response{
		Total: totalUsers,
		Users: usersData,
	})
}
