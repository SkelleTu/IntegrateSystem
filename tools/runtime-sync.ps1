param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [Parameter(Mandatory = $true)]
  [string]$SessionId,

  [int]$IntervalMs = 1000
)

$ErrorActionPreference = "Continue"

$Root = (Resolve-Path $Root).Path
$RuntimeDir = Join-Path $Root "runtime"
$SyncRepo = Join-Path $RuntimeDir ".sync-repo"
$SyncLog = Join-Path $RuntimeDir "runtime-sync.log"
$StatusSource = Join-Path $RuntimeDir "aura-runtime.json"
$EventsSource = Join-Path $RuntimeDir "aura-runtime.jsonl"
$Branch = "runtime-live"
$StartTime = Get-Date
$lastSignature = ""
$lastSourceChange = Get-Date
$shutdownSeenAt = $null

function Write-SyncLog {
  param([string]$Message)

  try {
    New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
    Add-Content -LiteralPath $SyncLog -Value "$(Get-Date -Format o) [runtime-sync] $Message" -Encoding UTF8
  } catch {}
}

function Invoke-Git {
  param([string[]]$Arguments)

  $output = & git @Arguments 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    Write-SyncLog ("git " + ($Arguments -join " ") + " => exit " + $exitCode + ": " + (($output | Out-String).Trim()))
  }

  return @{ ExitCode = $exitCode; Output = $output }
}

function Protect-RemoteText {
  param([string]$Text)

  if ([string]::IsNullOrEmpty($Text)) {
    return $Text
  }

  $sanitized = $Text
  $sanitized = $sanitized -replace '(?i)("?(password|passwd|pwd)"?\s*:\s*)"[^"]*"', '$1"[REDACTED]"'
  $sanitized = $sanitized -replace '(?i)("?(token|access_token|refresh_token|api[_-]?key|secret)"?\s*:\s*)"[^"]*"', '$1"[REDACTED]"'
  $sanitized = $sanitized -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/=-]+', '$1[REDACTED]'
  $sanitized = $sanitized -replace '(?i)("?(authorization)"?\s*:\s*)"[^"]*"', '$1"[REDACTED]"'
  return $sanitized
}

