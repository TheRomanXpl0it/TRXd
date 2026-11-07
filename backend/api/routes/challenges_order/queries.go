package challenges_order

import (
	"context"
	"trxd/db"
	"trxd/db/sqlc"
)

func UpdateChallengeOrder(ctx context.Context, challID int32, newOrder int32) error {
	err := db.Sql.UpdateChallengeOrder(ctx, sqlc.UpdateChallengeOrderParams{
		ChallID:  challID,
		NewOrder: newOrder,
	})
	if err != nil {
		return err
	}

	return nil
}
