package challenges_create

import (
	"trxd/db/sqlc"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/validator"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
)

type Data struct {
	Name         string            `json:"name" validate:"required,challenge_name"`
	Category     string            `json:"category" validate:"required,category_name"`
	Description  string            `json:"description" validate:"challenge_description"`
	InstanceType sqlc.InstanceType `json:"instance_type" validate:"required,challenge_instance_type"`
	MaxPoints    int32             `json:"max_points" validate:"required,challenge_max_points"`
	ScoreType    sqlc.ScoreType    `json:"score_type" validate:"required,challenge_score_type"`
}

// @Summary [Author+] Creates a new challenge
// @Description Requires **Author** privileges or higher.
// @Description Creates a new challenge with the provided details.
// @Tags challenges
// @Accept json
// @Produce json
// @Param data body Data true "all fields are required except **description**"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid JSON format` | `Missing required fields` | `Name must not exceed 32` | `Category must not exceed 32` | `Description must not exceed 10240` | `InstanceType must be one of: Static Container Compose` | `MaxPoints must be at least 0` | `ScoreType must be one of: Static Dynamic`"
// @Failure 404 {object} models.Error "Possible errors: `Category not found`"
// @Failure 409 {object} models.Error "Possible errors: `Challenge already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error creating challenge`"
// @Router /api/challenges [post]
func Route(c *fiber.Ctx) error {
	var data Data
	if err := c.BodyParser(&data); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidJSON)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return err
	}

	challenge, err := CreateChallenge(c.Context(), data.Name, data.Category, data.Description, data.InstanceType, data.MaxPoints, data.ScoreType)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == consts.PGForeignKeyViolation {
				return utils.Error(c, fiber.StatusNotFound, consts.CategoryNotFound)
			}
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusConflict, consts.ChallengeAlreadyExists)
	}

	return c.SendStatus(fiber.StatusOK)
}
