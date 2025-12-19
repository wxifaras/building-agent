# Generate self-signed certificate for Application Gateway
param(
    [string]$Subject = "CN=appgateway.test",
    [int]$ValidYears = 1
)

$ErrorActionPreference = "Stop"

try {
    Write-Host "Generating self-signed test certificate..." -ForegroundColor Cyan
    
    # Generate certificate
    $cert = New-SelfSignedCertificate `
        -Subject $Subject `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyExportPolicy Exportable `
        -NotAfter (Get-Date).AddYears($ValidYears) `
        -ErrorAction Stop
    
    # Path for final PFX file
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $pfxPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "test-cert-$($timestamp).pfx")
    
    try {
        # Try openssl approach first
        Write-Host "Attempting to create password-less PFX using openssl..." -ForegroundColor Gray
        
        # Export to PFX with temp password
        $tempPassword = ConvertTo-SecureString -String "TempPassword123!" -AsPlainText -Force
        $tempPfxPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "temp-cert-$([System.Guid]::NewGuid().ToString()).pfx")
        Export-PfxCertificate -Cert $cert -FilePath $tempPfxPath -Password $tempPassword -Force -ErrorAction Stop | Out-Null
        
        # Create intermediate PEM file
        $pemPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "temp-cert.pem")
        
        # Extract to PEM (no password)
        $null = & openssl pkcs12 -in $tempPfxPath -out $pemPath -nodes -passin pass:TempPassword123! 2>&1
        
        if (Test-Path $pemPath) {
            # Convert back to PFX without password (empty password)
            $null = & openssl pkcs12 -export -in $pemPath -out $pfxPath -passout pass: 2>&1
            Remove-Item -Path $pemPath -ErrorAction SilentlyContinue
        }
        
        # Clean up temp files
        Remove-Item -Path $tempPfxPath -ErrorAction SilentlyContinue
        
        if (-not (Test-Path $pfxPath)) {
            throw "openssl failed to convert certificate"
        }
        
        Write-Host "Successfully created password-less PFX using openssl" -ForegroundColor Green
    }
    catch {
        Write-Host "openssl approach failed, using PowerShell empty password method..." -ForegroundColor Yellow
        
        # Fallback: Export directly with empty password
        # Empty SecureString password = no password for App Gateway
        $emptyPassword = New-Object System.Security.SecureString
        Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $emptyPassword -Force -ErrorAction Stop | Out-Null
        
        Write-Host "Successfully created password-less PFX using PowerShell" -ForegroundColor Green
    }
    
    # Convert to base64
    $pfxBytes = [System.IO.File]::ReadAllBytes($pfxPath)
    $base64Cert = [System.Convert]::ToBase64String($pfxBytes)
    
    # Clean up PFX file
    Remove-Item -Path $pfxPath -ErrorAction SilentlyContinue
    
    Write-Host "`nCertificate generated successfully!" -ForegroundColor Green
    Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor Cyan
    Write-Host "Base64 length: $($base64Cert.Length) characters" -ForegroundColor Cyan
    
    # Set in azd environment
    Write-Host "`nSetting certificate in azd environment..." -ForegroundColor Cyan
    azd env set base64Certificate $base64Cert
    
    Write-Host "`n✓ Certificate configuration complete!" -ForegroundColor Green
    Write-Host "  - base64Certificate: Set ($($base64Cert.Length) chars)" -ForegroundColor Gray
    
    # Clean up certificate from store
    Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue
    
    Write-Host "`nYou can now run: azd provision" -ForegroundColor Yellow
}
catch {
    Write-Host "`nFailed to generate certificate: $_" -ForegroundColor Red
    throw
}
