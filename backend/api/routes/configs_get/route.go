package configs_get

import (
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

// @Summary [Admin] Gets all configs
// @Description Requires **Admin** privileges.
// @Description Retrieves a list of all configs.
// @Tags configs
// @Produce json
// @Success 200 {object} []sqlc.Config "List of configs with all displayable details"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching configurations`"
// @Router /api/configs [get]
func Route(c *fiber.Ctx) error {
	configs, err := GetConfigs(c.Context())
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfigs, err)
	}

	return c.Status(fiber.StatusOK).JSON(configs)
}
