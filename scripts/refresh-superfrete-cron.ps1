$ErrorActionPreference = "Stop"

$envPath = Join-Path (Get-Location) ".env.local"
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [Environment]::GetEnvironmentVariable($key)) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

$token = $env:SUPERFRETE_REFRESH_SECRET
if (-not $token) {
  throw "Missing SUPERFRETE_REFRESH_SECRET in .env.local"
}

$url = "http://localhost:3000/api/superfrete/refresh-cron"

while ($true) {
  try {
    Invoke-RestMethod -Method Post -Uri $url -Headers @{ "x-refresh-token" = $token } -ContentType "application/json" -Body "{}" | Out-String | Write-Output
  } catch {
    $_.Exception.Message | Write-Output
  }
  Start-Sleep -Seconds 5
}
