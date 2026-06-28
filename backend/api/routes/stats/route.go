package stats

import (
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Author+] Gets stats
// @Description Requires **Author** privileges or higher.
// @Description Retrieves a list useful stats.
// @Tags stats
// @Produce json
// @Success 200 {object} sqlc.GetAdminStatsRow "List of stats"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching stats`"
// @Router /api/stats [get]
func Route(c *fiber.Ctx) error {
	stats, err := GetAdminStats(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingStats)
	}

	return c.Status(fiber.StatusOK).JSON(stats)
}
