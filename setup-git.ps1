$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

$targetDir = "C:\Users\user\AppData\Local\Programs\Git"
$gitExe = Join-Path $targetDir "cmd\git.exe"

if (Test-Path $gitExe) {
    Write-Output "Git already exists at $gitExe"
    exit 0
}

Write-Output "Checking latest MinGit release from GitHub..."
$url = "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip"
$zipPath = "C:\Users\user\AppData\Local\Temp\MinGit.zip"

Write-Output "Downloading MinGit..."
try {
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
    Write-Output "Extracting to $targetDir..."
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    Write-Output "MinGit successfully installed to $targetDir"
} catch {
    Write-Output "Download failed: $_"
}
