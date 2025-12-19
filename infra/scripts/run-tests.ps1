# Azure Container Apps Landing Zone - E2E Test Runner
# This script runs all e2e tests and reports results

param(
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("defaults", "hub-spoke", "with-jumpbox", "with-jumpbox-windows", "with-app-gateway", "all")]
    [string]$TestScenario,
    
    [Parameter(Mandatory=$false)]
    [switch]$Cleanup,
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$false)]
    [int]$TimeoutMinutes = 60
)

$ErrorActionPreference = "Stop"

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Cyan
    az account set --subscription $SubscriptionId
}

# Get current subscription
$currentSub = az account show --query "name" -o tsv
Write-Host "Running tests in subscription: $currentSub" -ForegroundColor Green

# Generate timestamp for unique deployment names
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Function to generate self-signed certificate for testing
function New-TestCertificate {
    param(
        [string]$Subject = "CN=appgateway.test",
        [int]$ValidYears = 1
    )
    
    try {
        Write-Host "Generating self-signed test certificate..." -ForegroundColor Gray
        
        # Generate certificate
        $cert = New-SelfSignedCertificate `
            -Subject $Subject `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -KeyExportPolicy Exportable `
            -NotAfter (Get-Date).AddYears($ValidYears) `
            -ErrorAction Stop
        
        # Path for final PFX file
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
        
        Write-Host "Certificate generated: Thumbprint=$($cert.Thumbprint), Size=$($base64Cert.Length) chars" -ForegroundColor Green
        
        return $base64Cert
    }
    catch {
        Write-Host "Failed to generate certificate: $_" -ForegroundColor Red
        throw
    }
}

# Function to generate SSH key pair for testing
function New-TestSSHKey {
    try {
        Write-Host "Generating SSH key pair for testing..." -ForegroundColor Gray
        
        # Create output directory for saving keys
        $outputDir = Join-Path $PSScriptRoot "generated-ssh-keys"
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }
        
        # Generate unique filename
        $keyName = "jumpbox-key-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
        $privateKeyPath = Join-Path $outputDir "$keyName"
        $publicKeyPath = "$privateKeyPath.pub"
        
        # Create temporary directory for ssh-keygen
        $tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ssh-$([System.Guid]::NewGuid().ToString().Substring(0,8))")
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        
        Push-Location $tempDir
        
        try {
            # Generate SSH key pair using ssh-keygen (same approach as New-SSHKey.ps1)
            Write-Host "Running: ssh-keygen -f id_rsa -N '' -C 'test@jumpbox'" -ForegroundColor Gray
            $output = & ssh-keygen -f id_rsa -N "" -C "test@jumpbox" 2>&1
            
            if (-not (Test-Path "id_rsa.pub")) {
                Write-Host "ssh-keygen output: $output" -ForegroundColor Yellow
                throw "Failed to generate SSH key. Public key file not found."
            }
            
            # Read the public key and trim whitespace
            $publicKey = (Get-Content -Path "id_rsa.pub" -Raw).Trim()
            
            # Copy private key to persistent location
            Copy-Item -Path "id_rsa" -Destination $privateKeyPath -Force
            Copy-Item -Path "id_rsa.pub" -Destination $publicKeyPath -Force
            
            # Set permissions on private key (read-only for owner)
            if ($PSVersionTable.Platform -eq "Unix") {
                chmod 600 $privateKeyPath
            }
            
            Write-Host "SSH key generated successfully ($(($publicKey.Length)) chars)" -ForegroundColor Green
            Write-Host "Private key saved to: $privateKeyPath" -ForegroundColor Green
            Write-Host "To use this key for SSH: ssh -i $privateKeyPath localAdministrator@<jumpbox-ip>" -ForegroundColor Cyan
            
            # Return object with paths and public key
            return @{
                PublicKey = $publicKey
                PrivateKeyPath = $privateKeyPath
                PublicKeyPath = $publicKeyPath
                TempDir = $tempDir
            }
        }
        finally {
            Pop-Location
        }
    }
    catch {
        Write-Host "Failed to generate SSH key: $_" -ForegroundColor Red
        throw
    }
}

