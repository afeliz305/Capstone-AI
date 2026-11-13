$ErrorActionPreference = 'Stop'
# Run personally by the account owner. Never prints the generated credential.
if ((Read-Host 'Create a separate MIRA budget-operator credential in your Windows profile? Type SETUP') -cne 'SETUP') { exit 0 }
$appRoot = Split-Path -Parent $PSScriptRoot
$operatorDir = Join-Path $env:LOCALAPPDATA 'MIRA'
$operatorPath = Join-Path $operatorDir 'budget-operator.xml'
if (Test-Path -LiteralPath $operatorPath) { throw 'An operator credential already exists. Do not overwrite it; review the existing setup.' }
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$credential = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$hashAlgorithm = [Security.Cryptography.SHA256]::Create()
$digest = $hashAlgorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($credential))
$digestText = ([BitConverter]::ToString($digest)).Replace('-','').ToLowerInvariant()
New-Item -ItemType Directory -Path $operatorDir -Force | Out-Null
# Windows DPAPI encrypts this SecureString for the current Windows user.
ConvertTo-SecureString $credential -AsPlainText -Force | Export-Clixml -LiteralPath $operatorPath
$credential = $null
$start = New-Object Diagnostics.ProcessStartInfo
$start.FileName = (Get-Command node.exe).Source
$start.WorkingDirectory = $appRoot
$start.Arguments = 'node_modules/wrangler/bin/wrangler.js secret put MIRA_AI_OPERATOR_SHA256 --config workers/ai-budget/wrangler.jsonc'
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.EnvironmentVariables['WRANGLER_LOG_SANITIZE'] = 'true'
$start.EnvironmentVariables['WRANGLER_LOG_PATH'] = Join-Path $env:TEMP 'NUL.log'
$start.EnvironmentVariables['WRANGLER_SEND_METRICS'] = 'false'
$process = [Diagnostics.Process]::Start($start)
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.StandardInput.WriteLine($digestText)
$process.StandardInput.Close()
$process.WaitForExit()
$hashAlgorithm.Dispose(); $rng.Dispose()
if ($process.ExitCode -ne 0) { throw 'Cloudflare setup failed. The protected local credential was retained for diagnosis; no credential was displayed.' }
Write-Host 'Operator hash installed in the private budget Worker. Credential protected by Windows DPAPI. No budget state was changed.'
