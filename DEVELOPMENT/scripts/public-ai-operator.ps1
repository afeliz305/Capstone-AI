param([ValidateSet('status','start','stop','halt')][string]$Action='status',[switch]$PricingReviewed,[switch]$BillingApproved)
$ErrorActionPreference='Stop'
$secure=Import-Clixml -LiteralPath (Join-Path $env:LOCALAPPDATA 'MIRA\budget-operator.xml')
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
 $credential=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 $credential | node "$PSScriptRoot/public-ai-operator.cjs" $Action $(if($PricingReviewed){'--pricing-reviewed'}) $(if($BillingApproved){'--billing-approved'})
 if($LASTEXITCODE -ne 0){throw 'Public AI operation did not complete.'}
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $credential=$null }