# Test scenarios configuration
$testScenarios = @{
    "defaults" = @{
        Path = "../tests/e2e/defaults/main.test.bicep"
        Description = "Basic deployment without ingress"
        GenerateCertificate = $false
        GenerateSSHKey = $false
        Parameters = @{
            password = "TestPassword123!"
        }
    }
    "hub-spoke" = @{
        Path = "../tests/e2e/hub-spoke/main.test.bicep"
        Description = "Hub-and-spoke topology with VNet peering"
        GenerateCertificate = $false
        GenerateSSHKey = $false
        Parameters = @{
            password = "TestPassword123!"
        }
    }
    "with-jumpbox" = @{
        Path = "../tests/e2e/with-jumpbox/main.test.bicep"
        Description = "Internal deployment with Linux jumpbox"
        GenerateCertificate = $false
        GenerateSSHKey = $true
        Parameters = @{
            password = "TestPassword123!"
        }
    }
    "with-jumpbox-windows" = @{
        Path = "../tests/e2e/with-jumpbox-windows/main.test.bicep"
        Description = "Internal deployment with Windows jumpbox"
        GenerateCertificate = $false
        GenerateSSHKey = $false
        Parameters = @{
            password = "TestPassword123!"
        }
    }
    "with-app-gateway" = @{
        Path = "../tests/e2e/with-app-gateway/main.test.bicep"
        Description = "Application Gateway with self-signed TLS certificate"
        GenerateCertificate = $true
        Parameters = @{
            password = "TestPassword123!"
        }
    }
}

# Determine which tests to run
$testsToRun = if ($TestScenario -eq "all") {
    $testScenarios.Keys
} else {
    @($TestScenario)
}

# Results tracking
$results = @()

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Azure Container Apps Landing Zone E2E Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

