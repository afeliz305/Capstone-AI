param([ValidateRange(1,60)][int]$Minutes=15, [switch]$Acceptance, [switch]$ReviewOnly, [switch]$PricingReviewed)
$ErrorActionPreference='Stop'
if (!$PricingReviewed) { throw 'Review current standard Sol pricing first. Use -PricingReviewed only if input including cache writes is at most $5 and output is at most $10 per million tokens. Otherwise stop for a pricing update.' }
$secure=Import-Clixml -LiteralPath (Join-Path $env:LOCALAPPDATA 'MIRA\budget-operator.xml')
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $credential=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  # Pipe to the existing local operator process; never echo or pass as argv.
  $credential | node "$PSScriptRoot/classroom-demo.cjs" --pricing-reviewed --minutes $Minutes $(if($Acceptance){'--acceptance'}) $(if($ReviewOnly){'--review-only'})
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $credential=$null
}
