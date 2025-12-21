package handlers

import (
	"bytes"
	"checkmate-backend/models"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	DB *gorm.DB
}

func NewPaymentHandler(db *gorm.DB) *PaymentHandler {
	return &PaymentHandler{DB: db}
}

// Pricing structure
var pricingTiers = map[int]float64{
	1: 100.00,
	3: 250.00,
	5: 480.00,
}

// M-Pesa Configuration Helpers
func getMpesaURL(endpoint string) string {
	env := os.Getenv("MPESA_ENV")
	baseURL := "https://sandbox.safaricom.co.ke"
	if env == "production" {
		baseURL = "https://api.safaricom.co.ke"
	}
	return baseURL + endpoint
}

func getMpesaAccessToken() (string, error) {
	consumerKey := os.Getenv("MPESA_CONSUMER_KEY")
	consumerSecret := os.Getenv("MPESA_CONSUMER_SECRET")

	url := getMpesaURL("/oauth/v1/generate?grant_type=client_credentials")

	req, _ := http.NewRequest("GET", url, nil)
	req.SetBasicAuth(consumerKey, consumerSecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("auth failed: %s", string(body))
	}

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	return res["access_token"].(string), nil
}

func getPassword(shortcode, passkey, timestamp string) string {
	data := shortcode + passkey + timestamp
	return base64.StdEncoding.EncodeToString([]byte(data))
}

