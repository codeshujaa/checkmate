package handlers

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"checkmate-backend/models"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	db              *gorm.DB
	vapidPublicKey  string
	vapidPrivateKey string
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	handler := &NotificationHandler{db: db}
	handler.initVAPIDKeys()
	return handler
}

// Initialize VAPID keys (generate if not exist)
func (h *NotificationHandler) initVAPIDKeys() {
	publicKey := os.Getenv("VAPID_PUBLIC_KEY")
	privateKey := os.Getenv("VAPID_PRIVATE_KEY")

	if publicKey == "" || privateKey == "" {
		log.Println("Generating new VAPID keys...")
		privateKeyEC, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			log.Fatal("Failed to generate VAPID keys:", err)
		}

		// Convert to base64
		privateKeyBytes := privateKeyEC.D.Bytes()
		publicKeyBytes := elliptic.Marshal(elliptic.P256(), privateKeyEC.X, privateKeyEC.Y)

		h.vapidPrivateKey = base64.RawURLEncoding.EncodeToString(privateKeyBytes)
		h.vapidPublicKey = base64.RawURLEncoding.EncodeToString(publicKeyBytes)

		log.Println("VAPID Public Key:", h.vapidPublicKey)
		log.Println("VAPID Private Key:", h.vapidPrivateKey)
		log.Println("Add these to your .env file:")
		log.Printf("VAPID_PUBLIC_KEY=%s\n", h.vapidPublicKey)
		log.Printf("VAPID_PRIVATE_KEY=%s\n", h.vapidPrivateKey)
	} else {
		h.vapidPublicKey = publicKey
		h.vapidPrivateKey = privateKey
		log.Println("Using existing VAPID keys from .env")
	}
}

// Get VAPID public key (for frontend)
func (h *NotificationHandler) GetVAPIDPublicKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"publicKey": h.vapidPublicKey,
	})
}

// Subscribe to notifications
func (h *NotificationHandler) Subscribe(c *gin.Context) {
	userID, _ := c.Get("userID")
	userIDUint := uint(userID.(float64))

	var req struct {
		Subscription string `json:"subscription"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Parse subscription
	var sub struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	if err := json.Unmarshal([]byte(req.Subscription), &sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription format"})
		return
	}

	// Check if this DEVICE subscription already exists (by endpoint)
	// This allows multiple devices per user
	var existing models.PushSubscription
	result := h.db.Where("endpoint = ?", sub.Endpoint).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new subscription for this device
		pushSub := models.PushSubscription{
			UserID:   userIDUint,
			Endpoint: sub.Endpoint,
			P256dh:   sub.Keys.P256dh,
			Auth:     sub.Keys.Auth,
		}
		if err := h.db.Create(&pushSub).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save subscription"})
			return
		}
	} else {
		// Update existing subscription for this device
		existing.UserID = userIDUint
		existing.P256dh = sub.Keys.P256dh
		existing.Auth = sub.Keys.Auth
		if err := h.db.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subscription"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subscribed successfully"})
}

// Unsubscribe from notifications
func (h *NotificationHandler) Unsubscribe(c *gin.Context) {
	userID, _ := c.Get("userID")
	userIDUint := uint(userID.(float64))

	if err := h.db.Where("user_id = ?", userIDUint).Delete(&models.PushSubscription{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unsubscribe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed successfully"})
}

// Send notification to all admin subscriptions
func (h *NotificationHandler) SendToAdmins(title, body, url string) {
	// Get all admin users
	var admins []models.User
	if err := h.db.Where("is_admin = ?", true).Find(&admins).Error; err != nil {
		log.Println("Error fetching admins:", err)
		return
	}

	if len(admins) == 0 {
		return
	}

	// Get subscriptions for all admins
	var adminIDs []uint
	for _, admin := range admins {
		adminIDs = append(adminIDs, admin.ID)
	}

	var subscriptions []models.PushSubscription
	if err := h.db.Where("user_id IN ?", adminIDs).Find(&subscriptions).Error; err != nil {
		log.Println("Error fetching subscriptions:", err)
		return
	}

	// Send to each subscription
	for _, sub := range subscriptions {
		go h.sendNotification(sub, title, body, url)
	}
}

// Send notification to a specific subscription
func (h *NotificationHandler) sendNotification(sub models.PushSubscription, title, body, url string) {
	// Create notification payload
	payload := map[string]string{
		"title": title,
		"body":  body,
		"url":   url,
	}
	payloadBytes, _ := json.Marshal(payload)

	// Create subscription object
	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	// Send notification
	vapidSubject := os.Getenv("VAPID_SUBJECT")
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@checkmateturnit.icu"
	}

	resp, err := webpush.SendNotification(payloadBytes, subscription, &webpush.Options{
		Subscriber:      vapidSubject,
		VAPIDPublicKey:  h.vapidPublicKey,
		VAPIDPrivateKey: h.vapidPrivateKey,
		TTL:             30,
	})

	if err != nil {
		log.Printf("Error sending notification: %v", err)
		// If subscription is invalid (410 Gone), delete it
		if resp != nil && resp.StatusCode == 410 {
			h.db.Delete(&sub)
		}
		return
	}
	defer resp.Body.Close()
}
