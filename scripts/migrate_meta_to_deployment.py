#!/usr/bin/env python3

import re
import copy
import typer
import yaml
from typing import Any
from pathlib import Path
from dataclasses import dataclass, field

COMPOSE_FILENAMES = (
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
)
DESCRIPTION_FILENAMES = ("desc.md", "description.md")

app = typer.Typer(
    add_completion=False,
    no_args_is_help=True,
    help=(
        "Replace challenge meta.yaml files with deployment.yaml files generated from "
        "scripts/template.yml."
    ),
)


class MigrationError(Exception):
    pass


class LiteralDumper(yaml.SafeDumper):
    pass


def _yaml_multiline_str(dumper: yaml.SafeDumper, value: str) -> yaml.ScalarNode:
    style = "|" if value and "\n" in value else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", value, style=style)


LiteralDumper.add_representer(str, _yaml_multiline_str)
LiteralDumper.ignore_aliases = lambda *args: True  # type: ignore[assignment]


@dataclass
class MigrationResult:
    challenge_dir: Path
    meta_path: Path
    output_path: Path
    yaml_text: str
    compose_path: Path | None = None
    compose_yaml_text: str | None = None
    warnings: list[str] = field(default_factory=list)


def log_info(message: str) -> None:
    typer.secho(message, fg=typer.colors.CYAN)


def log_success(message: str) -> None:
    typer.secho(message, fg=typer.colors.GREEN)


def log_warning(message: str) -> None:
    typer.secho(f"warning: {message}", fg=typer.colors.YELLOW)


def log_error(message: str) -> None:
    typer.secho(f"error: {message}", fg=typer.colors.RED, err=True)


def load_yaml(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle)
    except yaml.YAMLError as exc:
        raise MigrationError(f"invalid YAML in {path}: {exc}") from exc


def dump_yaml(data: Any) -> str:
    return yaml.dump(
        data,
        Dumper=LiteralDumper,
        sort_keys=False,
        allow_unicode=False,
        default_flow_style=False,
        width=1000,
    )


def slugify(value: str) -> str:
    text = value.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    text = text.strip("-")
    return text or "challenge"


def imageify(value: str) -> str:
    text = value.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text)
    text = text.strip("_")
    return text or "challenge"


def derive_host_suffix(template: dict[str, Any]) -> str:
    host = str(template.get("host") or "").strip()
    if "." not in host:
        return ""
    return host.split(".", 1)[1]


def build_host(title: str, suffix: str) -> str:
    slug = slugify(title)
    return slug if not suffix else f"{slug}.{suffix.lstrip('.')}"


def find_meta_files(challenges_dir: Path) -> list[Path]:
    return sorted(path for path in challenges_dir.rglob("meta.yaml") if path.is_file())


def make_relative_path(path: Path, base: Path) -> str:
    return f"./{path.relative_to(base).as_posix()}"


def read_description(challenge_dir: Path) -> tuple[str, list[str]]:
    warnings: list[str] = []
    for filename in DESCRIPTION_FILENAMES:
        path = challenge_dir / filename
        if path.is_file():
            return path.read_text(encoding="utf-8").rstrip("\n"), warnings

    warnings.append(
        f"{challenge_dir} has no desc.md or description.md file; using an empty description."
    )
    return "", warnings


def normalize_flags(meta: dict[str, Any], challenge_dir: Path) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []

    if isinstance(meta.get("flags"), list):
        flags = []
        for entry in meta["flags"]:
            if isinstance(entry, dict) and entry.get("flag"):
                flags.append({"flag": str(entry["flag"]), "regex": bool(entry.get("regex", False))})
            elif isinstance(entry, str) and entry:
                flags.append({"flag": entry, "regex": False})
        if not flags:
            warnings.append(f"{challenge_dir} has a flags field but no usable flags were found.")
        return flags, warnings

    flag = meta.get("flag")
    if isinstance(flag, str) and flag:
        return [{"flag": flag, "regex": False}], warnings

    warnings.append(f"{challenge_dir} has no flag in meta.yaml; writing an empty flags list.")
    return [], warnings


