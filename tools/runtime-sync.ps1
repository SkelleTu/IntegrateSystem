param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [string]$SessionId = "",

  [int]$IntervalMs = 5000
)

if ([string]::IsNullOrWhiteSpace($SessionId)) {
  $SessionId = [string]$env:AURA_RUNTIME_SESSION
}

if ([string]::IsNullOrWhiteSpace($SessionId)) {
  $SessionId = [guid]::NewGuid().ToString("N")
  $env:AURA_RUNTIME_SESSION = $SessionId
}

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

function Get-GitHubToken {
  try {
    $token = (& gh auth token --hostname github.com 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
      Write-SyncLog "ERRO: gh auth token falhou."
      return $null
    }

    return $token
  } catch {
    Write-SyncLog ("ERRO ao obter token do GitHub CLI: " + $_.Exception.Message)
    return $null
  }
}

function Invoke-GhApi {
  param(
    [string]$Method,
    [string]$Endpoint,
    [hashtable]$Body = $null
  )

  try {
    $token = Get-GitHubToken
    if ([string]::IsNullOrWhiteSpace($token)) {
      return $null
    }

    $headers = @{
      Authorization = "Bearer $token"
      Accept = "application/vnd.github+json"
      "X-GitHub-Api-Version" = "2022-11-28"
    }

    $uri = "https://api.github.com/" + $Endpoint.TrimStart("/")
    $json = $null

    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 50 -Compress
    }

    $response = if ($null -ne $json) {
      Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
    } else {
      Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }

    return $response
  } catch {
    $detail = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($detail)) {
      $detail = $_.Exception.Message
    }

    Write-SyncLog ("GitHub API " + $Method + " " + $Endpoint + " => ERRO: " + $detail)
    return $null
  }
}

function Get-RemoteHead {
  $raw = Invoke-GhApi "GET" "repos/$Owner/$Repo/git/ref/heads/$Branch"
  if ($null -eq $raw) {
    return $null
  }

  try {
    return [string]$raw.object.sha
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

  $raw = Invoke-GhApi "POST" "repos/$Owner/$Repo/git/blobs" @{
    content = $safe
    encoding = "utf-8"
  }

  if ($null -eq $raw) {
    return $null
  }

  try {
    return [string]$raw.sha
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

  $raw = Invoke-GhApi "POST" "repos/$Owner/$Repo/git/trees" @{
    tree = $tree
  }

  if ($null -eq $raw) {
    return $null
  }

  try {
    return [string]$raw.sha
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

  $raw = Invoke-GhApi "POST" "repos/$Owner/$Repo/git/commits" @{
    message = "runtime: live state $SessionId"
    tree = $TreeSha
    parents = $parents
  }

  if ($null -eq $raw) {
    return $null
  }

  try {
    return [string]$raw.sha
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

  $raw = Invoke-GhApi "PATCH" "repos/$Owner/$Repo/git/refs/heads/$Branch" @{
    sha = $CommitSha
    force = $true
  }

  return $null -ne $raw
}

function Ensure-RemoteBranch {
  $head = Get-RemoteHead
  if ($head) {
    return $head
  }

  $base = Invoke-GhApi "GET" "repos/$Owner/$Repo/git/ref/heads/main"
  if ($null -eq $base) {
    Write-SyncLog "ERRO: nao foi possivel obter main para criar $Branch."
    return $null
  }

  try {
    $baseSha = [string]$base.object.sha
  } catch {
    Write-SyncLog "ERRO: resposta invalida ao consultar main."
    return $null
  }

  $payload = [ordered]@{
    ref = "refs/heads/$Branch"
    sha = $baseSha
  } | ConvertTo-Json -Depth 10 -Compress

  $created = Invoke-GhApi "POST" "repos/$Owner/$Repo/git/refs" @{
    ref = "refs/heads/$Branch"
    sha = $baseSha
  }

  if ($null -eq $created) {
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

  Write-SyncLog "Publicacao: criando blobs."
  $statusSha = New-GitBlob $snapshot.status
  if (-not $statusSha) { return }

  $eventsSha = New-GitBlob $snapshot.events
  if (-not $eventsSha) { return }

  $sessionSha = New-GitBlob $snapshot.session
  if (-not $sessionSha) { return }

  Write-SyncLog "Publicacao: criando tree."
  $treeSha = New-GitTree $statusSha $eventsSha $sessionSha
  if (-not $treeSha) { return }

  $parentSha = Get-RemoteHead
  Write-SyncLog "Publicacao: criando commit. Parent=$parentSha"
  $commitSha = New-GitCommit $treeSha $parentSha
  if (-not $commitSha) { return }

  Write-SyncLog "Publicacao: atualizando branch $Branch."
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
