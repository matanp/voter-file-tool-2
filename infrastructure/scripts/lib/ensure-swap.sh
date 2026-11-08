#!/bin/bash
# Sourced by 01-install-dependencies.sh. Never resize or overwrite an existing swap file.
ensure_swap() (
  set -e
  local minimum_mb="$1" swapfile="$2" fstab="$3"
  local current_mb active_swap candidate suffix add_mb
  [ -r "$fstab" ] || { echo "❌ Cannot read $fstab" >&2; exit 1; }
  current_mb=$(free -m | awk '/^Swap:/ {print $2}')
  case "$current_mb" in
    ''|*[!0-9]*) echo "❌ Could not determine current swap size." >&2; exit 1 ;;
  esac
  active_swap=$(sudo swapon --show=NAME --noheadings --raw)

  if [ "$current_mb" -lt "$minimum_mb" ]; then
    candidate="$swapfile"
    suffix=0
    while [ -e "$candidate" ] || [ -L "$candidate" ] || printf '%s\n' "$active_swap" | grep -Fxq "$candidate"; do
      suffix=$((suffix + 1))
      candidate="${swapfile}-voter-file-tool-$suffix"
    done
    # mkswap reserves a header page; round up so usable swap reaches the minimum.
    add_mb=$((minimum_mb - current_mb + 1))
    echo "💾 Swap is $current_mb MB, adding $add_mb MB at $candidate..."
    sudo fallocate -l "${add_mb}M" "$candidate" || sudo dd if=/dev/zero of="$candidate" bs=1M count="$add_mb"
    sudo chmod 600 "$candidate"
    sudo mkswap "$candidate"
    sudo swapon "$candidate"
    active_swap=$(sudo swapon --show=NAME --noheadings --raw)
  fi

  # Repair persistence even on a retry after swapon succeeded but the fstab write failed.
  while IFS= read -r candidate; do
    case "$candidate" in
      "$swapfile"|"$swapfile"-voter-file-tool-*)
        if ! awk -v swap="$candidate" '$1 == swap && $3 == "swap" { found=1 } END { exit !found }' "$fstab"; then
          printf '%s none swap sw 0 0\n' "$candidate" | sudo tee -a "$fstab" > /dev/null
        fi
        ;;
    esac
  done <<< "$active_swap"

  current_mb=$(free -m | awk '/^Swap:/ {print $2}')
  if [ "$current_mb" -lt "$minimum_mb" ]; then
    echo "❌ Expected at least $minimum_mb MB of swap, found $current_mb MB." >&2
    exit 1
  fi
  echo "💾 Swap: $current_mb MB"
)
