$ErrorActionPreference = "Stop"
$exe = Join-Path $PSScriptRoot "AuraPrinter.exe"
if (-not (Test-Path $exe)) {
  Write-Host "AuraPrinter.exe nao encontrado nesta pasta." -ForegroundColor Red
  exit 1
}

$secureToken = Read-Host "Token privado do gateway de etiquetas" -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $env:AURA_LABELS_WS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  $env:AURA_LABELS_WS_URL = "wss://integrated-system-1c86.onrender.com/ws/labels"
  if ([string]::IsNullOrWhiteSpace($env:AURA_LABELS_WS_TOKEN)) {
    throw "Token nao informado."
  }
  & $exe
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  Remove-Item Env:AURA_LABELS_WS_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:AURA_LABELS_WS_URL -ErrorAction SilentlyContinue
}