def collect_zip_attachments(challenge_dir: Path) -> tuple[list[Path], list[str]]:
    warnings: list[str] = []
    attachments_dir = challenge_dir / "attachments"
    if not attachments_dir.is_dir():
        warnings.append(
            f"{challenge_dir} has no attachments directory; writing an empty attachments list."
        )
        return [], warnings

    attachments = sorted(path for path in attachments_dir.glob("*.zip") if path.is_file())
    if not attachments:
        warnings.append(f"{attachments_dir} contains no .zip files; writing an empty attachments list.")
    return attachments, warnings


def find_compose_file(challenge_dir: Path) -> Path:
    candidates = [
        path
        for name in COMPOSE_FILENAMES
        for path in challenge_dir.rglob(name)
        if path.is_file()
    ]
    if not candidates:
        raise MigrationError(f"no compose file found in {challenge_dir}")
    if len(candidates) > 1:
        compose_paths = ", ".join(
            sorted(path.relative_to(challenge_dir).as_posix() for path in candidates)
        )
        raise MigrationError(
            f"expected exactly one compose file in {challenge_dir}, found: {compose_paths}"
        )
    return candidates[0]


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

    try:
        return int(text)
    except ValueError:
        return None


def extract_internal_ports(service: dict[str, Any]) -> list[int]:
    ports: list[int] = []

    for entry in service.get("ports") or []:
        if isinstance(entry, dict):
            protocol = str(entry.get("protocol", "tcp")).lower()
            if protocol != "tcp":
                continue
            port = parse_port_number(entry.get("target"))
            if port is not None:
                ports.append(port)
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


def choose_service(services: dict[str, Any]) -> tuple[str, dict[str, Any], list[str]]:
    warnings: list[str] = []
    if not services:
        raise MigrationError("compose file has no services section")

    if "chall" in services and isinstance(services["chall"], dict):
        return "chall", services["chall"], warnings

    if len(services) == 1:
        name, service = next(iter(services.items()))
        if not isinstance(service, dict):
            raise MigrationError(f"compose service {name} is not a mapping")
        return name, service, warnings

    services_with_ports = []
    for name, service in services.items():
        if isinstance(service, dict) and extract_internal_ports(service):
            services_with_ports.append((name, service))

    if len(services_with_ports) == 1:
        name, service = services_with_ports[0]
        warnings.append(f"Selected service '{name}' because it is the only one exposing a port.")
        return name, service, warnings

    name = sorted(services.keys())[0]
    service = services[name]
    if not isinstance(service, dict):
        raise MigrationError(f"compose service {name} is not a mapping")
    warnings.append(
        f"Multiple compose services found ({', '.join(sorted(services))}); using '{name}'."
    )
    return name, service, warnings


def set_service_image(service: dict[str, Any], image: str) -> None:
    if "image" in service:
        service["image"] = image
        return

    if "build" not in service:
        service["image"] = image
        return

    updated: dict[str, Any] = {}
    for key, value in service.items():
        updated[key] = value
        if key == "build":
            updated["image"] = image

    service.clear()
    service.update(updated)


def ensure_compose_images(
    services: dict[str, Any],
    category: str,
    challenge_name: str,
    compose_path: Path,
) -> tuple[bool, list[str]]:
    warnings: list[str] = []
    changed = False
    base_image = f"{imageify(category)}_{imageify(challenge_name)}"
    multiple_services = len(services) > 1

    for service_name, service in services.items():
        if not isinstance(service, dict):
            raise MigrationError(f"compose service {service_name} is not a mapping")
        if service.get("image") or not service.get("build"):
            continue

        image = base_image if not multiple_services else f"{base_image}_{imageify(service_name)}"
        set_service_image(service, image)
        changed = True
        warnings.append(
            f"Service '{service_name}' in {compose_path} has no image field; "
            f"will set image='{image}' in the compose file."
        )

    return changed, warnings