foreach ($scenario in $testsToRun) {
    $test = $testScenarios[$scenario]
    $deploymentName = "test-$scenario-$timestamp"
    
    Write-Host "Running test: $scenario" -ForegroundColor Yellow
    Write-Host "Description: $($test.Description)" -ForegroundColor Gray
    Write-Host "Deployment name: $deploymentName" -ForegroundColor Gray
    
    $startTime = Get-Date
    
    try {
        # Generate certificate if needed
        if ($test.GenerateCertificate) {
            $testCertificate = New-TestCertificate
            $test.Parameters["base64Certificate"] = $testCertificate
        }
        
        # Generate SSH key if needed
        if ($test.ContainsKey("GenerateSSHKey") -and $test.GenerateSSHKey) {
            $sshKeyInfo = New-TestSSHKey
            $test.Parameters["sshPublicKey"] = $sshKeyInfo.PublicKey
        }
        
        # Add unique suffix only if not already specified in parameters
        if (-not $test.Parameters.ContainsKey("uniqueSuffix")) {
            $uniqueSuffix = $timestamp.Substring($timestamp.Length - 4)  # Use last 4 chars of timestamp (mmss)
            $test.Parameters["uniqueSuffix"] = $uniqueSuffix
        }
        
        # Build parameter file to avoid Azure CLI inline parameter bug
        $paramFilePath = "$PSScriptRoot\temp-params-$deploymentName.json"
        $paramFileContent = @{
            '$schema' = "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#"
            contentVersion = "1.0.0.0"
            parameters = @{}
        }
        
        foreach ($key in $test.Parameters.Keys) {
            $paramValue = $test.Parameters[$key]
            # Ensure SSH public key is properly formatted without extra whitespace
            if ($key -eq "sshPublicKey" -and $paramValue) {
                $paramValue = $paramValue.Trim()
            }
            $paramFileContent.parameters[$key] = @{ value = $paramValue }
        }
        
        $paramFileContent | ConvertTo-Json -Depth 10 | Set-Content -Path $paramFilePath
        
        # Debug: Show parameter file for SSH key tests
        if ($test.ContainsKey("GenerateSSHKey") -and $test.GenerateSSHKey) {
            Write-Host "SSH key parameter passed: $(($test.Parameters['sshPublicKey'].Length)) chars" -ForegroundColor Gray
        }
        
        # Run deployment
        Write-Host "Starting deployment..." -ForegroundColor Gray
        
        # Resolve template path relative to script directory
        $templatePath = Join-Path $PSScriptRoot $test.Path
        
        # Execute deployment with parameter file and no-wait to avoid CLI bug
        az deployment sub create `
            --location $Location `
            --template-file "$templatePath" `
            --parameters $paramFilePath `
            --name $deploymentName `
            --no-wait
        
        # Wait for deployment to complete
        Write-Host "Waiting for deployment to complete..." -ForegroundColor Gray
        $maxWaitMinutes = $TimeoutMinutes
        $waitStart = Get-Date
        $deploymentState = "Running"
        
        while ($deploymentState -notin @("Succeeded", "Failed", "Canceled")) {
            Start-Sleep -Seconds 30
            $deployment = az deployment sub show --name $deploymentName -o json 2>$null | ConvertFrom-Json
            
            if ($null -eq $deployment) {
                Start-Sleep -Seconds 10
                continue
            }
            
            $deploymentState = $deployment.properties.provisioningState
            $elapsed = ((Get-Date) - $waitStart).TotalMinutes
            
            Write-Host "  Status: $deploymentState (elapsed: $([math]::Round($elapsed, 1)) min)" -ForegroundColor Gray
            
            if ($elapsed -gt $maxWaitMinutes) {
                Write-Host "Deployment timeout - checking for issues..." -ForegroundColor Yellow
                
                # Get resource group
                $rgName = az group list --query "[?tags.environment=='test'].name" -o tsv 2>$null | Select-Object -First 1
                if ($rgName) {
                    Write-Host "  Resource group: $rgName" -ForegroundColor Gray
                    
                    # Check for failed deployments
                    $failedDeps = az deployment group list --resource-group $rgName --query "[?properties.provisioningState=='Failed'].name" -o tsv 2>$null
                    if ($failedDeps) {
                        Write-Host "  Found failed deployments:" -ForegroundColor Yellow
                        $failedDeps | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
                    }
                    
                    # Check for in-progress deployments
                    $runningDeps = az deployment group list --resource-group $rgName --query "[?properties.provisioningState=='Running'].{Name:name, Started:properties.timestamp}" -o json 2>$null | ConvertFrom-Json
                    if ($runningDeps) {
                        Write-Host "  Still running:" -ForegroundColor Yellow
                        $runningDeps | ForEach-Object { Write-Host "    - $($_.Name) (started: $($_.Started))" -ForegroundColor Yellow }
                    }
                }
                
                throw "Deployment timed out after $maxWaitMinutes minutes"
            }
        }
        
        # Clean up temp parameter file
        Remove-Item -Path $paramFilePath -ErrorAction SilentlyContinue
        
        if ($deploymentState -ne "Succeeded") {
            # Get detailed error information
            Write-Host "Getting deployment error details..." -ForegroundColor Yellow
            $errorDetails = az deployment sub show --name $deploymentName --query "properties.error" -o json 2>$null | ConvertFrom-Json
            
            $errorMessage = "Deployment failed with state: $deploymentState"
            if ($errorDetails) {
                if ($errorDetails.code) {
                    $errorMessage += "`n  Error Code: $($errorDetails.code)"
                }
                if ($errorDetails.message) {
                    $errorMessage += "`n  Error Message: $($errorDetails.message)"
                }
                if ($errorDetails.details) {
                    $errorMessage += "`n  Additional Details:"
                    $errorDetails.details | ForEach-Object {
                        if ($_.message) {
                            $errorMessage += "`n    - $($_.message)"
                        }
                    }
                }
            }
            
            # Try to get resource group from deployment
            Write-Host "Looking for failed resources..." -ForegroundColor Yellow
            $rgName = az group list --query "[?tags.environment=='test'].name" -o tsv 2>$null | Select-Object -First 1
            
            if ($rgName) {
                Write-Host "  Found resource group: $rgName" -ForegroundColor Gray
                $failedDeployments = az deployment group list --resource-group $rgName --query "[?properties.provisioningState=='Failed'].name" -o tsv 2>$null
                
                if ($failedDeployments) {
                    $errorMessage += "`n`n  Failed Resource Deployments in $rgName`:"
                    $failedDeployments | ForEach-Object {
                        $depName = $_
                        $errorMessage += "`n    - $depName"
                        
                        # Get operation-level errors
                        $operations = az deployment operation group list --resource-group $rgName --name $depName --query "[?properties.provisioningState=='Failed'].{Resource:properties.targetResource.resourceName, Error:properties.statusMessage.error.message}" -o json 2>$null | ConvertFrom-Json
                        
                        if ($operations) {
                            $operations | ForEach-Object {
                                if ($_.Resource) {
                                    $errorMessage += "`n      Resource: $($_.Resource)"
                                }
                                if ($_.Error) {
                                    $errorMessage += "`n      Error: $($_.Error)"
                                }
                            }
                        }
                    }
                }
            }
            
            throw $errorMessage
        }
        
        # Get deployment outputs
        $outputs = az deployment sub show `
            --name $deploymentName `
            --query "properties.outputs" `
            -o json | ConvertFrom-Json
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMinutes
        
        Write-Host "✓ Test PASSED - Duration: $([math]::Round($duration, 2)) minutes" -ForegroundColor Green
        
        $results += [PSCustomObject]@{
            Scenario = $scenario
            Status = "PASSED"
            Duration = "$([math]::Round($duration, 2)) min"
            DeploymentName = $deploymentName
            ResourceGroup = if ($outputs.resourceGroupName) { $outputs.resourceGroupName.value } else { "N/A" }
            Error = $null
        }
        
        # Display key outputs
        if ($outputs.resourceGroupName) {
            Write-Host "  Resource Group: $($outputs.resourceGroupName.value)" -ForegroundColor Gray
        }
        if ($outputs.containerAppsEnvironmentName) {
            Write-Host "  ACA Environment: $($outputs.containerAppsEnvironmentName.value)" -ForegroundColor Gray
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMinutes
        
        Write-Host "✗ Test FAILED - Duration: $([math]::Round($duration, 2)) minutes" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            Scenario = $scenario
            Status = "FAILED"
            Duration = "$([math]::Round($duration, 2)) min"
            DeploymentName = $deploymentName
            ResourceGroup = "N/A"
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

# Display summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$results | Format-Table -AutoSize

$passedCount = ($results | Where-Object { $_.Status -eq "PASSED" }).Count
$failedCount = ($results | Where-Object { $_.Status -eq "FAILED" }).Count
$totalCount = $results.Count

Write-Host "Total: $totalCount | Passed: $passedCount | Failed: $failedCount`n" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Yellow" })

# Cleanup if requested
if ($Cleanup) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Cleaning up test resources" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    foreach ($result in $results) {
        if ($result.ResourceGroup -ne "N/A") {
            Write-Host "Deleting resource group: $($result.ResourceGroup)" -ForegroundColor Yellow
            az group delete --name $result.ResourceGroup --yes --no-wait
        }
    }
    
    Write-Host "`nCleanup initiated (running in background)" -ForegroundColor Green
}

# Exit with appropriate code
if ($failedCount -gt 0) {
    exit 1
} else {
    exit 0
}
