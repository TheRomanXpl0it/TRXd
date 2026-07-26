package challenges_update

import (
	"context"
	"database/sql"
	"errors"
	"trxd/db"
	"trxd/db/sqlc"
)

func nullString(src *string) sql.NullString {
	if src == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *src, Valid: true}
}

func nullBool(src *bool) sql.NullBool {
	if src == nil {
		return sql.NullBool{Valid: false}
	}
	return sql.NullBool{Bool: *src, Valid: true}
}

func nullInt32(src *int32) sql.NullInt32 {
	if src == nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: *src, Valid: true}
}

func nullInstanceType(src *sqlc.InstanceType) sqlc.NullInstanceType {
	if src == nil {
		return sqlc.NullInstanceType{Valid: false}
	}
	return sqlc.NullInstanceType{InstanceType: *src, Valid: true}
}

func nullScoreType(src *sqlc.ScoreType) sqlc.NullScoreType {
	if src == nil {
		return sqlc.NullScoreType{Valid: false}
	}
	return sqlc.NullScoreType{ScoreType: *src, Valid: true}
}

func nullConnType(src *sqlc.ConnType) sqlc.NullConnType {
	if src == nil {
		return sqlc.NullConnType{Valid: false}
	}
	return sqlc.NullConnType{ConnType: *src, Valid: true}
}

func nullStringSlice(src *[]string) []string {
	if src == nil {
		return nil
	}
	return *src
}

func IsChallInstanceInfoEmpty(data *Data) bool {
	if data.Image == nil && data.Compose == nil && data.Lifetime == nil && data.Renewable == nil &&
		data.Envs == nil && data.MaxMemory == nil && data.MaxCpu == nil {
		return true
	}
	return false
}

func IsChallEmpty(data *Data) bool {
	if data.Name == "" && data.Category == "" && data.Description == nil && data.Authors == nil &&
		data.Tags == nil && data.InstanceType == nil && data.Hidden == nil && data.MaxPoints == nil &&
		data.ScoreType == nil && data.Host == nil && data.Port == nil && data.ConnType == nil &&
		data.HashDomain == nil && IsChallInstanceInfoEmpty(data) {
		return true
	}
	return false
}

func UpdateChallenge(ctx context.Context, data *Data) error {
	if data.ChallID == nil {
		return errors.New("missing challenge ID")
	}

	if IsChallEmpty(data) {
		return nil
	}

	challParams := sqlc.UpdateChallengeParams{
		ChallID:      *data.ChallID,
		Name:         sql.NullString{String: data.Name, Valid: data.Name != ""},
		Category:     sql.NullString{String: data.Category, Valid: data.Category != ""},
		Description:  nullString(data.Description),
		Authors:      nullStringSlice(data.Authors),
		Tags:         nullStringSlice(data.Tags),
		InstanceType: nullInstanceType(data.InstanceType),
		Hidden:       nullBool(data.Hidden),

		MaxPoints: nullInt32(data.MaxPoints),
		ScoreType: nullScoreType(data.ScoreType),

		Host:       nullString(data.Host),
		Port:       nullInt32(data.Port),
		ConnType:   nullConnType(data.ConnType),
		HashDomain: nullBool(data.HashDomain),

		Image:     nullString(data.Image),
		Compose:   nullString(data.Compose),
		Lifetime:  nullInt32(data.Lifetime),
		Renewable: nullBool(data.Renewable),
		Envs:      nullString(data.Envs),
		MaxMemory: nullInt32(data.MaxMemory),
		MaxCpu:    nullString(data.MaxCpu),
	}

	err := db.Sql.UpdateChallenge(ctx, challParams)
	if err != nil {
		return err
	}

	return nil
}
