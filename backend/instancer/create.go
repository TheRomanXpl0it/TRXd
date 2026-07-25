package instancer

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
	"trxd/db/sqlc"
	"trxd/instancer/composes"
	"trxd/instancer/containers"
	"trxd/instancer/infos"

	"trxd/utils/consts"
	"trxd/utils/log"
)

type CreateInstanceParams struct {
	Tid          int32
	ChallID      int32
	ConnType     sqlc.ConnType
	InternalPort *int32
	InstanceType sqlc.InstanceType
	HashDomain   bool

	Image     string
	Compose   string
	Lifetime  int32
	Envs      string
	MaxMemory int32
	MaxCpu    string
}

type CreateInstanceResult struct {
	Host       string
	Port       *int32
	Expiration time.Time
}

func recoverBrokenInstance(ctx context.Context, tid int32, challID int32, dockerID string) {
	err := DeleteInstance(ctx, tid, challID, sql.NullString{String: dockerID, Valid: dockerID != ""})
	if err == nil {
		return
	}
	log.Error("Failed to cleanup instance after creation failure", "team", tid, "challenge", challID, "err", err)

	err = UpdateInstanceExpire(ctx, tid, challID, time.Now().Add(-1*time.Second))
	if err == nil {
		return
	}

	log.Error("Failed to expire instance after creation failure", "team", tid, "challenge", challID, "err", err)
}

func makeLabels(info *infos.InstanceInfo, p *CreateInstanceParams) {
	if !p.HashDomain {
		return
	}

	routersRule := "traefik.%s.routers.%s.rule"
	routersEntrypoints := "traefik.%s.routers.%s.entrypoints"
	routersTls := "traefik.%s.routers.%s.tls"
	routersPriotity := "traefik.%s.routers.%s.priority"
	loadbalancerPort := "traefik.%s.services.%s.loadbalancer.server.port"

	var protocol, rule, entrypoint string
	if p.ConnType == sqlc.ConnTypeTCP {
		protocol = "tcp"
		rule = "HostSNI(`%s`)"
		entrypoint = "tcp"
	} else { // so http is (HTTP, HTTPS)
		protocol = "http"
		rule = "Host(`%s`)"
		entrypoint = "web"
	}

	traefikPort := "1337"
	if p.InternalPort != nil {
		traefikPort = fmt.Sprint(*p.InternalPort)
	}

	traefikRoutersRule := fmt.Sprintf(routersRule, protocol, info.Name)
	traefikRoutersEntrypoints := fmt.Sprintf(routersEntrypoints, protocol, info.Name)
	traefikRoutersPriority := fmt.Sprintf(routersPriotity, protocol, info.Name)
	traefikLoadbalancerPort := fmt.Sprintf(loadbalancerPort, protocol, info.Name)
	traefikRoutersTls := fmt.Sprintf(routersTls, protocol, info.Name)

	info.Labels = map[string]string{
		"traefik.enable":          "true",
		"traefik.docker.network":  consts.NetworkInternal,
		traefikRoutersRule:        fmt.Sprintf(rule, info.Domain),
		traefikRoutersEntrypoints: entrypoint,
		traefikRoutersPriority:    "10",
		traefikLoadbalancerPort:   traefikPort,
	}

	if protocol == "tcp" {
		info.Labels[traefikRoutersTls] = "true"
	}
}

func spawnInstance(ctx context.Context, info *infos.InstanceInfo, instanceType sqlc.InstanceType, image string, compose string) (string, error) {

	var dockerID string
	var err error

	if info.UseDomain {
		info.NetID = "trxd-shared-internal"
	} else if instanceType == sqlc.InstanceTypeContainer {
		info.NetID = "trxd-shared-external"
	}

	if instanceType == sqlc.InstanceTypeContainer && image != "" {
		dockerID, err = containers.CreateContainer(ctx, info, image)
	} else if instanceType == sqlc.InstanceTypeCompose && compose != "" {
		dockerID, err = composes.CreateCompose(ctx, info, compose)
	} else {
		return "", errors.New("[no image or compose]")
	}
	if err != nil {
		return dockerID, err
	}

	return dockerID, nil
}

func CreateInstance(ctx context.Context, p *CreateInstanceParams) (*CreateInstanceResult, error) {
	var dockerID string
	cleanup := true

	defer func() {
		r := recover()
		if r == nil && !cleanup {
			return
		}
		if r != nil {
			log.Critical("Recovered instancer create panic", "crit", r)
		}

		recoverBrokenInstance(ctx, p.Tid, p.ChallID, dockerID)
	}()

	log.Info("Creating instance:", "chall", p.ChallID, "team", p.Tid)

	lifetime := time.Second * time.Duration(p.Lifetime)
	expires_at := time.Now().Add(lifetime)

	creationInfo, err := dbCreateInstance(ctx, p.Tid, p.ChallID, expires_at, p.HashDomain)
	if err != nil {
		return nil, err
	}
	if creationInfo == nil {
		cleanup = false
		return nil, errors.New("[race condition]")
	}

	instanceInfo := &infos.InstanceInfo{
		Name:         fmt.Sprintf("chall_%d_%d", p.ChallID, p.Tid),
		Domain:       creationInfo.Host,
		UseDomain:    p.HashDomain,
		InternalPort: p.InternalPort,
		Envs:         p.Envs,
		MaxMemory:    p.MaxMemory,
		MaxCpu:       p.MaxCpu,
	}

	if creationInfo.Port.Valid {
		instanceInfo.ExternalPort = &creationInfo.Port.Int32
	}

	makeLabels(instanceInfo, p)

	dockerID, err = spawnInstance(ctx, instanceInfo, p.InstanceType, p.Image, p.Compose)
	if err != nil {
		return nil, err
	}

	err = dbUpdateInstanceDockerID(ctx, p.Tid, p.ChallID, dockerID)
	if err != nil {
		return nil, err
	}

	cleanup = false

	return &CreateInstanceResult{
		Host:       instanceInfo.Domain,
		Port:       instanceInfo.ExternalPort,
		Expiration: expires_at,
	}, nil
}
