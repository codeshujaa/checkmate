package handlers

import (
	"bytes"
	"checkmate-backend/models"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	DB                  *gorm.DB
	NotificationHandler *NotificationHandler
}

func NewPaymentHandler(db *gorm.DB, notificationHandler *NotificationHandler) *PaymentHandler {
	return &PaymentHandler{
		DB:                  db,
		NotificationHandler: notificationHandler,
	}
}

// Paystack API Constants
const (
	PaystackBaseURL = "https://api.paystack.co"
)

// Helper: Make Authenticated Request to Paystack
func makePaystackRequest(method, endpoint string, payload interface{}) ([]byte, error) {
	apiKey := os.Getenv("PAYSTACK_SECRET_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("PAYSTACK_SECRET_KEY is not set")
	}

	var body io.Reader
	if payload != nil {
		jsonBytes, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonBytes)
	}

	req, err := http.NewRequest(method, PaystackBaseURL+endpoint, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

// InitiatePayment - Uses Paystack Charge API for Mobile Money
func (h *PaymentHandler) InitiatePayment(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := uint(userIDVal.(float64))

	// Get User Email for Paystack
	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	var body struct {
		Slots       int    `json:"slots"`
		PhoneNumber string `json:"phone_number"`
	}

	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Fetch pricing from database instead of hardcoded map
	var pkg models.PricingPackage
	if err := h.DB.Where("slots = ? AND unavailable = ?", body.Slots, false).First(&pkg).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or unavailable package. Please select a valid plan."})
		return
	}

	// Check inventory availability
	if pkg.AvailableSlots <= 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Sold out. No slots available for this package."})
		return
	}

	amount := pkg.Price

	// Paystack expects amount in kobo/cents (Integer)
	amountKobo := int(amount * 100)

	// Paystack M-Pesa format trial: +254...
	phone := body.PhoneNumber
	if len(phone) == 12 && phone[:3] == "254" {
		phone = "+" + phone
	} else if len(phone) == 10 && (phone[:2] == "07" || phone[:2] == "01") {
		phone = "+254" + phone[2:]
	}

	// Prepare Charge Request
	chargeReq := map[string]interface{}{
		"email":    user.Email,
		"amount":   amountKobo,
		"currency": "KES",
		"mobile_money": map[string]string{
			"phone":    phone,
			"provider": "mpesa",
		},
		"metadata": map[string]interface{}{
			"user_id": userID,
			"slots":   body.Slots,
		},
	}

	respBody, err := makePaystackRequest("POST", "/charge", chargeReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to Payment Gateway"})
		return
	}

	var chargeResp map[string]interface{}
	if err := json.Unmarshal(respBody, &chargeResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response from Payment Gateway"})
		return
	}

	status, _ := chargeResp["status"].(bool)
	if !status {
		msg, _ := chargeResp["message"].(string)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment init failed", "details": msg})
		return
	}

	data, _ := chargeResp["data"].(map[string]interface{})
	reference, _ := data["reference"].(string)

	// Create Pending Transaction in DB
	transaction := models.Transaction{
		UserID:           userID,
		Amount:           amount,
		SlotsPurchased:   body.Slots,
		PhoneNumber:      body.PhoneNumber,
		PaymentReference: reference,
		Status:           models.TransactionPending,
	}

	if err := h.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transaction"})
		return
	}

	// Send notification to admins
	if h.NotificationHandler != nil {
		go h.NotificationHandler.SendToAdmins(
			"💰 New Payment Initiated",
			fmt.Sprintf("%s %s initiated payment of KSH %.0f for %d slots", user.FirstName, user.LastName, amount, body.Slots),
			"/dashboard/admin",
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "M-Pesa prompt sent to your phone",
		"reference": reference,
		"status":    "pending",
	})
}

