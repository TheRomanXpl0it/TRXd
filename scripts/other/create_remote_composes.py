#!/usr/bin/env python3

import argparse
import copy
import sys
from pathlib import Path
from typing import Any

import yaml


REMOTE_COMPOSE_NAME = "compose.remote.yml"


class RemoteComposeError(Exception):
    pass


class LiteralDumper(yaml.SafeDumper):
    pass


def _yaml_multiline_str(dumper: yaml.SafeDumper, value: str) -> yaml.ScalarNode:
    style = "|" if value and "\n" in value else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", value, style=style)


LiteralDumper.add_representer(str, _yaml_multiline_str)
LiteralDumper.ignore_aliases = lambda *args: True  # type: ignore[assignment]


def load_yaml(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle)
    except yaml.YAMLError as exc:
        raise RemoteComposeError(f"invalid YAML in {path}: {exc}") from exc


def dump_yaml(data: Any) -> str:
    return yaml.dump(
        data,
        Dumper=LiteralDumper,
        sort_keys=False,
        allow_unicode=False,
        default_flow_style=False,
        width=1000,
    )


def parse_int(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0

    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "y", "on"}


def parse_port_number(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value

    text = str(value).strip()
    if not text:
        return None
    if "/" in text:
        text, protocol = text.rsplit("/", 1)
        if protocol.lower() != "tcp":
            return None
    if ":" in text:
        text = text.rsplit(":", 1)[1]
    if "-" in text:
        text = text.split("-", 1)[0]

    return parse_int(text)


def extract_internal_ports(service: dict[str, Any]) -> list[int]:
    ports: list[int] = []

    for entry in service.get("ports") or []:
        if isinstance(entry, dict):
            protocol = str(entry.get("protocol", "tcp")).lower()
            if protocol != "tcp":
                continue
            port = parse_port_number(entry.get("target"))
        else:
            port = parse_port_number(entry)
        if port is not None:
            ports.append(port)

    if ports:
        return ports

    for entry in service.get("expose") or []:
        port = parse_port_number(entry)
        if port is not None:
            ports.append(port)

    return ports


def resolve_compose_path(challenge_dir: Path, compose_value: Any) -> Path:
    compose_text = str(compose_value or "").strip()
    if not compose_text:
        raise RemoteComposeError("deployment.compose is empty")

    compose_path = Path(compose_text)
    if not compose_path.is_absolute():
        compose_path = challenge_dir / compose_path
    compose_path = compose_path.resolve()

    if not compose_path.is_file():
        raise RemoteComposeError(f"compose file does not exist: {compose_path}")
    return compose_path


def choose_challenge_service(
    services: dict[str, Any],
    deployment_image: str,
    deployment_port: int | None,
) -> tuple[str, dict[str, Any], list[str]]:
    warnings: list[str] = []
    if not services:
        raise RemoteComposeError("compose file has no services")

    if "chall" in services and isinstance(services["chall"], dict):
        return "chall", services["chall"], warnings

    image_matches = [
        (name, service)
        for name, service in services.items()
        if isinstance(service, dict) and str(service.get("image", "")) == deployment_image
    ]
    if len(image_matches) == 1:
        return image_matches[0][0], image_matches[0][1], warnings

    if len(services) == 1:
        name, service = next(iter(services.items()))
        if not isinstance(service, dict):
            raise RemoteComposeError(f"compose service {name} is not a mapping")
        return name, service, warnings

    port_matches = []
    for name, service in services.items():
        if isinstance(service, dict) and deployment_port in extract_internal_ports(service):
            port_matches.append((name, service))
    if deployment_port is not None and len(port_matches) == 1:
        warnings.append(f"selected service {port_matches[0][0]!r} by deployment port")
        return port_matches[0][0], port_matches[0][1], warnings

    exposed_services = [
        (name, service)
        for name, service in services.items()
        if isinstance(service, dict) and extract_internal_ports(service)
    ]
    if len(exposed_services) == 1:
        warnings.append(f"selected service {exposed_services[0][0]!r} because it is the only exposed service")
        return exposed_services[0][0], exposed_services[0][1], warnings

    service_names = ", ".join(sorted(services))
    raise RemoteComposeError(f"cannot choose challenge service from: {service_names}")


def normalize_service_for_remote(
    service: dict[str, Any],
    deployment_image: str,
    deployment_port: int | None,
    hash_domain: bool,
) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    remote_service = copy.deepcopy(service)

    if "build" in remote_service:
        del remote_service["build"]
        warnings.append("removed build from challenge service")

    remote_service["image"] = deployment_image
    remote_service["container_name"] = "${CONTAINER_NAME}"

    target_port = deployment_port
    if target_port is None:
        ports = extract_internal_ports(remote_service)
        target_port = ports[0] if ports else None

    if target_port is None:
        remote_service.pop("ports", None)
        remote_service.pop("expose", None)
        warnings.append("could not infer a challenge port; removed ports/expose")
    elif hash_domain:
        remote_service.pop("ports", None)
        remote_service["expose"] = [str(target_port)]
    else:
        remote_service["ports"] = [f"${{INSTANCE_PORT}}:{target_port}"]
        remote_service.pop("expose", None)

    return remote_service, warnings


def normalize_sidecar_service(name: str, service: Any) -> tuple[Any, list[str]]:
    warnings: list[str] = []
    if not isinstance(service, dict):
        return copy.deepcopy(service), warnings

    remote_service = copy.deepcopy(service)
    if "build" in remote_service:
        del remote_service["build"]
        if "image" not in remote_service:
            warnings.append(f"sidecar service {name!r} has build but no image")
        else:
            warnings.append(f"removed build from sidecar service {name!r}")
    return remote_service, warnings


def build_remote_compose(deployment_path: Path) -> tuple[Path, str, list[str]]:
    challenge_dir = deployment_path.parent
    deployment = load_yaml(deployment_path)
    if not isinstance(deployment, dict):
        raise RemoteComposeError("deployment.yaml must contain a mapping")

    deployment_config = deployment.get("deployment") or {}
    if not isinstance(deployment_config, dict):
        raise RemoteComposeError("deployment field must contain a mapping")

    if str(deployment.get("instance_type", "")).lower() != "compose":
        raise RemoteComposeError("challenge type is not Compose")

    compose_path = resolve_compose_path(challenge_dir, deployment_config.get("compose"))
    compose_doc = load_yaml(compose_path)
    if not isinstance(compose_doc, dict):
        raise RemoteComposeError("compose file must contain a mapping")

    services = compose_doc.get("services")
    if not isinstance(services, dict):
        raise RemoteComposeError("compose file must contain a services mapping")

    deployment_image = str(deployment_config.get("image") or "").strip()
    if not deployment_image:
        raise RemoteComposeError("deployment.image is empty")

    deployment_port = parse_int(deployment.get("port"))
    hash_domain = parse_bool(deployment_config.get("hash_domain", False))
    service_name, service, warnings = choose_challenge_service(
        services,
        deployment_image,
        deployment_port,
    )

    remote_doc = copy.deepcopy(compose_doc)
    remote_doc.pop("version", None)
    remote_services: dict[str, Any] = {}

    remote_chall, service_warnings = normalize_service_for_remote(
        service,
        deployment_image,
        deployment_port,
        hash_domain,
    )
    warnings.extend(service_warnings)

    for name, sidecar in services.items():
        if name == service_name:
            remote_services[name] = remote_chall
        else:
            remote_sidecar, sidecar_warnings = normalize_sidecar_service(name, sidecar)
            remote_services[name] = remote_sidecar
            warnings.extend(sidecar_warnings)
    remote_doc["services"] = remote_services

    output_path = compose_path.with_name(REMOTE_COMPOSE_NAME)
    return output_path, dump_yaml(remote_doc), warnings


def find_deployments(challenges_path: Path) -> list[Path]:
    return sorted(path for path in challenges_path.rglob("deployment.yaml") if path.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate TRXD instancer-ready compose.remote.yml files from deployment.yaml "
            "and each referenced source compose file."
        )
    )
    parser.add_argument("challenges_path", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="report actions without writing files")
    parser.add_argument(
        "--force",
        action="store_true",
        help=f"overwrite existing {REMOTE_COMPOSE_NAME} files",
    )
    args = parser.parse_args()

    challenges_path = args.challenges_path.resolve()
    if not challenges_path.is_dir():
        print(f"error: not a directory: {challenges_path}", file=sys.stderr)
        return 2

    deployments = find_deployments(challenges_path)
    if not deployments:
        print(f"error: no deployment.yaml files found under {challenges_path}", file=sys.stderr)
        return 2

    created = 0
    skipped = 0
    failed = 0

    for deployment_path in deployments:
        rel = deployment_path.relative_to(challenges_path)
        try:
            output_path, yaml_text, warnings = build_remote_compose(deployment_path)
            if output_path.exists() and not args.force:
                print(f"skip {rel}: {output_path.name} already exists")
                skipped += 1
                continue

            action = "would write" if args.dry_run else "write"
            print(f"{action} {output_path}")
            for warning in warnings:
                print(f"  warning: {warning}")

            if not args.dry_run:
                output_path.write_text(yaml_text, encoding="utf-8")
            created += 1
        except RemoteComposeError as exc:
            print(f"skip {rel}: {exc}")
            skipped += 1
        except OSError as exc:
            print(f"error {rel}: {exc}", file=sys.stderr)
            failed += 1

    print(f"done: {created} generated, {skipped} skipped, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
