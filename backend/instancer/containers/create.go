package containers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"strconv"
	"strings"
	"trxd/db"
	"trxd/instancer/infos"

	"trxd/utils/log"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/go-connections/nat"
)

func CreateContainer(ctx context.Context, info *infos.InstanceInfo, image string) (string, error) {
	if info.ExternalPort != nil && info.InternalPort == nil {
		return "", errors.New("[missing internal port]")
	}

	if Cli == nil {
		return "", nil
	}

	containerInfo, err := infos.SetupContainerInfo(info, image)
	if err != nil {
		return "", err
	}

	containerConf, hostConf, networkingConfig, err := setupContainerConf(containerInfo)
	if err != nil {
		return "", err
	}

	if log.GetLevel() == log.DebugLevel {
		debugContainer(containerConf, hostConf, networkingConfig)
	}

	err = ensureImage(ctx, containerInfo.Image)
	if err != nil {
		return "", err
	}

	var containerID string
	resp, err := Cli.ContainerCreate(ctx, containerConf, hostConf, networkingConfig, nil, containerInfo.Name)
	if err == nil {
		containerID = resp.ID
	} else {
		if !strings.Contains(err.Error(), "is already in use") {
			return "", err
		}

		containerID, err = FetchContainerByName(ctx, containerInfo.Name)
		if err != nil {
			return "", err
		}

		if info.NetID != "" {
			err = Cli.NetworkConnect(ctx, info.NetID, containerID, nil)
			if err != nil {
				if !strings.Contains(err.Error(), "already exists in network") {
					return "", err
				}
			}
		}
	}

	err = Cli.ContainerStart(ctx, containerID, container.StartOptions{})
	if err != nil {
		return "", err
	}

	return containerID, nil
}

func ensureImage(ctx context.Context, img string) error {
	_, err := Cli.ImageInspect(ctx, img)
	if err == nil {
		return nil
	}

	if !strings.Contains(err.Error(), "No such image") {
		return err
	}

	log.Debug("Pulling image:", "image", img)

	registryAuth, err := genRegistryAuth(ctx)
	if err != nil {
		return err
	}

	reader, err := Cli.ImagePull(ctx, img, image.PullOptions{
		RegistryAuth: registryAuth,
	})
	if err != nil {
		return err
	}
	defer func() {
		err := reader.Close()
		if err != nil {
			log.Error("Failed to close image pull reader:", "err", err)
		}
	}()

	// Discard the output of the pull operation to avoid blocking or corruption
	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return err
	}

	return nil
}

func genRegistryAuth(ctx context.Context) (string, error) {
	server, err := db.GetConfig(ctx, "registry-server")
	if err != nil {
		return "", err
	}

	username, err := db.GetConfig(ctx, "registry-username")
	if err != nil {
		return "", err
	}

	password, err := db.GetConfig(ctx, "registry-password")
	if err != nil {
		return "", err
	}

	auth, err := wrapRegistryAuth(server, username, password)
	if err != nil {
		return "", err
	}

	return auth, nil
}

func wrapRegistryAuth(server string, username string, password string) (string, error) {
	authConfig := registry.AuthConfig{
		Username:      username,
		Password:      password,
		ServerAddress: server,
	}

	authJSON, err := json.Marshal(authConfig)
	if err != nil {
		return "", err
	}

	registryAuth := base64.URLEncoding.EncodeToString(authJSON)

	return registryAuth, nil
}

func setupContainerConf(info *infos.ContainerInfo) (*container.Config, *container.HostConfig, *network.NetworkingConfig, error) {
	containerConf := &container.Config{
		Hostname:     info.Name,
		Domainname:   info.Domain,
		Env:          info.Env,
		Image:        info.Image,
		Labels:       info.Labels,
		ExposedPorts: nat.PortSet{},
	}

	hostConf := &container.HostConfig{
		PortBindings: nat.PortMap{},
		RestartPolicy: container.RestartPolicy{
			Name: container.RestartPolicyAlways,
		},
		Resources: container.Resources{
			Memory:   int64(info.MaxMemory) * 1024 * 1024,
			NanoCPUs: info.MaxCPUs,
		},
	}

	networkingConfig := &network.NetworkingConfig{
		EndpointsConfig: map[string]*network.EndpointSettings{
			info.NetID: {},
		},
	}

	if info.ExternalPortStr != "" {
		natPort := nat.Port(strconv.Itoa(int(*info.InternalPort)) + "/tcp")
		containerConf.ExposedPorts[natPort] = struct{}{}
		hostConf.PortBindings[natPort] = []nat.PortBinding{{
			HostIP:   "0.0.0.0",
			HostPort: info.ExternalPortStr,
		}}
	}

	return containerConf, hostConf, networkingConfig, nil
}

func debugContainer(containerConf *container.Config, hostConf *container.HostConfig, networkingConfig *network.NetworkingConfig) {
	tmp1, err1 := json.MarshalIndent(containerConf, "", "  ")
	tmp2, err2 := json.MarshalIndent(hostConf, "", "  ")
	tmp3, err3 := json.MarshalIndent(networkingConfig, "", "  ")
	if err1 != nil || err2 != nil || err3 != nil {
		log.Error("Created container:", "err", err1, "err", err2, "err", err3)
	} else {
		log.Debug("Created container:",
			"container", string(tmp1),
			"host", string(tmp2),
			"network", string(tmp3),
		)
	}
}