function Ensure-SyncRepo {
  $remoteResult = Invoke-Git @("-C", $Root, "remote", "get-url", "origin")

  if ($remoteResult.ExitCode -ne 0) {
    Write-SyncLog "ERRO: remote origin nao encontrado."
    return $false
  }

  $remote = (($remoteResult.Output | Select-Object -First 1) | Out-String).Trim()

  if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-SyncLog "ERRO: URL do remote origin vazia."
    return $false
  }

  if (-not (Test-Path (Join-Path $SyncRepo ".git"))) {
    New-Item -ItemType Directory -Force -Path $SyncRepo | Out-Null

    $init = Invoke-Git @("-C", $SyncRepo, "init", "-b", $Branch)
    if ($init.ExitCode -ne 0) {
      return $false
    }

    Invoke-Git @("-C", $SyncRepo, "config", "user.name", "Aura Runtime Monitor") | Out-Null
    Invoke-Git @("-C", $SyncRepo, "config", "user.email", "aura-runtime@users.noreply.github.com") | Out-Null

    $addRemote = Invoke-Git @("-C", $SyncRepo, "remote", "add", "origin", $remote)
    if ($addRemote.ExitCode -ne 0) {
      return $false
    }

    $fetch = Invoke-Git @("-C", $SyncRepo, "fetch", "--depth=1", "origin", $Branch)

    if ($fetch.ExitCode -eq 0) {
      Invoke-Git @("-C", $SyncRepo, "checkout", "-B", $Branch, "FETCH_HEAD") | Out-Null
    } else {
      Invoke-Git @("-C", $SyncRepo, "checkout", "--orphan", $Branch) | Out-Null

      Get-ChildItem -LiteralPath $SyncRepo -Force |
        Where-Object { $_.Name -ne ".git" } |
        ForEach-Object {
          Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Write-SyncLog "Repositorio de runtime inicializado. Branch=$Branch"
  }

  return $true
}

function Build-RemoteSnapshot {
  $snapshotDir = Join-Path $SyncRepo "runtime-live"
  New-Item -ItemType Directory -Force -Path $snapshotDir | Out-Null

  $now = (Get-Date).ToUniversalTime().ToString("o")
  $statusRaw = "{}"

  if (Test-Path $StatusSource) {
    try {
      $statusRaw = Get-Content -LiteralPath $StatusSource -Raw -Encoding UTF8
    } catch {}
  }

  $statusRaw = Protect-RemoteText $statusRaw
  $statusObject = $null

  try {
    $statusObject = $statusRaw | ConvertFrom-Json
  } catch {
    $statusObject = @{ raw = $statusRaw }
  }

  $remoteStatus = [ordered]@{
    sessionId = $SessionId
    synchronizedAt = $now
    source = "Aura System local runtime"
    status = $statusObject
    synchronizer = [ordered]@{
      intervalMs = $IntervalMs
      pid = $PID
      uptimeMs = [int64]((Get-Date - $StartTime).TotalMilliseconds)
    }
  }

  $remoteStatus |
    ConvertTo-Json -Depth 50 |
    Set-Content -LiteralPath (Join-Path $snapshotDir "live-status.json") -Encoding UTF8

  if (Test-Path $EventsSource) {
    $eventsRaw = Get-Content -LiteralPath $EventsSource -Raw -Encoding UTF8
    $eventsSafe = Protect-RemoteText $eventsRaw

    Set-Content -LiteralPath (Join-Path $snapshotDir "events.jsonl") -Value $eventsSafe -Encoding UTF8
  } else {
    Set-Content -LiteralPath (Join-Path $snapshotDir "events.jsonl") -Value "" -Encoding UTF8
  }

  [ordered]@{
    sessionId = $SessionId
    synchronizedAt = $now
    machine = $env:COMPUTERNAME
    user = $env:USERNAME
  } |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath (Join-Path $snapshotDir "session.json") -Encoding UTF8

  return $snapshotDir
}

function Publish-Snapshot {
  $snapshotDir = Build-RemoteSnapshot

  $statusHash = Invoke-Git @("-C", $SyncRepo, "hash-object", (Join-Path $snapshotDir "live-status.json"))
  if ($statusHash.ExitCode -ne 0) {
    return
  }

  $eventsHash = Invoke-Git @("-C", $SyncRepo, "hash-object", (Join-Path $snapshotDir "events.jsonl"))
  if ($eventsHash.ExitCode -ne 0) {
    return
  }

  $signature =
    (($statusHash.Output | Select-Object -First 1) | Out-String).Trim() +
    "|" +
    (($eventsHash.Output | Select-Object -First 1) | Out-String).Trim()

  if ($signature -eq $lastSignature) {
    return
  }

  $lastSignature = $signature
  $script:lastSourceChange = Get-Date

  Invoke-Git @("-C", $SyncRepo, "add", "-A") | Out-Null

  $diff = Invoke-Git @("-C", $SyncRepo, "diff", "--cached", "--quiet")
  if ($diff.ExitCode -eq 0) {
    return
  }

  $commit = Invoke-Git @(
    "-C", $SyncRepo,
    "commit",
    "--amend",
    "--no-edit",
    "-m", "runtime: live state $SessionId"
  )

  if ($commit.ExitCode -ne 0) {
    $commit = Invoke-Git @(
      "-C", $SyncRepo,
      "commit",
      "-m", "runtime: live state $SessionId"
    )
  }

  if ($commit.ExitCode -ne 0) {
    return
  }

  $push = Invoke-Git @(
    "-C", $SyncRepo,
    "push",
    "--force",
    "origin",
    "HEAD:$Branch"
  )

  if ($push.ExitCode -eq 0) {
    Write-SyncLog "GitHub atualizado. Branch=$Branch Session=$SessionId"
  } else {
    Write-SyncLog "ERRO: GitHub nao recebeu a atualizacao. Verifique autenticacao/permissao do Git."
  }
}

Write-SyncLog "Sincronizador iniciado. Session=$SessionId IntervalMs=$IntervalMs"

$gitCheck = Invoke-Git @("--version")
if ($gitCheck.ExitCode -ne 0) {
  Write-SyncLog "ERRO: Git nao encontrado no PATH."
  exit 1
}

if (-not (Ensure-SyncRepo)) {
  Write-SyncLog "ERRO: nao foi possivel preparar o repositorio de sincronizacao."
  exit 1
}

while ($true) {
  try {
    $phase = ""
    if (Test-Path $StatusSource) {
      try {
        $status = Get-Content -LiteralPath $StatusSource -Raw -Encoding UTF8 | ConvertFrom-Json
        $phase = [string]$status.phase
      } catch {}
    }

    Publish-Snapshot

    if ($phase -in @("success", "shutdown", "error")) {
      if (-not $shutdownSeenAt) {
        $shutdownSeenAt = Get-Date
      }

      if (((Get-Date) - $shutdownSeenAt).TotalSeconds -ge 3) {
        break
      }
    } else {
      $shutdownSeenAt = $null
    }

    if (((Get-Date) - $lastSourceChange).TotalSeconds -ge 15 -and
        $phase -in @("server", "electron", "renderer", "http")) {
      Write-SyncLog "Runtime ficou sem atualizacoes por 15 segundos; encerrando sincronizador."
      break
    }
  } catch {
    Write-SyncLog ("ERRO no ciclo de sincronizacao: " + $_.Exception.Message)
  }

  Start-Sleep -Milliseconds ([Math]::Max(500, $IntervalMs))
}

try {
  Publish-Snapshot
} catch {}
