param(
    [string]$JdkPath = $env:JAVA_HOME,
    [string]$SdkPath = $env:ANDROID_HOME
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $JdkPath -or -not (Test-Path "$JdkPath/bin/java.exe")) { throw 'Set JAVA_HOME or pass -JdkPath (Java 21).' }
if (-not $SdkPath -or -not (Test-Path "$SdkPath/platforms/android-36")) { throw 'Set ANDROID_HOME or pass -SdkPath (Android SDK 36).' }
$signingDirectory = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.android/ganglegang-signing'
New-Item -ItemType Directory -Force -Path $signingDirectory | Out-Null
$credentialFile = Join-Path $signingDirectory 'release-password.xml'
$keystoreFile = Join-Path $signingDirectory 'release.jks'
if ((Test-Path $keystoreFile) -and -not (Test-Path $credentialFile)) { throw 'Signing password missing. Restore it before building an update.' }
if (-not (Test-Path $credentialFile)) {
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($bytes)
    $random.Dispose()
    $securePassword = ConvertTo-SecureString ([Convert]::ToBase64String($bytes)) -AsPlainText -Force
    [PSCredential]::new('ganglegang', $securePassword) | Export-Clixml -LiteralPath $credentialFile
}
$credential = Import-Clixml -LiteralPath $credentialFile
$variableNames = @('JAVA_HOME', 'ANDROID_HOME', 'PATH', 'YANG_ANDROID_KEYSTORE', 'YANG_ANDROID_STORE_PASSWORD', 'YANG_ANDROID_KEY_ALIAS', 'YANG_ANDROID_KEY_PASSWORD')
$previous = @{}
foreach ($variableName in $variableNames) { $previous[$variableName] = [Environment]::GetEnvironmentVariable($variableName, 'Process') }
Push-Location $projectRoot
try {
    $env:JAVA_HOME = $JdkPath
    $env:ANDROID_HOME = $SdkPath
    $env:PATH = "$JdkPath/bin;$env:PATH"
    $env:YANG_ANDROID_KEYSTORE = $keystoreFile
    $env:YANG_ANDROID_STORE_PASSWORD = $credential.GetNetworkCredential().Password
    $env:YANG_ANDROID_KEY_PASSWORD = $env:YANG_ANDROID_STORE_PASSWORD
    $env:YANG_ANDROID_KEY_ALIAS = 'ganglegang'
    if (-not (Test-Path $keystoreFile)) {
        & "$JdkPath/bin/keytool.exe" -genkeypair -keystore $keystoreFile -storetype JKS -alias ganglegang -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Ganglegang, OU=Android, O=Ganglegang, C=CN' -storepass:env YANG_ANDROID_STORE_PASSWORD -keypass:env YANG_ANDROID_KEY_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Keystore generation failed.' }
    }
    & npm.cmd run build:android
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & "$projectRoot/android/gradlew.bat" -p "$projectRoot/android" assembleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    $sourceApk = "$projectRoot/android/app/build/outputs/apk/release/app-release.apk"
    $buildTools = Get-ChildItem "$SdkPath/build-tools" -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
    & "$($buildTools.FullName)/apksigner.bat" verify --verbose $sourceApk
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $outputDirectory = "$projectRoot/artifacts/android"
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $versionMatch = Select-String -Path "$projectRoot/android/app/build.gradle" -Pattern 'versionName "([^"]+)"'
    $version = $versionMatch.Matches[0].Groups[1].Value
    $outputApk = "$outputDirectory/ganglegang-$version.apk"
    Copy-Item -LiteralPath $sourceApk -Destination $outputApk -Force
    $hash = (Get-FileHash -LiteralPath $outputApk -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  ganglegang-$version.apk" | Set-Content -LiteralPath "$outputApk.sha256" -Encoding ascii
    Write-Output "APK: $outputApk"
    Write-Output "SHA256: $hash"
    Write-Output "Signing backup: $signingDirectory (password protected by this Windows user account)"
} finally {
    Pop-Location
    foreach ($variableName in $variableNames) { [Environment]::SetEnvironmentVariable($variableName, $previous[$variableName], 'Process') }
}