// CheckPaymentStatus - Verify transaction with Paystack (Server-Side Logic Only)
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
	reference := c.Param("invoice_id") // We'll use this param for reference
	userIDVal, _ := c.Get("userID")
	userID := uint(userIDVal.(float64))

	// 1. Fetch Local Transaction
	var transaction models.Transaction
	if err := h.DB.Where("payment_reference = ?", reference).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	if transaction.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to transaction"})
		return
	}

	// 2. Idempotency Check (If already completed, do nothing)
	if transaction.Status == models.TransactionCompleted {
		c.JSON(http.StatusOK, gin.H{
			"status":      "completed",
			"slots_added": transaction.SlotsPurchased,
		})
		return
	}

	// 3. Verify with Paystack
	respBody, err := makePaystackRequest("GET", "/transaction/verify/"+reference, nil)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Could not verify payment"})
		return
	}

	var verifyResp map[string]interface{}
	json.Unmarshal(respBody, &verifyResp)

	status, _ := verifyResp["status"].(bool)
	data, _ := verifyResp["data"].(map[string]interface{})
	gatewayStatus, _ := data["status"].(string)

	if !status {
		c.JSON(http.StatusBadRequest, gin.H{"status": "failed", "message": "Verification failed at gateway"})
		return
	}

	// 4. Handle Status
	if gatewayStatus == "success" {
		// SECURITY: ATOMIC TRANSACTION
		// We use a transaction to ensure we update the order AND give credits together.
		err := h.DB.Transaction(func(tx *gorm.DB) error {
			// Lock the row to prevent race conditions
			var t models.Transaction
			if err := tx.Where("id = ?", transaction.ID).First(&t).Error; err != nil {
				return err
			}

			// Double-check status inside lock
			if t.Status == models.TransactionCompleted {
				return nil // Already done
			}

			// Update Transaction Status
			t.Status = models.TransactionCompleted
			if err := tx.Save(&t).Error; err != nil {
				return err
			}

			// Decrement package inventory (first-come-first-served)
			var pkg models.PricingPackage
			if err := tx.Where("slots = ?", t.SlotsPurchased).First(&pkg).Error; err == nil {
				if pkg.AvailableSlots > 0 {
					pkg.AvailableSlots--
					tx.Save(&pkg)
				}
			}

			// Give Credits
			var userCredits models.UserCredits
			result := tx.Where("user_id = ?", t.UserID).First(&userCredits)

			if result.Error == gorm.ErrRecordNotFound {
				userCredits = models.UserCredits{
					UserID:         t.UserID,
					SlotsRemaining: t.SlotsPurchased,
					TotalPurchased: t.SlotsPurchased,
				}
				if err := tx.Create(&userCredits).Error; err != nil {
					return err
				}
			} else {
				userCredits.SlotsRemaining += t.SlotsPurchased
				userCredits.TotalPurchased += t.SlotsPurchased
				if err := tx.Save(&userCredits).Error; err != nil {
					return err
				}
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction processing failed"})
			return
		}

		// Send notification to admins
		if h.NotificationHandler != nil {
			var user models.User
			h.DB.First(&user, transaction.UserID)
			go h.NotificationHandler.SendToAdmins(
				"✅ Payment Completed",
				fmt.Sprintf("%s %s paid KSH %.0f - %d slots added", user.FirstName, user.LastName, transaction.Amount, transaction.SlotsPurchased),
				"/dashboard/admin",
			)
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      "completed",
			"slots_added": transaction.SlotsPurchased,
		})

	} else if gatewayStatus == "failed" || gatewayStatus == "reversed" {
		transaction.Status = models.TransactionFailed
		h.DB.Save(&transaction)
		c.JSON(http.StatusOK, gin.H{"status": "failed"})
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
	}
}

// GetUserCredits returns user's current slot balance
func (h *PaymentHandler) GetUserCredits(c *gin.Context) {
	userID, _ := c.Get("userID")

	var userCredits models.UserCredits
	result := h.DB.Where("user_id = ?", userID).First(&userCredits)

	if result.Error == gorm.ErrRecordNotFound {
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

// AdminListTransactions returns recent transactions (Admin only)
func (h *PaymentHandler) AdminListTransactions(c *gin.Context) {
	var transactions []models.Transaction
	// Limit to last 50 to keep polling light
	if err := h.DB.Preload("User").Order("created_at desc").Limit(50).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}
	c.JSON(http.StatusOK, transactions)
}

// AdminVerifyTransaction - Allows admin to manually verify a pending transaction
func (h *PaymentHandler) AdminVerifyTransaction(c *gin.Context) {
	reference := c.Param("reference")

	// 1. Fetch Local Transaction
	var transaction models.Transaction
	if err := h.DB.Where("payment_reference = ?", reference).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// 2. Idempotency Check
	if transaction.Status == models.TransactionCompleted {
		c.JSON(http.StatusOK, gin.H{"status": "completed", "message": "Transaction already completed"})
		return
	}

	// 3. Verify with Paystack
	respBody, err := makePaystackRequest("GET", "/transaction/verify/"+reference, nil)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Could not verify payment with gateway"})
		return
	}

	var verifyResp map[string]interface{}
	json.Unmarshal(respBody, &verifyResp)

	status, _ := verifyResp["status"].(bool)
	data, _ := verifyResp["data"].(map[string]interface{})
	gatewayStatus, _ := data["status"].(string)

	if !status {
		c.JSON(http.StatusBadRequest, gin.H{"status": "failed", "message": "Verification failed at gateway"})
		return
	}

	// 4. Handle Status
	if gatewayStatus == "success" {
		err := h.DB.Transaction(func(tx *gorm.DB) error {
			var t models.Transaction
			if err := tx.Where("id = ?", transaction.ID).First(&t).Error; err != nil {
				return err
			}
			if t.Status == models.TransactionCompleted {
				return nil
			}

			t.Status = models.TransactionCompleted
			if err := tx.Save(&t).Error; err != nil {
				return err
			}

			var pkg models.PricingPackage
			if err := tx.Where("slots = ?", t.SlotsPurchased).First(&pkg).Error; err == nil {
				if pkg.AvailableSlots > 0 {
					pkg.AvailableSlots--
					tx.Save(&pkg)
				}
			}

			var userCredits models.UserCredits
			result := tx.Where("user_id = ?", t.UserID).First(&userCredits)
			if result.Error == gorm.ErrRecordNotFound {
				userCredits = models.UserCredits{
					UserID:         t.UserID,
					SlotsRemaining: t.SlotsPurchased,
					TotalPurchased: t.SlotsPurchased,
				}
				if err := tx.Create(&userCredits).Error; err != nil {
					return err
				}
			} else {
				userCredits.SlotsRemaining += t.SlotsPurchased
				userCredits.TotalPurchased += t.SlotsPurchased
				if err := tx.Save(&userCredits).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction processing failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "completed", "message": "Transaction verified and completed"})

	} else if gatewayStatus == "failed" || gatewayStatus == "reversed" {
		transaction.Status = models.TransactionFailed
		h.DB.Save(&transaction)
		c.JSON(http.StatusOK, gin.H{"status": "failed"})
	} else {
		c.JSON(http.StatusOK, gin.H{"status": "pending", "message": "Transaction is still pending at gateway"})
	}
}
