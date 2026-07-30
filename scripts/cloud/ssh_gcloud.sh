#!/usr/bin/env bash
set -euo pipefail

key_path="${1:-$HOME/.ssh/google_compute_engine}"
project="${2:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "$project" || "$project" == "(unset)" ]]; then
  echo "No GCP project set."
  echo "Usage: $0 [private-key-path] [project]"
  exit 1
fi

if [[ ! -f "$key_path" ]]; then
  echo "Private key not found: $key_path"
  exit 1
fi

start_agent_if_needed() {
  if [[ -z "${SSH_AUTH_SOCK:-}" || ! -S "${SSH_AUTH_SOCK}" ]]; then
    eval "$(ssh-agent -s)" >/dev/null
    return
  fi

  if ! ssh-add -l >/dev/null 2>&1; then
    eval "$(ssh-agent -s)" >/dev/null
  fi
}

start_agent_if_needed
ssh-add "$key_path"

mapfile -t instances < <(
  gcloud compute instances list \
    --project "$project" \
    --filter='status=RUNNING' \
    --format='value(name,zone.basename())'
)

if [[ ${#instances[@]} -eq 0 ]]; then
  echo "No running Compute Engine instances found in project: $project"
  exit 1
fi

echo "Running instances in project: $project"
for i in "${!instances[@]}"; do
  IFS=$'\t' read -r name zone <<< "${instances[$i]}"
  printf '%d) %s (%s)\n' "$((i + 1))" "$name" "$zone"
done

read -rp "Pick a machine number: " choice

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#instances[@]} )); then
  echo "Invalid selection"
  exit 1
fi

IFS=$'\t' read -r name zone <<< "${instances[$((choice - 1))]}"

exec gcloud compute ssh "$name" --zone "$zone" --project "$project"
