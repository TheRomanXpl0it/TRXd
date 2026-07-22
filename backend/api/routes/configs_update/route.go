package configs_update

import (
	"trxd/db"
	"trxd/instancer/composes"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"trxd/utils/log"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	Key   string  `json:"key" validate:"required"`
	Value *string `json:"value" validate:"required"`
}

// @Summary [Admin] Updates details of an existing config
// @Description Requires **Admin** privileges.
// @Description Updates an existing config's value.
// @Description Note: if `user-mode` is updated, the server will automatically shut down and restart to apply the change.
// @Description Note: if `registry-server` or `registry-username` or `registry-password` are updated, a docker config write will occur, and the auth will be updated.
// @Tags configs
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields`"
// @Failure 404 {object} models.Error "Possible errors: `Configuration not found`"
// @Failure 500 {object} models.Error "Possible errors: `Error updating configuration`"
// @Router /api/configs [patch]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	conf, err := db.GetCompleteConfig(c.Context(), data.Key)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingConfig, err)
	}
	if conf == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ConfigNotFound)
	}

	if conf.Value == *data.Value { // No change needed
		return c.SendStatus(fiber.StatusOK)
	}

	err = db.UpdateConfig(c.Context(), data.Key, *data.Value)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingConfig, err)
	}

	switch data.Key {
	case "user-mode":
		log.Warn("Shutting down server to apply user-mode change")
		go func(app *fiber.App) {
			err := app.Shutdown()
			if err != nil {
				log.Error("Error shutting down server", "err", err)
			}
		}(c.App())
	case "registry-server", "registry-username", "registry-password":
		err = composes.SetRegistryAuth(c.Context())
		if err != nil {
			return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingConfig, err)
		}
	}

	return c.SendStatus(fiber.StatusOK)
}
