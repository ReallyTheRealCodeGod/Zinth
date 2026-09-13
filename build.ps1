# Assembles the single-file app (index.html) and the theory self-test page (tests/check.html) from src/.
Set-Location $PSScriptRoot
$fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$parts = @('<title>Zinth</title>', $fonts, '<style>', (Get-Content src/styles.css -Raw), '</style>', (Get-Content src/markup.html -Raw))
foreach ($f in 'theory','demos','engine','ui-core','ui-panels','ui-op') { $parts += '<script>'; $parts += (Get-Content "src/$f.js" -Raw); $parts += '</script>' }
[IO.File]::WriteAllText("$PSScriptRoot/index.html", ($parts -join "`n"), $utf8)

New-Item -ItemType Directory -Force tests | Out-Null
$check = @('<title>Zinth theory check</title>', $fonts)
foreach ($f in 'src/theory.js','src/engine.js','src/demos.js','tests/check.js') { $check += '<script>'; $check += (Get-Content $f -Raw); $check += '</script>' }
[IO.File]::WriteAllText("$PSScriptRoot/tests/check.html", ($check -join "`n"), $utf8)

Write-Output "built index.html and tests/check.html"
