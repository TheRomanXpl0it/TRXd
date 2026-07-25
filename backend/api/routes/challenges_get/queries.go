package challenges_get

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

type Chall struct {
	SolvesList []sqlc.GetChallengeSolvesRow `json:"solves_list"`

	Name         *string            `json:"name,omitempty"`
	Category     *string            `json:"category,omitempty"`
	Description  *string            `json:"description,omitempty"`
	Authors      *[]string          `json:"authors,omitempty"`
	Tags         *[]string          `json:"tags,omitempty"`
	InstanceType *sqlc.InstanceType `json:"instance_type,omitempty"`
	Hidden       *bool              `json:"hidden,omitempty"`
	MaxPoints    *int32             `json:"max_points,omitempty"`
	ScoreType    *sqlc.ScoreType    `json:"score_type,omitempty"`
	Host         *string            `json:"host,omitempty"`
	Port         *int32             `json:"port,omitempty"`
	ConnType     *sqlc.ConnType     `json:"conn_type,omitempty"`
	HashDomain   *bool              `json:"hash_domain,omitempty"`

	Attachments *[]string                      `json:"attachments,omitempty"`
	Flags       *[]sqlc.GetFlagsByChallengeRow `json:"flags,omitempty"`

	Image     *string `json:"image,omitempty"`
	Compose   *string `json:"compose,omitempty"`
	Lifetime  *int    `json:"lifetime,omitempty"`
	Renewable *bool   `json:"renewable,omitempty"`
	Envs      *string `json:"envs,omitempty"`
	MaxMemory *int    `json:"max_memory,omitempty"`
	MaxCpu    *string `json:"max_cpu,omitempty"`
}

func GetChallengeSolves(ctx context.Context, challengeID int32) ([]sqlc.GetChallengeSolvesRow, error) {
	solves, err := db.Sql.GetChallengeSolves(ctx, challengeID)
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

func GetChallAttachments(ctx context.Context, challengeID int32) (*[]string, error) {
	attachments, err := db.Sql.GetChallAttachments(ctx, challengeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return new([]string{}), nil
		}
		return nil, err
	}

	if attachments == nil {
		return new([]string{}), nil
	}

	return &attachments, nil
}

func GetFlagsByChallenge(ctx context.Context, challengeID int32) ([]sqlc.GetFlagsByChallengeRow, error) {
	flags, err := db.Sql.GetFlagsByChallenge(ctx, challengeID)
	if err != nil {
		return nil, err
	}

	return flags, nil
}

func GetChallenge(ctx context.Context, id int32, uid int32, tid int32, author bool) (*Chall, error) {
	challenge, err := db.GetChallengeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if challenge == nil {
		return nil, nil
	}
	if !author && challenge.Hidden {
		return nil, nil
	}

	chall := Chall{}

	chall.SolvesList, err = GetChallengeSolves(ctx, id)
	if err != nil {
		return nil, err
	}

	if !author { // Not Author
		return &chall, nil
	}

	chall.Name = &challenge.Name
	chall.Category = &challenge.Category
	chall.Description = &challenge.Description
	chall.Authors = &challenge.Authors
	chall.Tags = &challenge.Tags
	chall.InstanceType = &challenge.InstanceType
	chall.Hidden = &challenge.Hidden
	chall.MaxPoints = &challenge.MaxPoints
	chall.ScoreType = &challenge.ScoreType
	chall.Host = &challenge.Host
	chall.Port = &challenge.Port
	chall.ConnType = &challenge.ConnType
	chall.HashDomain = &challenge.HashDomain
	chall.Image = &challenge.Image
	chall.Compose = &challenge.Compose
	chall.Lifetime = new(int(challenge.Lifetime))
	chall.Renewable = &challenge.Renewable
	chall.Envs = &challenge.Envs
	chall.MaxMemory = new(int(challenge.MaxMemory))
	chall.MaxCpu = &challenge.MaxCpu

	chall.Attachments, err = GetChallAttachments(ctx, id)
	if err != nil {
		return nil, err
	}

	flags, err := GetFlagsByChallenge(ctx, challenge.ID)
	if err != nil {
		return nil, err
	}

	chall.Flags = &[]sqlc.GetFlagsByChallengeRow{}
	if flags != nil {
		chall.Flags = &flags
	}

	return &chall, nil
}
