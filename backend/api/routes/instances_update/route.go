package instances_update

import (
	"errors"
	"time"
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/instancer"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
}

func canRenewInstance(c *fiber.Ctx, chall *db.Chall, role sqlc.UserRole, tid int32, challID int32) (bool, error) {
	if chall.Info.Hidden &&
		!utils.In(role, []sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin}) {
		return false, utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	if chall.Info.Type == sqlc.DeployTypeStatic {
		return false, utils.Error(c, fiber.StatusBadRequest, consts.ChallengeNotInstanciable)
	}

	if !chall.DockerConfig.Renewable {
		return false, utils.Error(c, fiber.StatusBadRequest, consts.ChallengeInstanceNotRenewable)
	}

	instance, err := instancer.GetInstance(c.Context(), challID, tid)
	if err != nil {
		return false, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingInstance, err)
	}
	if instance == nil {
		return false, utils.Error(c, fiber.StatusNotFound, consts.InstanceNotFound)
	}

	return true, nil
}

// @Summary [Player+] Updates the lifetime of an existing instance of a challenge
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Updates the lifetime of an existing instance of a challenge for a team (if **Player**, only visible challenges).
// @Tags instances
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Challenge is not instanciable`"
// @Failure 403 {object} models.Error "Possible errors: `Team not Found`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found` | `Instance not found`"
// @Failure 409 {object} models.Error "Possible errors: `Already an active instance`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error fetching instance` | `global lifetime is missing` | `Error updating instance`"
// @Router /api/instances [patch]
func Route(c *fiber.Ctx) error {
	role := c.Locals("role").(sqlc.UserRole)
	tid := c.Locals("tid").(int32)
	if tid == -1 {
		return utils.Error(c, fiber.StatusForbidden, consts.TeamNotFound)
	}

	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	chall, err := db.GetChallenge(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if chall == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	canRenew, err := canRenewInstance(c, chall, role, tid, *data.ChallID)
	if err != nil || !canRenew {
		return err
	}

	if chall.DockerConfig.Lifetime == 0 {
		return utils.Error(c, fiber.StatusInternalServerError, consts.MissingLifetime, errors.New(consts.MissingLifetime))
	}
	lifetime := time.Second * time.Duration(chall.DockerConfig.Lifetime.(int64))
	expires_at := time.Now().Add(lifetime)

	err = instancer.UpdateInstanceExpire(c.Context(), tid, *data.ChallID, expires_at)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingInstance, err)
	}

	timeout := int(time.Until(expires_at).Seconds())
	if timeout < 0 {
		timeout = 0
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"timeout": timeout,
	})
}
