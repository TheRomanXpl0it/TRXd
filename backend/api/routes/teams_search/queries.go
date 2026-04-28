package teams_search

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

type SearchTeam struct {
	ID      int32         `json:"id"`
	Name    string        `json:"name"`
	Email   string        `json:"email,omitempty"`
	Role    sqlc.UserRole `json:"role,omitempty"`
	Country string        `json:"country"`
	UserID  *int32        `json:"user_id,omitempty"`
}

func SearchTeamsByName(ctx context.Context, name string) ([]SearchTeam, error) {
	userModeStr, err := db.GetConfig(ctx, "user-mode")
	if err != nil {
		return nil, err
	}
	userMode := userModeStr == "true"

	data, err := db.Sql.SearchTeamsByName(ctx, name)
	if err != nil {
		if err == sql.ErrNoRows {
			return []SearchTeam{}, nil
		}
		return nil, err
	}

	teams := make([]SearchTeam, len(data))
	for i, team := range data {
		teams[i] = SearchTeam{
			ID:   team.ID,
			Name: team.Name,
		}

		if team.Country.Valid {
			teams[i].Country = team.Country.String
		}

		if !userMode {
			continue
		}

		teams[i].Email = team.Email
		teams[i].Role = team.Role
		teams[i].UserID = &team.UserID
	}

	return teams, nil
}

func SearchTeamsByEmail(ctx context.Context, email string) ([]SearchTeam, error) {
	userModeStr, err := db.GetConfig(ctx, "user-mode")
	if err != nil {
		return nil, err
	}
	userMode := userModeStr == "true"

	data, err := db.Sql.SearchTeamsByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return []SearchTeam{}, nil
		}
		return nil, err
	}

	teams := make([]SearchTeam, len(data))
	for i, team := range data {
		teams[i] = SearchTeam{}

		if team.ID.Valid {
			teams[i].ID = team.ID.Int32
		}
		if team.Name.Valid {
			teams[i].Name = team.Name.String
		}
		if team.Country.Valid {
			teams[i].Country = team.Country.String
		}

		if !userMode {
			continue
		}

		teams[i].Email = team.Email
		teams[i].Role = team.Role
		teams[i].UserID = &team.UserID
	}

	return teams, nil
}
