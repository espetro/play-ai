#!/bin/bash

# Test the play-ai extension against YouTube or Invidious
# Usage: ./scripts/test-extension.sh [--youtube|--invidious] [--headed]

TARGET="youtube"
HEADED=""

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --youtube) TARGET="youtube" ;;
    --invidious) TARGET="invidious" ;;
    --headed) HEADED="--headed" ;;
  esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_OUTPUT="$PROJECT_ROOT/apps/extension/.output/chrome-mv3"
STATE_FILE="$PROJECT_ROOT/scripts/youtube-cookies.json"

# Build the extension if not already built
if [ ! -d "$EXT_OUTPUT" ]; then
  echo "Extension not built. Building now..."
  cd "$PROJECT_ROOT"
  bun run --filter play-ai-extension build
  cd - > /dev/null
fi

if [ ! -d "$EXT_OUTPUT" ]; then
  echo "Error: Extension output directory not found at $EXT_OUTPUT"
  exit 1
fi

echo "Using extension from: $EXT_OUTPUT"
echo "Target: $TARGET"
echo ""

# Construct the agent-browser command based on target
if [ "$TARGET" = "youtube" ]; then
  VIDEO_URL="https://www.youtube.com/watch?v=ypzNhwpmOD4"

  # For YouTube: use --state flag at launch to inject cookies before navigation
  echo "Testing play-ai extension on YouTube (with consent bypass)..."
  echo ""

  agent-browser \
    --extension "$EXT_OUTPUT" \
    --state "$STATE_FILE" \
    $HEADED \
    open "$VIDEO_URL"

  echo ""
  echo "Waiting for page load..."
  sleep 3

  echo "Taking screenshot..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED screenshot

  echo ""
  echo "Checking page state (consent wall, video player)..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED eval 'document.querySelector("ytd-consent-bump-v2-lightbox, tp-yt-paper-dialog") ? "consent wall present" : "consent wall absent"'

  echo ""
  echo "Checking for extension overlay..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED eval 'document.querySelector("#secondary") ? "secondary sidebar found" : "secondary sidebar not found"'

  echo ""
  echo "Snapshot of interactive elements..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED snapshot -i

else
  # Invidious: no cookie bypass needed (different domain, no consent wall)
  VIDEO_URL="https://inv.nadeko.net/watch?v=FDXWH51IJBY"

  echo "Testing play-ai extension on Invidious (alternative video platform)..."
  echo ""

  agent-browser \
    --extension "$EXT_OUTPUT" \
    $HEADED \
    open "$VIDEO_URL"

  echo ""
  echo "Waiting for page load..."
  sleep 3

  echo "Taking screenshot..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED screenshot

  echo ""
  echo "Checking for video player..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED eval 'document.querySelector("video") ? "video player found" : "video player not found"'

  echo ""
  echo "Snapshot of interactive elements..."
  agent-browser --extension "$EXT_OUTPUT" $HEADED snapshot -i
fi

echo ""
echo "Test complete!"
echo ""
echo "Expected results:"
if [ "$TARGET" = "youtube" ]; then
  echo "  ✓ No consent/cookie dialog visible (SOCS cookie injected)"
  echo "  ✓ Video player present"
  echo "  ✓ Secondary sidebar (where extension overlay mounts) present"
else
  echo "  ✓ Video player present"
  echo "  ✓ Extension can interact with page"
fi
