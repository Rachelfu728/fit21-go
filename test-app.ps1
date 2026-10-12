# Verification Test Script for Fit21 PWA
$ErrorActionPreference = "Stop"

Write-Host "--- 1. Check Files ---"
$requiredFiles = @(
    "index.html",
    "styles.css",
    "app.js",
    "manifest.json",
    "sw.js",
    "favicon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable.png",
    "icons/icon.svg"
)

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

foreach ($f in $requiredFiles) {
    $full = Join-Path $baseDir $f
    if (-not (Test-Path $full)) {
        Write-Error "Missing file: $f"
    } else {
        $size = (Get-Item $full).Length
        Write-Host " [OK] $f ($size bytes)"
    }
}

Write-Host "`n--- 2. Validate manifest.json ---"
$manifestPath = Join-Path $baseDir "manifest.json"
$manifestJson = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host " App Name: $($manifestJson.name)"
Write-Host " Short Name: $($manifestJson.short_name)"
Write-Host " Theme Color: $($manifestJson.theme_color)"
Write-Host " Display: $($manifestJson.display)"
Write-Host " Icons Count: $($manifestJson.icons.Count)"
if ($manifestJson.theme_color -ne "#0F6E56") {
    Write-Error "Theme color mismatch"
}

Write-Host "`n--- 3. Validate Design Colors in styles.css ---"
$cssContent = Get-Content (Join-Path $baseDir "styles.css") -Raw -Encoding UTF8
$colors = @("#FBF6EC", "#0F6E56", "#C9A86A")
foreach ($c in $colors) {
    if ($cssContent.Contains($c)) {
        Write-Host " [OK] Color found: $c"
    } else {
        Write-Error "Color missing: $c"
    }
}

Write-Host "`n--- 4. Validate index.html Structure ---"
$indexContent = Get-Content (Join-Path $baseDir "index.html") -Raw -Encoding UTF8
$elemIds = @(
    "screen-home",
    "screen-active",
    "screen-complete",
    "modal-history",
    "modal-settings",
    "modal-confirm",
    "btn-start-now",
    "btn-first-talk",
    "btn-end-session",
    "btn-back-home",
    "val-invites",
    "val-tastings",
    "val-appointments"
)

foreach ($id in $elemIds) {
    if ($indexContent.Contains("id=`"$id`"")) {
        Write-Host " [OK] Element ID found: $id"
    } else {
        Write-Error "Element ID missing: $id"
    }
}

Write-Host "`nAll verification checks PASSED!"
