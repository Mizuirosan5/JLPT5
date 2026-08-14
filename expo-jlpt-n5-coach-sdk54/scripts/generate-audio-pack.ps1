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
$voice = $synth.GetInstalledVoices() |
  Where-Object { $_.VoiceInfo.Culture.Name -like "ja-*" -or $_.VoiceInfo.Name -match "Japanese|Haruka|Ayumi|Ichiro" } |
  Select-Object -First 1

if (-not $voice) {
  Write-Error "Aucune voix japonaise Windows n'est installee. Installe une voix japonaise, puis relance ce script."
}

$synth.SelectVoice($voice.VoiceInfo.Name)
$synth.Rate = -2
$synth.Volume = 100

$manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
$generated = 0

foreach ($item in $manifest.items) {
  $fileName = "$($item.id).wav"
  $outPath = Join-Path $targetDir $fileName
  $synth.SetOutputToWaveFile($outPath)
  $synth.Speak([string]$item.japanese)
  $synth.SetOutputToNull()
  $generated++
  Write-Host "Generated $fileName"
}

$synth.Dispose()
Write-Host "Generated $generated audio files in $targetDir with voice $($voice.VoiceInfo.Name)."
