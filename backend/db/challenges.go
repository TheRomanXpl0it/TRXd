package db

import (
	"context"
	"database/sql"
	"time"
	"trxd/db/sqlc"
)

type Chall = sqlc.GetChallengeByIDRow

func GetChallengeByID(ctx context.Context, challengeID int32) (*Chall, error) {
	challenge, err := Sql.GetChallengeByID(ctx, challengeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &challenge, nil
}

func GetHiddenAndAttachments(ctx context.Context, challengeID int32) (*sqlc.GetHiddenAndAttachmentsRow, error) {
	res, err := Sql.GetHiddenAndAttachments(ctx, challengeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &res, nil
}

func GetTotalCategoryChallenges(ctx context.Context) ([]sqlc.GetTotalCategoryChallengesRow, error) {
	start, err := GetConfig(ctx, "start-time")
	if err != nil {
		return nil, err
	}

	if start != "" {
		startTime, err := time.Parse(time.RFC3339, start)
		if err != nil {
			return nil, err
		}
		if time.Now().Before(startTime) {
			return nil, nil
		}
	}

	challenges, err := Sql.GetTotalCategoryChallenges(ctx)
	if err != nil {
		if err != sql.ErrNoRows {
			return nil, err
		}
	}

	if challenges == nil {
		challenges = make([]sqlc.GetTotalCategoryChallengesRow, 0)
	}

	return challenges, nil
}