def build_output_data(
    template: dict[str, Any],
    meta: dict[str, Any],
    challenge_dir: Path,
    host_suffix: str,
) -> tuple[dict[str, Any], list[str], str | None, Path | None]:
    warnings: list[str] = []

    raw_title = meta.get("title") or meta.get("name")
    title = str(raw_title or challenge_dir.name)
    if raw_title is None:
        warnings.append(f"{challenge_dir} has no title/name in meta.yaml; using '{title}'.")

    raw_category = meta.get("category")
    category = str(raw_category or challenge_dir.parent.name)
    if raw_category is None:
        warnings.append(f"{challenge_dir} has no category in meta.yaml; using '{category}'.")

    description, description_warnings = read_description(challenge_dir)
    warnings.extend(description_warnings)

    authors = [str(author) for author in (meta.get("authors") or [])]
    if not authors:
        warnings.append(f"{challenge_dir} has no authors in meta.yaml; writing an empty authors list.")

    flags, flag_warnings = normalize_flags(meta, challenge_dir)
    warnings.extend(flag_warnings)

    attachment_paths, attachment_warnings = collect_zip_attachments(challenge_dir)
    warnings.extend(attachment_warnings)
    attachments = [make_relative_path(path, challenge_dir) for path in attachment_paths]

    deployment = copy.deepcopy(template.get("deployment") or {})
    if not isinstance(deployment, dict):
        deployment = {}
    deployment["envs"] = "{}"

    compose_path: Path | None = None
    compose_yaml_text: str | None = None
    image = ""
    port: int | str = ""
    host = build_host(title, host_suffix)

    try:
        compose_path = find_compose_file(challenge_dir)
    except MigrationError as exc:
        if str(exc) != f"no compose file found in {challenge_dir}":
            raise
        warnings.append(
            f"{challenge_dir} has no compose file; leaving deployment.image/deployment.compose/host/port empty."
        )
        host = ""
    else:
        compose_doc = load_yaml(compose_path) or {}
        if not isinstance(compose_doc, dict):
            raise MigrationError(f"compose file {compose_path} must contain a mapping")

        services = compose_doc.get("services") or {}
        if not isinstance(services, dict):
            raise MigrationError(f"compose file {compose_path} has an invalid services section")

        compose_changed, compose_warnings = ensure_compose_images(services, category, title, compose_path)
        warnings.extend(compose_warnings)

        service_name, service, service_warnings = choose_service(services)
        warnings.extend(service_warnings)

        internal_ports = extract_internal_ports(service)
        if not internal_ports:
            raise MigrationError(
                f"could not find any TCP port in service '{service_name}' from {compose_path}"
            )

        port = internal_ports[0]
        if len(internal_ports) > 1:
            warnings.append(
                f"Service '{service_name}' exposes multiple TCP ports {internal_ports}; using {port}."
            )

        image = str(service.get("image") or "")
        if not image:
            warnings.append(
                f"Service '{service_name}' in {compose_path} has no image field; deployment.image was left empty."
            )

        deployment["compose"] = make_relative_path(compose_path, challenge_dir)
        compose_yaml_text = dump_yaml(compose_doc) if compose_changed else None

    deployment["image"] = image
    deployment["compose"] = make_relative_path(compose_path, challenge_dir) if compose_path else ""

    output = copy.deepcopy(template)
    output["name"] = title
    output["category"] = category
    output["description"] = description
    output["authors"] = authors
    output["type"] = "Compose"
    output["score_type"] = "Dynamic"
    output["host"] = host
    output["port"] = port
    output["conn_type"] = "TCP"
    output["tags"] = []
    output["deployment"] = deployment
    output["flags"] = flags
    output["attachments"] = attachments
    return output, warnings, compose_yaml_text, compose_path


