Add-Type -AssemblyName System.Drawing

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $workspaceRoot 'assets\brand\source'

function Get-ArtworkBounds {
  param([System.Drawing.Bitmap]$Image)
  $left = $Image.Width
  $top = $Image.Height
  $right = 0
  $bottom = 0
  for ($y = 0; $y -lt $Image.Height; $y += 2) {
    for ($x = 0; $x -lt $Image.Width; $x += 2) {
      $pixel = $Image.GetPixel($x, $y)
      if ($pixel.R -lt 245 -or $pixel.G -lt 245 -or $pixel.B -lt 245) {
        if ($x -lt $left) { $left = $x }
        if ($x -gt $right) { $right = $x }
        if ($y -lt $top) { $top = $y }
        if ($y -gt $bottom) { $bottom = $y }
      }
    }
  }
  if ($right -le $left -or $bottom -le $top) { throw 'Source image contains no visible artwork.' }
  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
}

function Get-PaddedBounds {
  param([System.Drawing.Bitmap]$Image, [double]$PaddingRatio)
  $bounds = Get-ArtworkBounds $Image
  $padding = [Math]::Round([Math]::Max($bounds.Width, $bounds.Height) * $PaddingRatio)
  $left = [Math]::Max(0, $bounds.Left - $padding)
  $top = [Math]::Max(0, $bounds.Top - $padding)
  $right = [Math]::Min($Image.Width, $bounds.Right + $padding)
  $bottom = [Math]::Min($Image.Height, $bounds.Bottom + $padding)
  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)
}

function Set-HighQualityDrawing {
  param([System.Drawing.Graphics]$Graphics)
  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
}

function Export-SquareIcon {
  param([string]$Source, [string]$Destination, [int]$Size)
  $image = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $bounds = Get-PaddedBounds $image 0.06
    $scale = [Math]::Min(($Size * 0.88) / $bounds.Width, ($Size * 0.88) / $bounds.Height)
    $width = [Math]::Round($bounds.Width * $scale)
    $height = [Math]::Round($bounds.Height * $scale)
    $canvas = New-Object System.Drawing.Bitmap $Size, $Size
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        Set-HighQualityDrawing $graphics
        $graphics.Clear([System.Drawing.Color]::White)
        $destinationRectangle = New-Object System.Drawing.Rectangle ([Math]::Round(($Size - $width) / 2)), ([Math]::Round(($Size - $height) / 2)), $width, $height
        $graphics.DrawImage($image, $destinationRectangle, $bounds, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $canvas.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $canvas.Dispose() }
  } finally { $image.Dispose() }
}

function Export-Wordmark {
  param([string]$Source, [string]$Destination, [int]$MaximumWidth)
  $image = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $bounds = Get-PaddedBounds $image 0.04
    $width = [Math]::Min($MaximumWidth, $bounds.Width)
    $height = [Math]::Round($bounds.Height * $width / $bounds.Width)
    $canvas = New-Object System.Drawing.Bitmap $width, $height
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        Set-HighQualityDrawing $graphics
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle 0, 0, $width, $height), $bounds, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $canvas.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $canvas.Dispose() }
  } finally { $image.Dispose() }
}

$iconSource = Join-Path $sourceRoot 'chodhiq-app-icon-original.png'
$wordmarkSource = Join-Path $sourceRoot 'chodhiq-company-logo-original.jpeg'

Export-SquareIcon $iconSource (Join-Path $workspaceRoot 'assets\chodhiq-app-icon-v2.png') 1024
Export-SquareIcon $iconSource (Join-Path $workspaceRoot 'assets\chodhiq-app-icon.png') 1024
Export-Wordmark $wordmarkSource (Join-Path $workspaceRoot 'assets\chodhiq-full-logo.png') 1600

foreach ($dashboard in @('business-dashboard', 'admin-dashboard')) {
  $publicRoot = Join-Path $workspaceRoot "$dashboard\public"
  Export-SquareIcon $iconSource (Join-Path $publicRoot 'favicon.png') 512
  Export-Wordmark $wordmarkSource (Join-Path $publicRoot 'chodhiq-logo.png') 1200
}
