package challenges_solves

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

func GetChallengeSolves(ctx context.Context, id int32) ([]sqlc.GetChallengeSolvesRow, error) {
	solves, err := db.Sql.GetChallengeSolves(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return []sqlc.GetChallengeSolvesRow{}, nil
		}
		return nil, err
	}

	if solves == nil {
		solves = []sqlc.GetChallengeSolvesRow{}
	}

	return solves, nil
}
