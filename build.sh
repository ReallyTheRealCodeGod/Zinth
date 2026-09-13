#!/usr/bin/env bash
# Assembles the single-file app (index.html) and the theory self-test page (tests/check.html) from src/.
set -euo pipefail
cd "$(dirname "$0")"

FONTS='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">'

{
  echo '<title>Zinth</title>'
  echo "$FONTS"
  echo '<style>'; cat src/styles.css; echo '</style>'
  cat src/markup.html
  for f in theory demos engine ui-core ui-panels ui-op; do
    echo '<script>'; cat "src/$f.js"; echo '</script>'
  done
} > index.html

mkdir -p tests
{
  echo '<title>Zinth theory check</title>'
  echo "$FONTS"
  echo '<script>'; cat src/theory.js; echo '</script>'
  echo '<script>'; cat src/engine.js; echo '</script>'
  echo '<script>'; cat src/demos.js; echo '</script>'
  echo '<script>'; cat tests/check.js; echo '</script>'
} > tests/check.html

echo "built index.html ($(wc -c < index.html) bytes) and tests/check.html"
