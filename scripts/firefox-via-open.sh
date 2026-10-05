#!/usr/bin/env bash
# Starts Firefox through LaunchServices instead of as a child of the terminal.
# Used as the Firefox binary on macOS, see wxt.config.ts.
#
# macOS keeps other apps out of a browser's data folder. A Firefox started
# directly from a terminal inside VS Code counts as VS Code, so it is denied its
# own profile registry in ~/Library/Application Support/Firefox and stops at a
# "Profile Missing" dialog before the dev runner can connect. Started with
# `open`, it runs as itself.
set -u

profile=""
previous=""
for arg in "$@"; do
  [ "$previous" = "-profile" ] && profile="$arg"
  previous="$arg"
done

# The dev runner stops the browser by signalling this script, and `open` does
# not pass that on, so the instance is found by its unique temporary profile.
stop_firefox() {
  trap '' INT TERM
  [ -n "$profile" ] || return
  local instance="MacOS/firefox .*-profile $profile"
  pkill -f -- "$instance"
  for _ in $(seq 1 50); do
    pgrep -f -- "$instance" >/dev/null || break
    sleep 0.2
  done
  # The dev runner deletes its temporary profile as it exits, which fails while
  # Firefox is still shutting down. A profile the developer chose to keep lives
  # elsewhere and is left alone.
  case "$profile" in
    "${TMPDIR%/}"/firefox-profile*) rm -rf "$profile" ;;
  esac
}
trap stop_firefox EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

open -W -n -a Firefox --args "$@" &
wait $!
