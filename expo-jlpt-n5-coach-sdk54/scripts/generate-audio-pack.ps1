param(
  [string]$OutDir = "assets/audio/n5_core"
)

$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $project "assets/audio/audio-pack-manifest.json"
$targetDir = Join-Path $project $OutDir

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @()
try {
  $voices = @($synth.GetInstalledVoices())
} catch {
  $synth.Dispose()
  Write-Error "Impossible de lire les voix Windows SAPI. Installe une voix japonaise compatible synthese vocale, puis relance npm run audio:generate."
}

$voice = $voices |
  Where-Object { $_.VoiceInfo.Culture.Name -like "ja-*" -or $_.VoiceInfo.Name -match "Japanese|Haruka|Ayumi|Ichiro" } |
  Select-Object -First 1

if (-not $voice) {
  $available = ($voices | ForEach-Object { "$($_.VoiceInfo.Name) [$($_.VoiceInfo.Culture.Name)]" }) -join ", "
  if (-not $available) { $available = "aucune voix SAPI detectee" }
  $synth.Dispose()
  Write-Host "Voix detectees : $available"
  Write-Error "Aucune voix japonaise Windows n'est installee. Installe une voix japonaise, puis relance ce script."
}

$synth.SelectVoice($voice.VoiceInfo.Name)
$synth.Rate = -2
$synth.Volume = 100

$manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
$generated = 0
$registryLines = New-Object System.Collections.Generic.List[string]
$registryLines.Add("export const AUDIO_ASSET_REGISTRY: Record<string, number> = {")

foreach ($item in $manifest.items) {
  $fileName = "$($item.id).wav"
  $outPath = Join-Path $targetDir $fileName
  $synth.SetOutputToWaveFile($outPath)
  $synth.Speak([string]$item.japanese)
  $synth.SetOutputToNull()
  $registryLines.Add("  '$($item.id)': require('./../assets/audio/n5_core/$fileName'),")
  $generated++
  Write-Host "Generated $fileName"
}

$synth.Dispose()
$registryLines.Add("};")
$registryPath = Join-Path $project "data/audioAssetRegistry.ts"
Set-Content -Path $registryPath -Value ($registryLines -join [Environment]::NewLine) -Encoding UTF8
Write-Host "Generated $generated audio files in $targetDir with voice $($voice.VoiceInfo.Name)."
Write-Host "Updated data/audioAssetRegistry.ts."
