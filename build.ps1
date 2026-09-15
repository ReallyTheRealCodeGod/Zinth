# Assembles the single-file app (index.html) and the theory self-test page (tests/check.html) from src/.
Set-Location $PSScriptRoot
$fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">'
$utf8 = New-Object System.Text.UTF8Encoding($false)
# the sources are UTF-8 without a BOM, which Get-Content -Raw would decode as the system codepage and
# mangle every ♯, · and ⚂ in the build, so read the bytes back through UTF-8 explicitly
function Read-Utf8($p) { [IO.File]::ReadAllText((Join-Path $PSScriptRoot $p), $utf8) }

$parts = @('<title>Zinth</title>', $fonts, '<style>', (Read-Utf8 src/styles.css), '</style>', (Read-Utf8 src/markup.html))
foreach ($f in 'theory','dsp','samples','demos','engine','ui-core','ui-panels','ui-op','midi') { $parts += '<script>'; $parts += (Read-Utf8 "src/$f.js"); $parts += '</script>' }
[IO.File]::WriteAllText("$PSScriptRoot/index.html", ($parts -join "`n"), $utf8)

New-Item -ItemType Directory -Force tests | Out-Null
$check = @('<title>Zinth theory check</title>', $fonts)
foreach ($f in 'src/theory.js','src/engine.js','src/demos.js','tests/check.js') { $check += '<script>'; $check += (Read-Utf8 $f); $check += '</script>' }
[IO.File]::WriteAllText("$PSScriptRoot/tests/check.html", ($check -join "`n"), $utf8)

Write-Output "built index.html and tests/check.html"
