param(
    [Parameter(Mandatory = $true)][string]$ImagePath,
    [string]$Username = "victor",
    [string]$Password = "123456789",
    [string]$BaseUrl = "http://localhost:8080",
    [int]$ChunkSize = 1MB
)

$ErrorActionPreference = "Stop"

function ToBase64([string]$value) {
    [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($value))
}

if (-not (Test-Path $ImagePath)) {
    Write-Error "File not found: $ImagePath"
    exit 1
}

$file = Get-Item $ImagePath
$bytes = [System.IO.File]::ReadAllBytes($file.FullName)
$size = $bytes.Length

$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""
$sha.Dispose()

$ext = $file.Extension.ToLower()
$mime = switch ($ext) {
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png"  { "image/png" }
    ".webp" { "image/webp" }
    ".heic" { "image/heic" }
    ".heif" { "image/heif" }
    ".mp4"  { "video/mp4" }
    ".mov"  { "video/quicktime" }
    default { "application/octet-stream" }
}

Write-Host ""
Write-Host "=== arca smoke test (TUS 1.0) ==="
Write-Host ("File   : {0} ({1:N0} bytes)" -f $file.Name, $size)
Write-Host ("MIME   : {0}" -f $mime)
Write-Host ("SHA-256: {0}" -f $hash)
Write-Host ""

Write-Host "[1/6] Login ..."
$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
$null = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" `
    -ContentType "application/json" -Body $loginBody `
    -SessionVariable session
Write-Host "      OK"

Write-Host "[2/6] Verify hash ..."
$verifyBody = @{ hash = $hash } | ConvertTo-Json
$verify = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/media/verify" `
    -ContentType "application/json" -Body $verifyBody -WebSession $session
Write-Host ("      exists = {0}" -f $verify.exists)
if ($verify.exists) {
    Write-Host ("      already uploaded as {0} - aborting" -f $verify.media.id)
    return
}

Write-Host "[3/6] Initiate TUS upload ..."
$metadata = "hash $(ToBase64 $hash),filename $(ToBase64 $file.Name),filetype $(ToBase64 $mime)"
$initHeaders = @{
    "Tus-Resumable"   = "1.0.0"
    "Upload-Length"   = "$size"
    "Upload-Metadata" = $metadata
}
$initResp = Invoke-WebRequest -Method Post -Uri "$BaseUrl/api/media/uploads" `
    -Headers $initHeaders -WebSession $session -UseBasicParsing
$location = $initResp.Headers["Location"]
if ($location -is [array]) { $location = $location[0] }
$uploadId = ($location -split '/')[-1]
Write-Host ("      upload_id = {0}" -f $uploadId)

$totalChunks = [Math]::Ceiling($size / $ChunkSize)
Write-Host ("[4/6] Streaming {0} chunk(s) of up to {1:N0} bytes ..." -f $totalChunks, $ChunkSize)
$offset = 0
$idx = 0
$lastResponse = $null
while ($offset -lt $size) {
    $end = [Math]::Min($offset + $ChunkSize, $size)
    $len = $end - $offset
    $chunk = New-Object byte[] $len
    [Array]::Copy($bytes, $offset, $chunk, 0, $len)

    $headers = @{
        "Tus-Resumable" = "1.0.0"
        "Upload-Offset" = "$offset"
    }
    $lastResponse = Invoke-WebRequest -Method Patch `
        -Uri "$BaseUrl/api/media/uploads/$uploadId" `
        -Headers $headers `
        -ContentType "application/offset+octet-stream" `
        -Body $chunk `
        -WebSession $session -UseBasicParsing

    $offset = $end
    $idx++
    Write-Host ("      chunk {0}/{1} -> status {2} offset {3:N0}/{4:N0}" -f `
        $idx, $totalChunks, [int]$lastResponse.StatusCode, $offset, $size)
}

$mediaId = $lastResponse.Headers["Upload-Media-Id"]
if ($mediaId -is [array]) { $mediaId = $mediaId[0] }
Write-Host ("[5/6] Finalized -> media_id = {0}" -f $mediaId)

Write-Host "[6/6] Waiting for background worker (thumbnail + EXIF) ..."
$start = Get-Date
$detail = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    $detail = Invoke-RestMethod -Uri "$BaseUrl/api/media/$mediaId" -WebSession $session
    if ($detail.thumbnail_path -or $detail.capture_date) { break }
}
$elapsed = (Get-Date) - $start
Write-Host ("      worker ran in {0:N1}s" -f $elapsed.TotalSeconds)
Write-Host ("      capture_date   = {0}" -f $detail.capture_date)
Write-Host ("      thumbnail_path = {0}" -f $detail.thumbnail_path)

Write-Host ""
Write-Host "=== SUCCESS ==="
Write-Host ("Original  : {0}/api/media/{1}/file" -f $BaseUrl, $mediaId)
Write-Host ("Thumbnail : {0}/api/media/{1}/thumbnail" -f $BaseUrl, $mediaId)
