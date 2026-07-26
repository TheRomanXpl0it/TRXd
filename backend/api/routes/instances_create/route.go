package instances_create

import (
	"errors"
	"time"
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/instancer"
	"trxd/instancer/instancer_errors"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
)

type Data struct {
	ChallID *int32 `json:"chall_id" validate:"required,id"`
}

type InstanceInfo struct {
	Host       string `json:"host"`
	Port       *int32 `json:"port,omitempty"`
	Timeout    int    `json:"timeout"`
	HashDomain bool   `json:"hash_domain"`
}

func createInstance(c *fiber.Ctx, tid int32, chall *db.Chall) (*InstanceInfo, error) {
	if chall.Lifetime == 0 {
		return nil, utils.Error(c, fiber.StatusInternalServerError, consts.MissingLifetime, errors.New(consts.MissingLifetime))
	}
	params := &instancer.CreateInstanceParams{
		Tid:          tid,
		ChallID:      chall.ID,
		ConnType:     chall.ConnType,
		InstanceType: chall.InstanceType,

		Image:      chall.Image,
		Compose:    chall.Compose,
		HashDomain: chall.HashDomain,
		Lifetime:   chall.Lifetime,
		Envs:       chall.Envs,
		MaxMemory:  chall.MaxMemory,
		MaxCpu:     chall.MaxCpu,
	}

	if chall.Port != 0 {
		params.InternalPort = &chall.Port
	}

	res, err := instancer.CreateInstance(c.Context(), params)
	if err != nil {
		switch err.(type) {
		case *instancer_errors.InvalidInstanceError:
			return nil, utils.Error(c, fiber.StatusInternalServerError, err.Error())
		case *instancer_errors.RaceConditionError:
			return nil, utils.Error(c, fiber.StatusConflict, consts.AlreadyAnActiveInstance)
		default:
			return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingInstance, err)
		}
	}

	return &InstanceInfo{
		Host:       res.Host,
		Port:       res.Port,
		Timeout:    max(int(time.Until(res.Expiration).Seconds()), 0),
		HashDomain: chall.HashDomain,
	}, nil
}

// @Summary [Player+] Spawns a new instance of a challenge
// @Description Requires **Player** privileges or higher (with role **Player** is also required to be in a team and the competition has to be active).
// @Description Creates a new instance of a challenge for a team (if **Player**, only visible challenges).
// @Description Note: This endpoint uses docker, so it's critical, remember that all 500 errors will log the full error message.
// @Tags instances
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `ChallID must be at least 0` | `Challenge is not instanciable`"
// @Failure 403 {object} models.Error "Possible errors: `Team not Found`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 409 {object} models.Error "Possible errors: `Already an active instance`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error fetching instance` | `Error creating instance` | `invalid instance: {error message}`"
// @Router /api/instances [post]
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

	chall, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if chall == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	if chall.Hidden && !utils.In(role,
		[]sqlc.UserRole{sqlc.UserRoleAuthor, sqlc.UserRoleAdmin}) {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}
	if chall.InstanceType == sqlc.InstanceTypeStatic {
		return utils.Error(c, fiber.StatusBadRequest, consts.ChallengeNotInstanciable)
	}

	instance, err := instancer.GetInstance(c.Context(), *data.ChallID, tid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingInstance, err)
	}
	if instance != nil {
		return utils.Error(c, fiber.StatusConflict, consts.AlreadyAnActiveInstance)
	}

	info, err := createInstance(c, tid, chall)
	if err != nil || info == nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(info)
}
