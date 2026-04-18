package challenges_get

import (
	"context"
	"database/sql"
	"trxd/db"
	"trxd/db/sqlc"
)

type DockerConfig struct {
	Image      string  `json:"image"`
	Compose    string  `json:"compose"`
	HashDomain *bool   `json:"hash_domain"`
	Lifetime   *int    `json:"lifetime"`
	Renewable  *bool   `json:"renewable"`
	Envs       *string `json:"envs"`
	MaxMemory  *int    `json:"max_memory"`
	MaxCpu     *string `json:"max_cpu"`
}

type Chall struct {
	SolvesList  []sqlc.GetChallengeSolvesRow `json:"solves_list"`
	Attachments []string                     `json:"attachments"`

	Type         *sqlc.DeployType               `json:"type,omitempty"`
	Flags        *[]sqlc.GetFlagsByChallengeRow `json:"flags,omitempty"`
	DockerConfig *DockerConfig                  `json:"docker_config,omitempty"`
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

func GetChallAttachments(ctx context.Context, challengeID int32) ([]string, error) {
	attachments, err := db.Sql.GetChallAttachments(ctx, challengeID)
	if err != nil {
		if err == sql.ErrNoRows {
			return []string{}, nil
		}
		return nil, err
	}

	if attachments == nil {
		attachments = []string{}
	}

	return attachments, nil
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

	chall.Attachments, err = GetChallAttachments(ctx, id)
	if err != nil {
		return nil, err
	}

	if !author { // Not Author
		return &chall, nil
	}

	flags, err := GetFlagsByChallenge(ctx, challenge.ID)
	if err != nil {
		return nil, err
	}

	chall.Type = &challenge.Type
	chall.Flags = &[]sqlc.GetFlagsByChallengeRow{}
	if flags != nil {
		chall.Flags = &flags
	}

	dockerConfig, err := db.Sql.GetChallDockerConfig(ctx, challenge.ID)
	if err != nil {
		if err == sql.ErrNoRows {
			return &chall, nil
		}
		return nil, err
	}

	chall.DockerConfig = &DockerConfig{
		Image:      dockerConfig.Image,
		Compose:    dockerConfig.Compose,
		HashDomain: &dockerConfig.HashDomain,
		Lifetime:   new(int(dockerConfig.Lifetime)),
		Envs:       &dockerConfig.Envs,
		MaxMemory:  new(int(dockerConfig.MaxMemory)),
		MaxCpu:     &dockerConfig.MaxCpu,
		Renewable:  &dockerConfig.Renewable,
	}

	return &chall, nil
}
