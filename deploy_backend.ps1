# Deploys the NyayVault backend to the AWS EC2 instance.
# Set before running:
#   $env:EC2_KEY_PATH = "C:\path\to\your-key.pem"
#   $env:EC2_HOST     = "ubuntu@<ec2-public-ip>"
$Key = $env:EC2_KEY_PATH
$Server = $env:EC2_HOST
$ProjectDir = $PSScriptRoot

if (-not $Key -or -not $Server) {
  Write-Error "Set EC2_KEY_PATH and EC2_HOST environment variables first."
  exit 1
}

$ssh = @("-o", "StrictHostKeyChecking=accept-new", "-i", $Key)

Write-Host "Copying backend source to EC2..."
scp @ssh -r "$ProjectDir\server\src" "$Server`:~/server/"
scp @ssh -r "$ProjectDir\server\scripts" "$Server`:~/server/"
scp @ssh "$ProjectDir\server\package.json" "$ProjectDir\server\package-lock.json" "$Server`:~/server/"

Write-Host "Installing dependencies..."
ssh @ssh $Server "cd ~/server && npm install --omit=dev"

Write-Host "Restarting backend (PM2)..."
ssh @ssh $Server "pm2 restart sih-backend --update-env || pm2 start ~/server/src/server.js --name sih-backend"

Write-Host "Running DB migration (loopback-only endpoint)..."
Start-Sleep -Seconds 4
ssh @ssh $Server "curl -s http://localhost:5000/api/dev/migrate"

Write-Host "`nHealth check:"
ssh @ssh $Server "curl -s http://localhost:5000/api/health"
Write-Host "`nDeployment complete."
