param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [Parameter(Mandatory = $true)]
  [string]$SessionId,

  [int]$IntervalMs = 5000
)

$ErrorActionPreference = "Continue"

$Root = (Resolve-Path $Root).Path
$RuntimeDir = Join-Path $Root "runtime"
$SyncLog = Join-Path $RuntimeDir "runtime-sync.log"
$StatusSource = Join-Path $RuntimeDir "aura-runtime.json"
$EventsSource = Join-Path $RuntimeDir "aura-runtime.jsonl"

$Owner = "SkelleTu"
$Repo = "IntegrateSystem"
$Branch = "runtime-live"
$StartTime = Get-Date
$script:lastSignature = ""
$script:lastSourceChange = Get-Date

function Write-SyncLog {
  param([string]$Message)

  try {
    New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
    Add-Content -LiteralPath $SyncLog -Value "$(Get-Date -Format o) [runtime-sync] $Message" -Encoding UTF8
  } catch {}
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

function Invoke-GhApi {
  param(
    [string[]]$Arguments,
    [string]$InputJson = ""
  )

  $temp = $null

  try {
    if (-not [string]::IsNullOrEmpty($InputJson)) {
      $temp = Join-Path $RuntimeDir ("gh-request-" + [guid]::NewGuid().ToString("N") + ".json")
      Set-Content -LiteralPath $temp -Value $InputJson -Encoding UTF8
      $output = & gh api @Arguments --input $temp 2>&1
    } else {
      $output = & gh api @Arguments 2>&1
    }

    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      Write-SyncLog ("gh api " + ($Arguments -join " ") + " => exit " + $exitCode + ": " + (($output | Out-String).Trim()))
      return $null
    }

    return (($output | Out-String).Trim())
  } catch {
    Write-SyncLog ("EXCEPTION gh api: " + $_.Exception.Message)
    return $null
  } finally {
    if ($temp -and (Test-Path $temp)) {
      Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    }
  }
}

function Get-RemoteHead {
  $raw = Invoke-GhApi @("repos/$Owner/$Repo/git/ref/heads/$Branch")
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return ($raw | ConvertFrom-Json).object.sha
  } catch {
    Write-SyncLog "Resposta invalida ao consultar HEAD de $Branch."
    return $null
  }
}

function New-GitBlob {
  param([string]$Content)

  $safe = Protect-RemoteText $Content
  $payload = [ordered]@{
    content = $safe
    encoding = "utf-8"
  } | ConvertTo-Json -Depth 10 -Compress

  $raw = Invoke-GhApi @(
    "repos/$Owner/$Repo/git/blobs",
    "--method", "POST"
  ) $payload

  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return ($raw | ConvertFrom-Json).sha
  } catch {
    Write-SyncLog "Resposta invalida ao criar blob."
    return $null
  }
}

function New-GitTree {
  param(
    [string]$StatusSha,
    [string]$EventsSha,
    [string]$SessionSha
  )

  $tree = @(
    [ordered]@{ path = "live-status.json"; mode = "100644"; type = "blob"; sha = $StatusSha },
    [ordered]@{ path = "events.jsonl"; mode = "100644"; type = "blob"; sha = $EventsSha },
    [ordered]@{ path = "session.json"; mode = "100644"; type = "blob"; sha = $SessionSha }
  )

  $payload = [ordered]@{
    tree = $tree
  } | ConvertTo-Json -Depth 20 -Compress

  $raw = Invoke-GhApi @(
    "repos/$Owner/$Repo/git/trees",
    "--method", "POST"
  ) $payload

  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return ($raw | ConvertFrom-Json).sha
  } catch {
    Write-SyncLog "Resposta invalida ao criar tree."
    return $null
  }
}

function New-GitCommit {
  param(
    [string]$TreeSha,
    [string]$ParentSha
  )

  # Runtime-live representa apenas o estado atual. Cada publicação é um novo
  # root commit para impedir que a branch acumule todo o histórico de telemetria.
  $parents = @()
  if (-not [string]::IsNullOrWhiteSpace($ParentSha)) {
    $parents = @($ParentSha)
  }

  $payload = [ordered]@{
    message = "runtime: live state $SessionId"
    tree = $TreeSha
    parents = $parents
  } | ConvertTo-Json -Depth 20 -Compress

  $raw = Invoke-GhApi @(
    "repos/$Owner/$Repo/git/commits",
    "--method", "POST"
  ) $payload

  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  try {
    return ($raw | ConvertFrom-Json).sha
  } catch {
    Write-SyncLog "Resposta invalida ao criar commit."
    return $null
  }
}

function Update-RemoteRef {
  param([string]$CommitSha)

  $payload = [ordered]@{
    sha = $CommitSha
    force = $true
  } | ConvertTo-Json -Depth 10 -Compress

  $raw = Invoke-GhApi @(
    "repos/$Owner/$Repo/git/refs/heads/$Branch",
    "--method", "PATCH"
  ) $payload

  return -not [string]::IsNullOrWhiteSpace($raw)
}

