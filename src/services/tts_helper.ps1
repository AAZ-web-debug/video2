param (
    [string]$text = "An array organizes elements in contiguous memory.",
    [string]$outputPath = "test_audio.wav"
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$synth.SetOutputToWaveFile($outputPath)
$synth.Speak($text)
$synth.Dispose()
Write-Host "Generated audio file: $outputPath"
