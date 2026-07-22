package composes

import (
	"context"
	"trxd/db"
	"trxd/instancer/containers"

	"github.com/docker/cli/cli/command"
	"github.com/docker/cli/cli/config/types"
	"github.com/docker/cli/cli/flags"
	"github.com/docker/compose/v5/pkg/api"
	"github.com/docker/compose/v5/pkg/compose"
)

var dockerCli *command.DockerCli
var ComposeCli api.Compose

func InitComposeCli() error {
	if containers.Cli == nil {
		return nil
	}

	var err error
	dockerCli, err = command.NewDockerCli(command.WithAPIClient(containers.Cli))
	if err != nil {
		return err
	}

	err = dockerCli.Initialize(&flags.ClientOptions{
		Context:  "default",
		LogLevel: "error",
	})
	if err != nil {
		return err
	}

	ComposeCli, err = compose.NewComposeService(dockerCli)
	if err != nil {
		return err
	}

	return nil
}

func SetRegistryAuth(ctx context.Context) error {
	server, err := db.GetConfig(ctx, "registry-server")
	if err != nil {
		return err
	}

	username, err := db.GetConfig(ctx, "registry-username")
	if err != nil {
		return err
	}

	password, err := db.GetConfig(ctx, "registry-password")
	if err != nil {
		return err
	}

	err = WriteRegistryAuth(server, username, password)
	if err != nil {
		return err
	}

	return nil
}

func WriteRegistryAuth(server string, username string, password string) error {
	if dockerCli == nil {
		return nil
	}

	cfg := dockerCli.ConfigFile()

	if cfg.AuthConfigs == nil {
		cfg.AuthConfigs = make(map[string]types.AuthConfig)
	}

	cfg.AuthConfigs[server] = types.AuthConfig{
		Username:      username,
		Password:      password,
		ServerAddress: server,
	}

	err := cfg.Save()
	if err != nil {
		return err
	}

	return nil
}
