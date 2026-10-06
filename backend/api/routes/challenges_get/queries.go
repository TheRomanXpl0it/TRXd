package challenges_get

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

type Chall struct {
	Name         string            `json:"name"`
	Category     string            `json:"category"`
	Description  string            `json:"description"`
	Authors      []string          `json:"authors"`
	Tags         []string          `json:"tags"`
	AuthorTags   []string          `json:"author_tags"`
	InstanceType sqlc.InstanceType `json:"instance_type"`
	Hidden       bool              `json:"hidden"`
	MaxPoints    int32             `json:"max_points"`
	ScoreType    sqlc.ScoreType    `json:"score_type"`
	Host         string            `json:"host"`
	Port         int32             `json:"port"`
	ConnType     sqlc.ConnType     `json:"conn_type"`
	HashDomain   bool              `json:"hash_domain"`

	Attachments []string                      `json:"attachments"`
	Flags       []sqlc.GetFlagsByChallengeRow `json:"flags"`

	Image     string `json:"image"`
	Compose   string `json:"compose"`
	Lifetime  int32  `json:"lifetime"`
	Renewable bool   `json:"renewable"`
	Envs      string `json:"envs"`
	MaxMemory int32  `json:"max_memory"`
	MaxCpu    string `json:"max_cpu"`
}

func GetChallAttachments(ctx context.Context, challengeID int32) ([]string, error) {
	attachments, err := db.Sql.GetChallAttachments(ctx, challengeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return []string{}, nil
		}
		return nil, err
	}

	if attachments == nil {
		return []string{}, nil
	}

	return attachments, nil
}

func GetFlagsByChallenge(ctx context.Context, challengeID int32) ([]sqlc.GetFlagsByChallengeRow, error) {
	flags, err := db.Sql.GetFlagsByChallenge(ctx, challengeID)
	if err != nil {
		return nil, err
	}

	if flags == nil {
		flags = []sqlc.GetFlagsByChallengeRow{}
	}

	return flags, nil
}

func GetChallenge(ctx context.Context, id int32) (*Chall, error) {
	challenge, err := db.GetChallengeByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if challenge == nil {
		return nil, nil
	}

	chall := Chall{
		Name:         challenge.Name,
		Category:     challenge.Category,
		Description:  challenge.Description,
		Authors:      challenge.Authors,
		Tags:         challenge.Tags,
		AuthorTags:   challenge.AuthorTags,
		InstanceType: challenge.InstanceType,
		Hidden:       challenge.Hidden,
		MaxPoints:    challenge.MaxPoints,
		ScoreType:    challenge.ScoreType,
		Host:         challenge.Host,
		Port:         challenge.Port,
		ConnType:     challenge.ConnType,
		HashDomain:   challenge.HashDomain,

		Image:     challenge.Image,
		Compose:   challenge.Compose,
		Lifetime:  challenge.Lifetime,
		Renewable: challenge.Renewable,
		Envs:      challenge.Envs,
		MaxMemory: challenge.MaxMemory,
		MaxCpu:    challenge.MaxCpu,
	}

	chall.Attachments, err = GetChallAttachments(ctx, id)
	if err != nil {
		return nil, err
	}

	chall.Flags, err = GetFlagsByChallenge(ctx, challenge.ID)
	if err != nil {
		return nil, err
	}

	return &chall, nil
}