// InitiatePayment handles M-Pesa STK Push request
func (h *PaymentHandler) InitiatePayment(c *gin.Context) {
	userID, _ := c.Get("userID")

	var body struct {
		Slots       int    `json:"slots"`
		PhoneNumber string `json:"phone_number"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate slots
	amount, exists := pricingTiers[body.Slots]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid slots. Choose 1, 3, or 5"})
		return
	}

	// Validate phone number (254XXXXXXXXX format)
	phoneRegex := regexp.MustCompile(`^254\d{9}$`)
	if !phoneRegex.MatchString(body.PhoneNumber) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number. Format: 254XXXXXXXXX"})
		return
	}

	// Get Auth Token
	token, err := getMpesaAccessToken()
	if err != nil {
		fmt.Printf("M-Pesa Auth Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to M-Pesa"})
		return
	}

	// Prepare STK Push
	shortcode := os.Getenv("MPESA_SHORTCODE")
	passkey := os.Getenv("MPESA_PASSKEY")
	timestamp := time.Now().Format("20060102150405")
	password := getPassword(shortcode, passkey, timestamp)
	callbackURL := os.Getenv("MPESA_CALLBACK_URL")
	// Note: Callback URL is required by API but we will rely on polling/query for this simple version
	// if using localhost, callback won't work anyway without ngrok.
	if callbackURL == "" {
		callbackURL = "https://example.com/callback" // Dummy for localhost testing
	}

	stkReq := map[string]interface{}{
		"BusinessShortCode": shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            uint(amount), // Safaricom expects integer for Amount usually, but let's check. Documentation says NO decimal.
		"PartyA":            body.PhoneNumber,
		"PartyB":            shortcode,
		"PhoneNumber":       body.PhoneNumber,
		"CallBackURL":       callbackURL,
		"AccountReference":  "Checkmate",
		"TransactionDesc":   fmt.Sprintf("Buy %d Slots", body.Slots),
	}

	jsonData, _ := json.Marshal(stkReq)
	req, _ := http.NewRequest("POST", getMpesaURL("/mpesa/stkpush/v1/processrequest"), bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "STK Push failed"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	// Log response for debugging
	fmt.Printf("STK Response: %s\n", string(respBody))

	var mpesaResp map[string]interface{}
	json.Unmarshal(respBody, &mpesaResp)

	// Check for ResponseCode "0"
	if mpesaResp["ResponseCode"] != "0" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "M-Pesa rejected request", "details": mpesaResp["CustomerMessage"]})
		return
	}

	checkoutRequestID := mpesaResp["CheckoutRequestID"].(string)
	merchantRequestID := mpesaResp["MerchantRequestID"].(string)

	// Create transaction record
	transaction := models.Transaction{
		UserID:            uint(userID.(float64)),
		Amount:            amount,
		SlotsPurchased:    body.Slots,
		PhoneNumber:       body.PhoneNumber,
		CheckoutRequestID: checkoutRequestID,
		MerchantRequestID: merchantRequestID,
		Status:            models.TransactionPending,
	}

	if err := h.DB.Create(&transaction).Error; err != nil {
		fmt.Printf("DB Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "Enter M-Pesa PIN",
		"checkout_request_id": checkoutRequestID,
		"amount":              amount,
		"slots":               body.Slots,
	})
}

// CheckPaymentStatus - Poll endpoint to check if payment completed via Query API
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
	checkoutRequestID := c.Param("invoice_id")
	userIDVal, _ := c.Get("userID")
	userID := uint(userIDVal.(float64))

	var transaction models.Transaction
	// Find transaction by M-Pesa CheckoutRequestID
	if err := h.DB.Where("checkout_request_id = ?", checkoutRequestID).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Verify ownership
	if transaction.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// If already completed, return immediately
	if transaction.Status == models.TransactionCompleted {
		c.JSON(http.StatusOK, gin.H{
			"status":         "completed",
			"slots_added":    transaction.SlotsPurchased,
			"transaction_id": transaction.ID,
		})
		return
	}

	// Query M-Pesa API for status
	token, err := getMpesaAccessToken()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "pending"}) // Keep pending on auth error
		return
	}

	shortcode := os.Getenv("MPESA_SHORTCODE")
	passkey := os.Getenv("MPESA_PASSKEY")
	timestamp := time.Now().Format("20060102150405")
	password := getPassword(shortcode, passkey, timestamp)

	queryReq := map[string]interface{}{
		"BusinessShortCode": shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"CheckoutRequestID": checkoutRequestID,
	}

	jsonData, _ := json.Marshal(queryReq)
	req, _ := http.NewRequest("POST", getMpesaURL("/mpesa/stkpushquery/v1/query"), bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	respString := string(respBody)
	fmt.Printf("RAW MPESA BODY: %s\n", respString)

	// Check for HTML response (Incapsula/WAF block)
	if len(respString) > 0 && respString[0] == '<' {
		fmt.Printf("M-Pesa API Error (HTML/Incapsula): %s\n", respString)
		c.JSON(http.StatusOK, gin.H{"status": "failed", "message": "Transaction Failed"})
		return
	}

	var queryResp map[string]interface{}
	if err := json.Unmarshal(respBody, &queryResp); err != nil {
		fmt.Printf("JSON Parse Error: %v\n", err)
		// If we can't parse JSON, we should probably fail rather than hang pending forever
		c.JSON(http.StatusOK, gin.H{"status": "failed", "message": "Invalid response from Payment Gateway"})
		return
	}

	// specific check for error message from API gateway
	if errorCode, ok := queryResp["errorCode"].(string); ok {
		fmt.Printf("API gateway error: %s\n", errorCode)
		c.JSON(http.StatusOK, gin.H{"status": "failed", "message": "Transaction Failed"})
		return
	}

	// Check for "fault" (Rate Limit / Spike Arrest)
	if _, ok := queryResp["fault"]; ok {
		fmt.Printf("M-Pesa Rate Limit (Spike Arrest): %v\n", queryResp["fault"])
		c.JSON(http.StatusOK, gin.H{"status": "pending"}) // Retry next poll
		return
	}

	// Robust ResultCode Extraction
	var resultCode string
	var found bool
	if rcStr, ok := queryResp["ResultCode"].(string); ok {
		resultCode = rcStr
		found = true
	} else if rcFloat, ok := queryResp["ResultCode"].(float64); ok {
		resultCode = fmt.Sprintf("%.0f", rcFloat)
		found = true
	}

	if !found {
		// Robust ResponseCode Extraction for "In Process" check
		var responseCode string
		if rcStr, ok := queryResp["ResponseCode"].(string); ok {
			responseCode = rcStr
		} else if rcFloat, ok := queryResp["ResponseCode"].(float64); ok {
			responseCode = fmt.Sprintf("%.0f", rcFloat)
		}

		// If ResponseCode is 0, it means the request is accepted and being processed
		if responseCode == "0" {
			c.JSON(http.StatusOK, gin.H{"status": "pending"})
			return
		}

		// Fallback: If we don't understand the response, fail it to stop loop
		fmt.Printf("DEBUG: Unknown Response format: %v\n", queryResp)
		c.JSON(http.StatusOK, gin.H{"status": "failed"})
		return
	}

	fmt.Printf("DEBUG: Extracted ResultCode: '%s'\n", resultCode)

	if resultCode == "0" {
		// SUCCESS
		transaction.Status = models.TransactionCompleted
		h.DB.Save(&transaction)

		// Add slots
		var userCredits models.UserCredits
		result := h.DB.Where("user_id = ?", userID).First(&userCredits)

		if result.Error == gorm.ErrRecordNotFound {
			userCredits = models.UserCredits{
				UserID:         userID,
				SlotsRemaining: transaction.SlotsPurchased,
				TotalPurchased: transaction.SlotsPurchased,
			}
			h.DB.Create(&userCredits)
		} else {
			userCredits.SlotsRemaining += transaction.SlotsPurchased
			userCredits.TotalPurchased += transaction.SlotsPurchased
			h.DB.Save(&userCredits)
		}

		c.JSON(http.StatusOK, gin.H{
			"status":         "completed",
			"slots_added":    transaction.SlotsPurchased,
			"transaction_id": transaction.ID,
		})
		return
	} else if resultCode == "1037" {
		// 1037: DS timeout / No response from user yet. keep pending.
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
		return
	} else {
		// FAILURE
		transaction.Status = models.TransactionFailed
		h.DB.Save(&transaction)

		// Determine user-friendly message
		msg := "Transaction failed"
		if resultCode == "1032" {
			msg = "Transaction cancelled"
		} else if desc, ok := queryResp["ResultDesc"].(string); ok && desc != "" {
			// Use M-Pesa's description (e.g., "The balance is insufficient...")
			msg = desc
		}
		c.JSON(http.StatusOK, gin.H{"status": "failed", "message": msg})
		return
	}
}

// GetUserCredits returns user's current slot balance
func (h *PaymentHandler) GetUserCredits(c *gin.Context) {
	userID, _ := c.Get("userID")

	var userCredits models.UserCredits
	result := h.DB.Where("user_id = ?", userID).First(&userCredits)

	if result.Error == gorm.ErrRecordNotFound {
		// No credits yet, return 0
		c.JSON(http.StatusOK, gin.H{
			"slots_remaining": 0,
			"total_purchased": 0,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"slots_remaining": userCredits.SlotsRemaining,
		"total_purchased": userCredits.TotalPurchased,
	})
}

// DecrementUserSlots - Helper function to decrease slots after upload
func DecrementUserSlots(db *gorm.DB, userID uint) error {
	var userCredits models.UserCredits
	if err := db.Where("user_id = ?", userID).First(&userCredits).Error; err != nil {
		return fmt.Errorf("user credits not found")
	}

	if userCredits.SlotsRemaining <= 0 {
		return fmt.Errorf("insufficient slots")
	}

	userCredits.SlotsRemaining--
	return db.Save(&userCredits).Error
}

// CheckUserSlots - Helper to check if user has slots
func CheckUserSlots(db *gorm.DB, userID uint) (bool, int) {
	var userCredits models.UserCredits
	if err := db.Where("user_id = ?", userID).First(&userCredits).Error; err != nil {
		return false, 0 // No credits record = 0 slots
	}

	return userCredits.SlotsRemaining > 0, userCredits.SlotsRemaining
}
