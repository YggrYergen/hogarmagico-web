# Image Optimization Script
# Resizes images in the ../images directory to create web-optimized versions.
# Requires no external dependencies (uses System.Drawing).

Add-Type -AssemblyName System.Drawing

$sourceDir = "$PSScriptRoot\..\images"
$quality = 85

function Resize-Image {
    param(
        [string]$imagePath,
        [int]$maxWidth,
        [string]$suffix
    )

    try {
        $image = [System.Drawing.Image]::FromFile($imagePath)
        
        # Calculate new dimensions keeping aspect ratio
        $ratioX = $maxWidth / $image.Width
        $ratioY = $maxWidth / $image.Height # Using width constraint mostly
        $ratio = $ratioX

        $newWidth = [int]($image.Width * $ratio)
        $newHeight = [int]($image.Height * $ratio)

        if ($newWidth -gt $image.Width) {
            $newWidth = $image.Width
            $newHeight = $image.Height
        }

        $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $graph = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # High quality settings
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $graph.DrawImage($image, 0, 0, $newWidth, $newHeight)

        # Save with compression
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)

        $newName = $imagePath.Replace(".jpg", "$suffix.jpg")
        
        # Dispose original to allow verify/overwrite if needed (though we write new file)
        $image.Dispose()
        
        $bitmap.Save($newName, $codec, $encoderParams)
        
        $bitmap.Dispose()
        $graph.Dispose()
        
        Write-Host "Created: $newName" -ForegroundColor Green
    }
    catch {
        Write-Host "Error processing $imagePath : $_" -ForegroundColor Red
    }
}

$files = Get-ChildItem "$sourceDir\*.jpg" -Exclude "*_small.jpg","*_medium.jpg"

foreach ($file in $files) {
    Write-Host "Processing $($file.Name)..."
    
    # Generate Medium (1200px)
    if (!(Test-Path $file.FullName.Replace(".jpg", "_medium.jpg"))) {
        Resize-Image -imagePath $file.FullName -maxWidth 1200 -suffix "_medium"
    }

    # Generate Small (600px)
    if (!(Test-Path $file.FullName.Replace(".jpg", "_small.jpg"))) {
         Resize-Image -imagePath $file.FullName -maxWidth 600 -suffix "_small"
    }
}

Write-Host "Optimization Complete!" -ForegroundColor Cyan
