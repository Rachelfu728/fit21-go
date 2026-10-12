Add-Type -AssemblyName System.Drawing

function Create-Fit21Icon {
    param(
        [int]$size,
        [string]$outputPath,
        [bool]$isMaskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    $colorBg = [System.Drawing.ColorTranslator]::FromHtml("#0F6E56")
    $colorGold = [System.Drawing.ColorTranslator]::FromHtml("#C9A86A")
    $colorCream = [System.Drawing.ColorTranslator]::FromHtml("#FBF6EC")

    if ($isMaskable) {
        $g.Clear($colorBg)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $radius = [int]($size * 0.22)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()

        $bgBrush = New-Object System.Drawing.SolidBrush($colorBg)
        $g.FillPath($bgBrush, $path)
        $bgBrush.Dispose()
        $path.Dispose()
    }

    # Gold circular accent ring
    $center = [float]($size / 2.0)
    $ringRadius = if ($isMaskable) { [float]($size * 0.32) } else { [float]($size * 0.36) }
    $goldPen = New-Object System.Drawing.Pen($colorGold, [float]($size * 0.028))
    $g.DrawEllipse($goldPen, [float]($center - $ringRadius), [float]($center - $ringRadius), [float]($ringRadius * 2), [float]($ringRadius * 2))
    $goldPen.Dispose()

    # Draw forward triangle
    $symbolBrush = New-Object System.Drawing.SolidBrush($colorCream)
    $triPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tX = [float]($center - ($size * 0.02))
    $tY = [float]($center - ($size * 0.04))
    $tW = [float]($size * 0.14)
    $tH = [float]($size * 0.18)

    $p1 = New-Object System.Drawing.PointF([float]($tX - $tW*0.6), [float]($tY - $tH*0.7))
    $p2 = New-Object System.Drawing.PointF([float]($tX + $tW*0.9), [float]$tY)
    $p3 = New-Object System.Drawing.PointF([float]($tX - $tW*0.6), [float]($tY + $tH*0.7))

    [System.Drawing.PointF[]]$points = @($p1, $p2, $p3)
    $triPath.AddPolygon($points)
    $g.FillPath($symbolBrush, $triPath)
    $triPath.Dispose()
    $symbolBrush.Dispose()

    # Text: "Fit21"
    $fontSize = [float]($size * 0.14)
    $fontFamily = New-Object System.Drawing.FontFamily("Arial")
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush($colorGold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF(0.0, [float]($size * 0.65), [float]$size, [float]($size * 0.22))
    $g.DrawString("Fit21", $font, $textBrush, $textRect, $sf)

    # Subtext: "出發鍵"
    $subFontSize = [float]($size * 0.075)
    $subFont = New-Object System.Drawing.Font("Arial", $subFontSize, [System.Drawing.FontStyle]::Bold)
    $subBrush = New-Object System.Drawing.SolidBrush($colorCream)
    $subRect = New-Object System.Drawing.RectangleF(0.0, [float]($size * 0.18), [float]$size, [float]($size * 0.15))
    $g.DrawString("GO!", $subFont, $subBrush, $subRect, $sf)

    $font.Dispose()
    $subFont.Dispose()
    $textBrush.Dispose()
    $subBrush.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Successfully created $outputPath"
}

Create-Fit21Icon -size 192 -outputPath "C:\Users\user\.gemini\antigravity\scratch\fit21-go-pwa\icons\icon-192.png" -isMaskable $false
Create-Fit21Icon -size 512 -outputPath "C:\Users\user\.gemini\antigravity\scratch\fit21-go-pwa\icons\icon-512.png" -isMaskable $false
Create-Fit21Icon -size 512 -outputPath "C:\Users\user\.gemini\antigravity\scratch\fit21-go-pwa\icons\icon-maskable.png" -isMaskable $true
