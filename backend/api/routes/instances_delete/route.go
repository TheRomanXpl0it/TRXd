package instances_delete

import (
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/instancer"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	TeamID  *int32 `json:"team_id" validate:"omitnil,id"`
	ChallID *int32 `json:"chall_id" validate:"required,id"`
}

// @Summary [Player+] Deletes an instance of a challenge
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Deletes an instance of a challenge for a team (if **Player**, only visible challenges), with **Admin** role is also possible to delete instances for other teams.
// @Description Note: This endpoint uses docker, so it's critical, remember that all 500 errors will log the full error message.
// @Tags instances
// @Accept json
// @Produce json
// @Param data body Data true "`chall_id` is required, `team_id` is optional and only for admins"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `TeamID must be at least 0` | `Challenge is not instanciable`"
// @Failure 403 {object} models.Error "Possible errors: `Team not Found`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 409 {object} models.Error "Possible errors: `Already an active instance`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error fetching instance` | `Error deleting instance`"
// @Router /api/instances [delete]
func Route(c *fiber.Ctx) error {
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

	role := c.Locals("role").(sqlc.UserRole)
	if chall.Info.Hidden && !utils.In(role,
		[]sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin}) {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}
	if chall.Info.Type == sqlc.DeployTypeStatic {
		return utils.Error(c, fiber.StatusBadRequest, consts.ChallengeNotInstanciable)
	}

	var tid int32
	if role == sqlc.UserRoleAdmin && data.TeamID != nil {
		tid = *data.TeamID
	} else {
		tid = c.Locals("tid").(int32)
	}

	if tid == -1 {
		return utils.Error(c, fiber.StatusForbidden, consts.TeamNotFound)
	}

	instance, err := instancer.GetInstance(c.Context(), *data.ChallID, tid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingInstance, err)
	}
	if instance == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.InstanceNotFound)
	}

	err = instancer.DeleteInstance(c.Context(), tid, *data.ChallID, instance.DockerID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorDeletingInstance, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
