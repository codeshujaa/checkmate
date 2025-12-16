$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:8080"
$userEmail = "client@test.com"
$adminEmail = "admin@test.com"
$password = "password123"

# File Paths
$userDoc = "c:\Users\u\Downloads\frontend-react-main\test doc\Decision_Tree_Classification_Analysis-1758865421.6606038.docx"
$report1 = "c:\Users\u\Downloads\frontend-react-main\test doc\ai_report-1758865421.4377134.pdf"
$report2 = "c:\Users\u\Downloads\frontend-react-main\test doc\plag_report-1758865421.560418.pdf"

# 1. Login User
Write-Host "Logging in User..."
$userLoginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{email=$userEmail; password=$password} | ConvertTo-Json) -ContentType "application/json"
$userToken = $userLoginResponse.token
Write-Host "User Token acquired."

# 2. Upload User File
Write-Host "Uploading User File..."
$uploadUri = "$baseUrl/upload"
$uploadForm = @{
    payment_ref = "TEST_REF"
    file = Get-Item -Path $userDoc
}

# Helper for multipart upload in PS 7+ or using HttpClient in older PS is complex. 
# Using curl (if available) or complex .NET Interop. 
# Since we are on Windows, we likely have curl (alias to Invoke-WebRequest) OR real curl.exe (Git Bash).
# Let's try to use standard curl.exe if possible, or construct multipart request.

# Simplest way: use curl.exe if present
Write-Host "Executing User Upload via curl..."
$curlUserArgs = @("-X", "POST", "$uploadUri", "-H", "Authorization: Bearer $userToken", "-F", "payment_ref=TEST_REF", "-F", "file=@$userDoc")
& curl.exe $curlUserArgs
Write-Host "`nUser Upload Done."

# 3. Login Admin
Write-Host "Logging in Admin..."
$adminLoginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{email=$adminEmail; password=$password} | ConvertTo-Json) -ContentType "application/json"
$adminToken = $adminLoginResponse.token
Write-Host "Admin Token acquired."

# 4. List Orders to get ID
Write-Host "Fetching Orders..."
$ordersResponse = Invoke-RestMethod -Uri "$baseUrl/admin/orders" -Method Get -Headers @{Authorization="Bearer $adminToken"}
$orderId = $ordersResponse[0].id
Write-Host "Found Order ID: $orderId"

# 5. Process Order (Upload Reports & Scores)
Write-Host "Processing Order #$orderId..."
$completeUri = "$baseUrl/admin/complete/$orderId"
$curlAdminArgs = @("-X", "POST", "$completeUri", "-H", "Authorization: Bearer $adminToken", "-F", "ai_score=88", "-F", "sim_score=12", "-F", "report1=@$report1", "-F", "report2=@$report2")
& curl.exe $curlAdminArgs
Write-Host "`nOrder Completed."
