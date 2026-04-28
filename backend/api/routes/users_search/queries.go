package users_search

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

type SearchUser struct {
	ID      int32         `json:"id"`
	Name    string        `json:"name"`
	Email   string        `json:"email"`
	Role    sqlc.UserRole `json:"role"`
	Country string        `json:"country"`
}

func SearchUsersByName(ctx context.Context, name string) ([]SearchUser, error) {
	data, err := db.Sql.SearchUsersByName(ctx, name)
	if err != nil {
		if err == sql.ErrNoRows {
			return []SearchUser{}, nil
		}
		return nil, err
	}

	users := make([]SearchUser, len(data))
	for i, user := range data {
		users[i] = SearchUser{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  user.Role,
		}

		if user.Country.Valid {
			users[i].Country = user.Country.String
		}
	}

	return users, nil
}

func SearchUsersByEmail(ctx context.Context, email string) ([]SearchUser, error) {
	data, err := db.Sql.SearchUsersByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return []SearchUser{}, nil
		}
		return nil, err
	}

	users := make([]SearchUser, len(data))
	for i, user := range data {
		users[i] = SearchUser{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  user.Role,
		}

		if user.Country.Valid {
			users[i].Country = user.Country.String
		}
	}

	return users, nil
}