function Ensure-RemoteBranch {
  $head = Get-RemoteHead
  if ($head) {
    return $head
  }

  $base = Invoke-GhApi @("repos/$Owner/$Repo/git/ref/heads/main")
  if ([string]::IsNullOrWhiteSpace($base)) {
    Write-SyncLog "ERRO: nao foi possivel obter main para criar $Branch."
    return $null
  }

  try {
    $baseSha = ($base | ConvertFrom-Json).object.sha
  } catch {
    Write-SyncLog "ERRO: resposta invalida ao consultar main."
    return $null
  }

  $payload = [ordered]@{
    ref = "refs/heads/$Branch"
    sha = $baseSha
  } | ConvertTo-Json -Depth 10 -Compress

  $created = Invoke-GhApi @(
    "repos/$Owner/$Repo/git/refs",
    "--method", "POST"
  ) $payload

  if ([string]::IsNullOrWhiteSpace($created)) {
    Write-SyncLog "ERRO: falha ao criar branch $Branch."
    return $null
  }

  Write-SyncLog "Branch $Branch criada via GitHub API."
  return $baseSha
}

function Build-RemoteSnapshot {
  $now = (Get-Date).ToUniversalTime().ToString("o")

  $statusRaw = "{}"
  if (Test-Path $StatusSource) {
    try {
      $statusRaw = Get-Content -LiteralPath $StatusSource -Raw -Encoding UTF8
    } catch {
      Write-SyncLog "Aviso: falha ao ler status local."
    }
  }

  $statusSafe = Protect-RemoteText $statusRaw
  $statusObject = $null

  try {
    $statusObject = $statusSafe | ConvertFrom-Json
  } catch {
    $statusObject = @{ raw = $statusSafe }
  }

  $remoteStatus = [ordered]@{
    sessionId = $SessionId
    synchronizedAt = $now
    source = "Aura System local runtime"
    status = $statusObject
    synchronizer = [ordered]@{
      intervalMs = $IntervalMs
      uptimeMs = [int64]((Get-Date - $StartTime).TotalMilliseconds)
    }
  }

  $statusText = $remoteStatus | ConvertTo-Json -Depth 50

  $eventsText = ""
  if (Test-Path $EventsSource) {
    try {
      $eventsText = Get-Content -LiteralPath $EventsSource -Raw -Encoding UTF8
    } catch {
      Write-SyncLog "Aviso: falha ao ler eventos locais."
    }
  }

  $sessionText = [ordered]@{
    sessionId = $SessionId
    synchronizedAt = $now
    role = "runtime-session"
  } | ConvertTo-Json -Depth 20

  return @{
    status = $statusText
    events = $eventsText
    session = $sessionText
  }
}

function Publish-Snapshot {
  $snapshot = Build-RemoteSnapshot

  $signatureSource = $snapshot.status + [char]0 + $snapshot.events
  $bytes = [Text.Encoding]::UTF8.GetBytes($signatureSource)
  $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  $signature = ([BitConverter]::ToString($hash)).Replace("-", "")

  if ($signature -eq $script:lastSignature) {
    return
  }

  $statusSha = New-GitBlob $snapshot.status
  if (-not $statusSha) { return }

  $eventsSha = New-GitBlob $snapshot.events
  if (-not $eventsSha) { return }

  $sessionSha = New-GitBlob $snapshot.session
  if (-not $sessionSha) { return }

  $treeSha = New-GitTree $statusSha $eventsSha $sessionSha
  if (-not $treeSha) { return }

  $parentSha = Get-RemoteHead
  $commitSha = New-GitCommit $treeSha $parentSha
  if (-not $commitSha) { return }

  if (-not (Update-RemoteRef $commitSha)) {
    Write-SyncLog "ERRO: commit criado mas nao foi possivel atualizar $Branch."
    return
  }

  $script:lastSignature = $signature
  $script:lastSourceChange = Get-Date
  Write-SyncLog "GitHub atualizado. Branch=$Branch Session=$SessionId Commit=$commitSha"
}

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
Write-SyncLog "Sincronizador API iniciado. Session=$SessionId IntervalMs=$IntervalMs"

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-SyncLog "ERRO: GitHub CLI nao encontrado no PATH."
  exit 1
}

$auth = & gh auth status --hostname github.com 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-SyncLog ("ERRO: GitHub CLI nao autenticado: " + (($auth | Out-String).Trim()))
  exit 1
}

$branchHead = Ensure-RemoteBranch
if (-not $branchHead) {
  exit 1
}

Publish-Snapshot

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
      Start-Sleep -Milliseconds 1500
      Publish-Snapshot
      break
    }
  } catch {
    Write-SyncLog ("ERRO no ciclo de sincronizacao: " + $_.Exception.Message)
  }

  Start-Sleep -Milliseconds ([Math]::Max(2000, $IntervalMs))
}
