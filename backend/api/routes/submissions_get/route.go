package submissions_get

import (
	"math"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

type Response struct {
	Total       int64         `json:"total"`
	Submissions []Submissions `json:"submissions"`
}

// @Summary [Author+] Gets all submissions
// @Description Requires **Author** privileges or higher.
// @Description Retrieves a list of all submissions, can be paginated by using the `offset` and `limit` query parameters.
// @Tags submissions
// @Produce json
// @Param offset query int false "Number of items to skip before starting to collect the result set. Default is 0."
// @Param limit query int false "Number of items to return. Default is 0, which means no limit."
// @Success 200 {object} Response "List of submissions details"
// @Failure 400 {object} models.Error "Possible errors: `Invalid parameter`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching submissions`"
// @Router /api/submissions [get]
func Route(c *fiber.Ctx) error {
	offset := c.QueryInt("offset", 0)
	if offset < 0 || offset > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	limit := c.QueryInt("limit", 0)
	if limit < 0 || limit > math.MaxInt32 {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidParam)
	}

	totalUsers, submissionsData, err := GetSubmissions(c.Context(), int32(offset), int32(limit))
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingSubmissions, err)
	}

	return c.Status(fiber.StatusOK).JSON(Response{
		Total:       totalUsers,
		Submissions: submissionsData,
	})
}
