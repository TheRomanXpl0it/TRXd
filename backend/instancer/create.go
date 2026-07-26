package instancer

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"trxd/db/sqlc"
	"trxd/instancer/composes"
	"trxd/instancer/containers"
	"trxd/instancer/infos"
	"trxd/instancer/instancer_errors"

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

const (
	loadbalancerPort   = "traefik.%s.services.%s.loadbalancer.server.port"
	routersRule        = "traefik.%s.routers.%s.rule"
	routersPriotity    = "traefik.%s.routers.%s.priority"
	routersEntrypoints = "traefik.%s.routers.%s.entrypoints"
	routersTls         = "traefik.%s.routers.%s.tls"
)

func makeTraefikLabels(name string, domain string, connType sqlc.ConnType, hashDomain bool, internalPort *int32) map[string]string {
	if !hashDomain {
		return nil
	}

	var protocol, rule, entrypoint string
	switch connType {
	case sqlc.ConnTypeHTTP:
		protocol = "http"
		rule = "Host(`%s`)"
		entrypoint = "web"
	case sqlc.ConnTypeHTTPS:
		protocol = "http"
		rule = "Host(`%s`)"
		entrypoint = "websecure"
	default:
		protocol = "tcp"
		rule = "HostSNI(`%s`)"
		entrypoint = "tcp"
	}

	traefikPort := "1337"
	if internalPort != nil {
		traefikPort = fmt.Sprint(*internalPort)
	}

	labels := map[string]string{
		"traefik.enable":                                "true",
		"traefik.docker.network":                        consts.NetworkInternal,
		fmt.Sprintf(loadbalancerPort, protocol, name):   traefikPort,
		fmt.Sprintf(routersRule, protocol, name):        fmt.Sprintf(rule, domain),
		fmt.Sprintf(routersPriotity, protocol, name):    "10",
		fmt.Sprintf(routersEntrypoints, protocol, name): entrypoint,
	}

	if entrypoint == "tcp" || entrypoint == "websecure" {
		labels[fmt.Sprintf(routersTls, protocol, name)] = "true"
	}

	return labels
}

func spawnInstance(ctx context.Context, info *infos.InstanceInfo, instanceType sqlc.InstanceType, image string, compose string) (string, error) {

	var dockerID string
	var err error

	if info.UseDomain {
		info.NetID = "trxd-shared-internal"
	} else if instanceType == sqlc.InstanceTypeContainer {
		info.NetID = "trxd-shared-external"
	}

	switch instanceType {
	case sqlc.InstanceTypeContainer:
		dockerID, err = containers.CreateContainer(ctx, info, image)
	case sqlc.InstanceTypeCompose:
		dockerID, err = composes.CreateCompose(ctx, info, compose)
	default:
		err = instancer_errors.NewInvalidInstanceError("invalid instance type")
	}
	if err != nil {
		return dockerID, err
	}

	return dockerID, nil
}

func CreateInstance(ctx context.Context, params *CreateInstanceParams) (*CreateInstanceResult, error) {
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

		recoverBrokenInstance(ctx, params.Tid, params.ChallID, dockerID)
	}()

	log.Info("Creating instance:", "chall", params.ChallID, "team", params.Tid)

	lifetime := time.Second * time.Duration(params.Lifetime)
	expires_at := time.Now().Add(lifetime)

	creationInfo, err := dbCreateInstance(ctx, params.Tid, params.ChallID, expires_at, params.HashDomain)
	if err != nil {
		return nil, err
	}
	if creationInfo == nil {
		cleanup = false
		return nil, instancer_errors.NewRaceConditionError()
	}

	instanceInfo := &infos.InstanceInfo{
		Name:         fmt.Sprintf("chall_%d_%d", params.ChallID, params.Tid),
		Domain:       creationInfo.Host,
		UseDomain:    params.HashDomain,
		InternalPort: params.InternalPort,
		Envs:         params.Envs,
		MaxMemory:    params.MaxMemory,
		MaxCpu:       params.MaxCpu,
	}

	if creationInfo.Port.Valid {
		instanceInfo.ExternalPort = &creationInfo.Port.Int32
	}

	instanceInfo.Labels = makeTraefikLabels(instanceInfo.Name, instanceInfo.Domain, params.ConnType, params.HashDomain, params.InternalPort)

	dockerID, err = spawnInstance(ctx, instanceInfo, params.InstanceType, params.Image, params.Compose)
	if err != nil {
		return nil, err
	}

	err = dbUpdateInstanceDockerID(ctx, params.Tid, params.ChallID, dockerID)
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
