package instances_get

import (
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Author+] Gets all instances
// @Description Requires **Author** privileges or higher.
// @Description Retrieves a list of all instances.
// @Tags instances
// @Produce json
// @Success 200 {object} []sqlc.GetInstancesRow "List of instances details"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching instances`"
// @Router /api/instances [get]
func Route(c *fiber.Ctx) error {
	instances, err := GetInstances(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingInstances, err)
	}

	return c.Status(fiber.StatusOK).JSON(instances)
}