def process_meta(
    meta_path: Path,
    template: dict[str, Any],
    output_name: str,
    host_suffix: str,
) -> MigrationResult:
    meta = load_yaml(meta_path) or {}
    if not isinstance(meta, dict):
        raise MigrationError(f"meta file {meta_path} must contain a mapping")

    challenge_dir = meta_path.parent
    output_path = challenge_dir / output_name
    output_data, warnings, compose_yaml_text, compose_path = build_output_data(
        template, meta, challenge_dir, host_suffix
    )
    return MigrationResult(
        challenge_dir=challenge_dir,
        meta_path=meta_path,
        output_path=output_path,
        yaml_text=dump_yaml(output_data),
        compose_path=compose_path if compose_yaml_text is not None else None,
        compose_yaml_text=compose_yaml_text,
        warnings=warnings,
    )


def write_result(result: MigrationResult, force: bool) -> None:
    if result.output_path.exists() and not force:
        raise MigrationError(f"{result.output_path} already exists. Re-run with --force to overwrite it.")

    if result.compose_path is not None and result.compose_yaml_text is not None:
        result.compose_path.write_text(result.compose_yaml_text, encoding="utf-8")
    result.output_path.write_text(result.yaml_text, encoding="utf-8")


@app.command()
def cli(
    challenges_dir: Path = typer.Argument(..., help="Root directory containing challenge folders."),
    template: Path = typer.Option(
        Path(__file__).resolve().parent / "template.yml",
        help="Template YAML used as the output base.",
    ),
    output_name: str = typer.Option(
        "deployment.yaml",
        help="Name of the generated file inside each challenge directory.",
    ),
    host_suffix: str | None = typer.Option(
        "ctf.theromanxpl0.it",
        help="Host suffix appended to the slugified challenge title.",
    ),
    apply: bool = typer.Option(
        False,
        "--apply",
        help="Write deployment.yaml and update the compose file if needed. meta.yaml is kept.",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite deployment.yaml if it already exists.",
    ),
    show_content: bool = typer.Option(
        False,
        "--show-content",
        help="Print the generated YAML content for each challenge.",
    ),
) -> None:
    challenges_dir = challenges_dir.resolve()
    template_path = template.resolve()

    if not challenges_dir.is_dir():
        log_error(f"Challenges directory not found: {challenges_dir}")
        raise typer.Exit(code=1)
    if not template_path.is_file():
        log_error(f"Template file not found: {template_path}")
        raise typer.Exit(code=1)

    template_data = load_yaml(template_path) or {}
    if not isinstance(template_data, dict):
        log_error(f"Template file must contain a YAML mapping: {template_path}")
        raise typer.Exit(code=1)

    effective_host_suffix = host_suffix if host_suffix is not None else derive_host_suffix(template_data)
    meta_files = find_meta_files(challenges_dir)
    if not meta_files:
        log_error(f"No meta.yaml files found under {challenges_dir}")
        raise typer.Exit(code=1)

    processed = 0
    failed = 0

    for meta_path in meta_files:
        try:
            result = process_meta(meta_path, template_data, output_name, effective_host_suffix)
            if result.output_path.exists() and not apply:
                log_warning(f"{result.output_path} already exists; dry-run will not overwrite it.")

            action = "Writing" if apply else "Would write"
            log_info(f"{action} {result.output_path} from {result.meta_path}")
            for warning in result.warnings:
                log_warning(warning)

            if show_content:
                typer.echo(result.yaml_text.rstrip())
                typer.echo()

            if apply:
                write_result(result, force=force)
                if result.compose_path is not None:
                    log_success(f"updated compose: {result.compose_path}")
                log_success(f"wrote: {result.output_path}")

            processed += 1
        except MigrationError as exc:
            failed += 1
            log_error(f"Failed for {meta_path}: {exc}")

    summary = f"Processed {processed} challenge(s)"
    if failed:
        summary += f", {failed} failed"
        log_warning(summary)
        raise typer.Exit(code=1)

    log_success(summary)


if __name__ == "__main__":
    app()
