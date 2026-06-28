package users_info

import (
	"fmt"
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"

	"github.com/gofiber/fiber/v2"
)

type Response struct {
	EmailVerification bool   `json:"email_verification"`
	StartTime         string `json:"start_time,omitempty"`
	EndTime           string `json:"end_time,omitempty"`

	ID       int32  `json:"id,omitempty"`
	Name     string `json:"name,omitempty"`
	Role     string `json:"role,omitempty"`
	UserMode bool   `json:"user_mode,omitempty"`
	Country  string `json:"country,omitempty"`
	TeamID   *int32 `json:"team_id,omitempty"`
}

// @Summary [No Auth] Gets various infos about the current user and the CTF
// @Description Requires no privileges.
// @Description Retrieves various infos about the current user and the CTF.
// @Description It includes email verification status, start and end times if not logged in
// @Description Otherwise it also includes user ID, name, role, user mode, country, and team ID.
// @Tags users
// @Produce json
// @Success 200 {object} Response "the various infos about the current user and the CTF"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching configuration` | `Error fetching user`"
// @Router /api/info [get]
func Route(c *fiber.Ctx) error {
	emailVerification, err := db.GetConfig(c.Context(), "email-verification")
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	startTime, err := db.GetConfig(c.Context(), "start-time")
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	endTime, err := db.GetConfig(c.Context(), "end-time")
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}

	info := Response{
		EmailVerification: emailVerification == "true",
	}
	if startTime != "" {
		info.StartTime = startTime
	}
	if endTime != "" {
		info.EndTime = endTime
	}

	uidLocal := c.Locals("uid")
	if uidLocal == nil {
		return c.Status(fiber.StatusOK).JSON(info)
	}

	uid := uidLocal.(int32)

	user, err := db.GetUserByID(c.Context(), uid)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUser, err)
	}
	if user == nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingUser, fmt.Errorf("user not found"))
	}
	info.ID = user.ID
	info.Name = user.Name
	info.Role = string(user.Role)

	userMode, err := db.GetConfig(c.Context(), "user-mode")
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingConfig, err)
	}
	info.UserMode = userMode == "true"
	if user.Country.Valid {
		info.Country = user.Country.String
	}

	var teamID *int32
	if user.TeamID.Valid {
		teamID = &user.TeamID.Int32
	}
	info.TeamID = teamID

	return c.Status(fiber.StatusOK).JSON(info)
}
