$sourceDir = "app-icons"
$androidResDir = "android/app/src/main/res"
$iosIconDir = "ios/Inkjet/Images.xcassets/AppIcon.appiconset"

# Ensure source exists
if (-not (Test-Path $sourceDir)) {
    Write-Error "Source directory $sourceDir not found!"
    exit 1
}

# Android Mappings
$androidMappings = @{
    "mipmap-mdpi" = "app-icon-96x96.png"
    "mipmap-hdpi" = "app-icon-96x96.png"
    "mipmap-xhdpi" = "app-icon-96x96.png"
    "mipmap-xxhdpi" = "app-icon-180x180.png"
    "mipmap-xxxhdpi" = "app-icon-192x192.png"
}

Write-Host "Updating Android Icons..."
foreach ($folder in $androidMappings.Keys) {
    $sourceFile = Join-Path $sourceDir $androidMappings[$folder]
    $destFolder = Join-Path $androidResDir $folder
    
    if (Test-Path $destFolder) {
        Copy-Item $sourceFile -Destination (Join-Path $destFolder "ic_launcher.png") -Force
        Copy-Item $sourceFile -Destination (Join-Path $destFolder "ic_launcher_round.png") -Force
        Write-Host "Updated $folder"
    } else {
        Write-Warning "Android folder $destFolder not found"
    }
}

# iOS Mappings
$iosMappings = @{
    "icon-1024x1024@1x.png" = "app-icon-1024x1024.png"
    "icon-60x60@3x.png" = "app-icon-180x180.png"
    "icon-60x60@2x.png" = "app-icon-128x128.png"
    "icon-40x40@3x.png" = "app-icon-128x128.png"
    "icon-40x40@2x.png" = "app-icon-96x96.png"
    "icon-29x29@3x.png" = "app-icon-96x96.png"
    "icon-29x29@2x.png" = "app-icon-96x96.png"
    "icon-20x20@3x.png" = "app-icon-96x96.png"
    "icon-20x20@2x.png" = "app-icon-96x96.png"
}

Write-Host "Updating iOS Icons..."
if (Test-Path $iosIconDir) {
    foreach ($destFile in $iosMappings.Keys) {
        $sourceFile = Join-Path $sourceDir $iosMappings[$destFile]
        $destPath = Join-Path $iosIconDir $destFile
        
        Copy-Item $sourceFile -Destination $destPath -Force
        Write-Host "Updated $destFile"
    }
} else {
    Write-Warning "iOS Icon directory $iosIconDir not found"
}

Write-Host "Icon update complete!"
