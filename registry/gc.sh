#!/bin/sh

set -e

echo
echo "WARNING: This will run Docker Registry garbage collection."
echo "Make sure the registry is not running or is in read-only mode before proceeding."
echo "Untagged manifests and unreferenced blobs may be permanently deleted."
printf "Continue? [y/N]: "
read answer

case "$answer" in
	[yY]|[yY][eE][sS])
		;;
	*)
		echo "Aborted."
		exit 0
		;;
esac

echo
echo "===== Dry Run ====="
echo
registry garbage-collect --dry-run --delete-untagged /etc/distribution/config.yml
echo
echo "===== Dry Run Complete ====="

echo
printf "Proceed with the actual garbage collection? [y/N]: "
read answer

case "$answer" in
	[yY]|[yY][eE][sS])
		echo
		echo "===== Running Garbage Collection ====="
		echo
		registry garbage-collect --delete-untagged /etc/distribution/config.yml
		echo
		echo "===== Done ====="
		;;
	*)
		echo "Aborted."
		exit 0
		;;
esac
