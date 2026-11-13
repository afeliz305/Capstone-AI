param([ValidateRange(1,60)][int]$Minutes=15, [switch]$Acceptance)
$ErrorActionPreference='Stop'
$secure=Import-Clixml -LiteralPath (Join-Path $env:LOCALAPPDATA 'MIRA\budget-operator.xml')
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $credential=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  # Pipe to the existing local operator process; never echo or pass as argv.
  $credential | node "$PSScriptRoot/classroom-demo.cjs" --minutes $Minutes $(if($Acceptance){'--acceptance'})
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $credential=$null
}
