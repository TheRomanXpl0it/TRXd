package challenges_update

import (
	"trxd/db"
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
)

type UpdateChallParams struct {
	ChallID     *int32           `json:"chall_id" validate:"required,id"`
	Name        string           `json:"name" validate:"challenge_name"`
	Category    string           `json:"category" validate:"category_name"`
	Description *string          `json:"description" validate:"omitempty,challenge_description"`
	Authors     *[]string        `json:"authors" validate:"omitempty,challenge_authors"`
	Tags        *[]string        `json:"tags" validate:"omitempty,challenge_tags"`
	Type        *sqlc.DeployType `json:"type" validate:"omitempty,challenge_type"`
	Hidden      *bool            `json:"hidden"`
	MaxPoints   *int32           `json:"max_points" validate:"omitempty,challenge_max_points"`
	ScoreType   *sqlc.ScoreType  `json:"score_type" validate:"omitempty,challenge_score_type"`
	Host        *string          `json:"host"`
	Port        *int32           `json:"port" validate:"omitempty,challenge_port"`
	ConnType    *sqlc.ConnType   `json:"conn_type" validate:"omitempty,challenge_conn_type"`

	Image      *string `json:"image"`
	Compose    *string `json:"compose"`
	HashDomain *bool   `json:"hash_domain"`
	Lifetime   *int32  `json:"lifetime" validate:"omitempty,challenge_lifetime"`
	Renewable  *bool   `json:"renewable"`
	Envs       *string `json:"envs" validate:"omitempty,challenge_envs"`
	MaxMemory  *int32  `json:"max_memory" validate:"omitempty,challenge_max_memory"`
	MaxCpu     *string `json:"max_cpu" validate:"omitempty,challenge_max_cpu"`
}

// @Summary [Author+] Updates details of an existing challenge
// @Description Requires **Author** privileges or higher.
// @Description Updates an existing challenge with the provided fields, only the `chall_id` is required.
// @Tags challenges
// @Accept json
// @Produce json
// @Param data body UpdateChallParams true "`chall_id` is required, the rest of the fields are optional, only provide the fields you want to update"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `No data provided to update` | `Name must not exceed 128` | `Category must not exceed 32` | `Description must not exceed 10240` | `Authors[i] must not exceed 64` | `Tags[i] must not exceed 32` | `Type must be one of: Normal Container Compose` | `MaxPoints must be at least 0` | `ScoreType must be one of: Static Dynamic` | `Port must be at least 0` | `Port must not exceed 65535` | `ConnType must be one of: NONE TCP HTTP HTTPS` | `Lifetime must be at least 0` | `Invalid environment variables` | `MaxMemory must be at least 0` | `Invalid Max CPU, must be a positive 32-bit integer` | `ChallID must be at least 0`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found` | `Category not found`"
// @Failure 409 {object} models.Error "Possible errors: `Challenge name already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error updating challenge` | `Internal server error`"
// @Router /api/challenges [patch]
func Route(c *fiber.Ctx) error {
	var data UpdateChallParams
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}
	if IsChallEmpty(&data) && IsDockerConfigsEmpty(&data) {
		return utils.Error(c, fiber.StatusBadRequest, consts.NoDataToUpdate)
	}

	challenge, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	err = UpdateChallenge(c.Context(), &data)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == consts.PGUniqueViolation {
				return utils.Error(c, fiber.StatusConflict, consts.ChallengeNameAlreadyExists)
			}
			if pqErr.Code == consts.PGForeignKeyViolation {
				return utils.Error(c, fiber.StatusNotFound, consts.CategoryNotFound)
			}
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorUpdatingChallenge, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
