package handlers

import (
	"checkmate-backend/models"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OrderHandler struct {
	DB *gorm.DB
}

func NewOrderHandler(db *gorm.DB) *OrderHandler {
	return &OrderHandler{DB: db}
}

// Upload a file
func (h *OrderHandler) Upload(c *gin.Context) {
	userID, _ := c.Get("userID")
	userIDUint := uint(userID.(float64))

	// Check 1: Daily upload limit (system-wide)
	allowed, dailyRemaining := CheckUploadAllowed(h.DB)
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Daily system upload limit reached",
			"message": "The daily upload quota has been exhausted. Please try again tomorrow.",
		})
		return
	}

	// Check 2: User slots (personal credits)
	hasSlots, userSlots := CheckUserSlots(h.DB, userIDUint)
	if !hasSlots {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Insufficient upload slots",
			"message": "You have 0 upload slots. Please purchase slots to continue.",
			"slots":   0,
		})
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file"})
		return
	}

	// Check file size (10MB limit)
	const maxSize = 10 * 1024 * 1024 // 10MB
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large"})
		return
	}

	// Create a unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%d_%s", userIDUint, timestamp, file.Filename)
	dst := filepath.Join("./uploads", filename)

	// Save file
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Create order record
	order := models.Order{
		UserID:           userIDUint,
		PaymentRef:       "SLOT_UPLOAD",
		Status:           models.StatusPending,
		OriginalFilename: file.Filename,
		LocalFilePath:    dst,
	}

	h.DB.Create(&order)

	// Decrement counters
	IncrementUploadCount(h.DB)
	DecrementUserSlots(h.DB, userIDUint)

	c.JSON(http.StatusOK, gin.H{
		"message":         "File uploaded successfully",
		"order":           order,
		"daily_remaining": dailyRemaining - 1,
		"slots_remaining": userSlots - 1,
	})
}

// ListOrders returns orders for the logged in user
func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID, _ := c.Get("userID")
	var orders []models.Order
	h.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&orders)
	c.JSON(http.StatusOK, orders)
}

// AdminListOrders returns all orders (Admin only)
func (h *OrderHandler) AdminListOrders(c *gin.Context) {
	var orders []models.Order
	// Eager load user data to avoid N+1 queries
	h.DB.Preload("User").Order("created_at desc").Find(&orders)
	c.JSON(http.StatusOK, orders)
}

// AdminComplete uploads results and updates status
func (h *OrderHandler) AdminComplete(c *gin.Context) {
	id := c.Param("id")

	// Check if order exists
	var order models.Order
	if err := h.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Handle Report Uploads
	report1, _ := c.FormFile("report1")
	report2, _ := c.FormFile("report2")

	saveReport := func(fileHeader *multipart.FileHeader) string {
		if fileHeader == nil {
			return ""
		}
		timestamp := time.Now().Unix()
		filename := fmt.Sprintf("report_%s_%d_%s", id, timestamp, fileHeader.Filename)
		dst := filepath.Join("./uploads", filename)
		if err := c.SaveUploadedFile(fileHeader, dst); err != nil {
			return ""
		}
		return filename
	}

	if r1Path := saveReport(report1); r1Path != "" {
		order.Report1Path = r1Path
	}
	if r2Path := saveReport(report2); r2Path != "" {
		order.Report2Path = r2Path
	}

	// Update Scores
	var body struct {
		AIScore  int `form:"ai_score"`
		SimScore int `form:"sim_score"`
	}
	c.Bind(&body)

	order.Status = models.StatusCompleted
	order.AIScore = body.AIScore
	order.SimScore = body.SimScore

	h.DB.Save(&order)
	c.JSON(http.StatusOK, gin.H{"message": "Order completed", "order": order})
}

func (h *OrderHandler) Download(c *gin.Context) {
	filename := c.Param("filename")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// First try direct path (for files with full names like "1_timestamp_filename.ext")
	targetPath := filepath.Join("uploads", filename)
	actualPath := ""
	originalFilename := filename

	if _, err := os.Stat(targetPath); err == nil {
		actualPath = targetPath
	} else {
		// If not found, search for files ending with the original filename
		pattern := filepath.Join("uploads", "*_*_"+filename)
		matches, err := filepath.Glob(pattern)

		if err != nil || len(matches) == 0 {
			fmt.Printf("File not found. Searched for: %s and pattern: %s\n", targetPath, pattern)
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}

		// Use the most recent match
		actualPath = matches[len(matches)-1]
	}

	// SECURITY: Check if user owns a file with this name in their orders
	baseName := filepath.Base(actualPath)
	var count int64
	h.DB.Model(&models.Order{}).Where(
		"user_id = ? AND (local_file_path LIKE ? OR report1_path LIKE ? OR report2_path LIKE ?)",
		userID, "%"+baseName, "%"+baseName, "%"+baseName,
	).Count(&count)

	if count == 0 {
		fmt.Printf("Access denied: User %v attempted to download %s\n", userID, filename)
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Extract original filename from the stored filename
	// Pattern: userID_timestamp_originalFilename OR report_orderID_timestamp_originalFilename
	parts := strings.SplitN(baseName, "_", 3)
	if len(parts) == 3 {
		originalFilename = parts[2]
	}

	// Set Content-Disposition header to suggest the original filename
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", originalFilename))

	fmt.Printf("Download: User %v -> %s -> %s (saved as: %s)\n", userID, filename, actualPath, originalFilename)
	c.File(actualPath)
}

// DeleteOrder allows users to delete their own orders
func (h *OrderHandler) DeleteOrder(c *gin.Context) {
	orderID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Find the order and verify ownership
	var order models.Order
	if err := h.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Verify user owns this order
	if order.UserID != uint(userID.(float64)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own orders"})
		return
	}

	// Delete associated files from disk
	if order.LocalFilePath != "" {
		os.Remove(order.LocalFilePath)
	}
	if order.Report1Path != "" {
		os.Remove(filepath.Join("uploads", order.Report1Path))
	}
	if order.Report2Path != "" {
		os.Remove(filepath.Join("uploads", order.Report2Path))
	}

	// Delete the order from database
	h.DB.Delete(&order)

	c.JSON(http.StatusOK, gin.H{"message": "Order deleted successfully"})
}
