package handlers

import (
	"bytes"
	"checkmate-backend/models"
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
	1: 100.00, // 1 slot = 100 KES
	3: 250.00, // 3 slots = 250 KES
	5: 480.00, // 5 slots = 480 KES
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

	// Get user email
	var user models.User
	h.DB.First(&user, userID)

	// Create unique API reference
	apiRef := fmt.Sprintf("USER_%d_%d", userID, time.Now().Unix())

	// Call IntaSend M-Pesa STK Push API
	intaSendURL := os.Getenv("INTASEND_API_URL") + "/payment/mpesa-stk-push/"
	intaSendSecret := os.Getenv("INTASEND_SECRET_KEY")
	intaSendPubKey := os.Getenv("INTASEND_PUBLISHABLE_KEY")

	requestBody := map[string]interface{}{
		"public_key":   intaSendPubKey,
		"amount":       amount,
		"phone_number": body.PhoneNumber,
		"api_ref":      apiRef,
		"email":        user.Email,
		"narrative":    fmt.Sprintf("Purchase %d upload slot(s)", body.Slots),
	}

	jsonData, _ := json.Marshal(requestBody)
	req, _ := http.NewRequest("POST", intaSendURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+intaSendSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Payment initiation failed"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var intaSendResp map[string]interface{}
	json.Unmarshal(respBody, &intaSendResp)

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Payment gateway error"})
		return
	}

	// Extract invoice data
	invoice, _ := intaSendResp["invoice"].(map[string]interface{})
	invoiceID, _ := invoice["invoice_id"].(string)

	// Create transaction record
	transaction := models.Transaction{
		UserID:          uint(userID.(float64)),
		Amount:          amount,
		SlotsPurchased:  body.Slots,
		PhoneNumber:     body.PhoneNumber,
		IntaSendInvoice: invoiceID,
		IntaSendRef:     apiRef,
		Status:          models.TransactionPending,
	}

	h.DB.Create(&transaction)

	c.JSON(http.StatusOK, gin.H{
		"message":    "STK Push sent. Check your phone.",
		"invoice_id": invoiceID,
		"api_ref":    apiRef,
		"amount":     amount,
		"slots":      body.Slots,
	})
}

// CheckPaymentStatus - Poll endpoint to check if payment completed
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
	invoiceID := c.Param("invoice_id")
	userID, _ := c.Get("userID")

	var transaction models.Transaction
	if err := h.DB.Where("intasend_invoice = ? AND user_id = ?", invoiceID, userID).First(&transaction).Error; err != nil {
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

	// Poll IntaSend API to check payment status
	intaSendURL := os.Getenv("INTASEND_API_URL") + "/payment/status/"
	intaSendSecret := os.Getenv("INTASEND_SECRET_KEY")

	req, _ := http.NewRequest("GET", intaSendURL+"?invoice_id="+invoiceID, nil)
	req.Header.Set("Authorization", "Bearer "+intaSendSecret)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":  "pending",
			"message": "Waiting for payment...",
		})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var statusResp map[string]interface{}
	json.Unmarshal(respBody, &statusResp)

	invoice, _ := statusResp["invoice"].(map[string]interface{})
	state, _ := invoice["state"].(string)

	if state == "COMPLETE" || state == "COMPLETED" {
		// Payment successful! Add slots to user
		transaction.Status = models.TransactionCompleted
		h.DB.Save(&transaction)

		// Add slots to user credits
		var userCredits models.UserCredits
		result := h.DB.Where("user_id = ?", userID).First(&userCredits)

		if result.Error == gorm.ErrRecordNotFound {
			userCredits = models.UserCredits{
				UserID:         uint(userID.(float64)),
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
			"slots_total":    userCredits.SlotsRemaining,
			"transaction_id": transaction.ID,
		})
		return
	} else if state == "FAILED" || state == "CANCELLED" {
		transaction.Status = models.TransactionFailed
		h.DB.Save(&transaction)

		c.JSON(http.StatusOK, gin.H{
			"status":  "failed",
			"message": "Payment failed or cancelled",
		})
		return
	}

	// Still pending
	c.JSON(http.StatusOK, gin.H{
		"status":  "pending",
		"message": "Waiting for M-Pesa confirmation...",
	})
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
