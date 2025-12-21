package handlers

import (
	"checkmate-backend/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DailyLimitHandler struct {
	DB *gorm.DB
}

func NewDailyLimitHandler(db *gorm.DB) *DailyLimitHandler {
	return &DailyLimitHandler{DB: db}
}

// GetDailyLimit returns the remaining slots for today
func (h *DailyLimitHandler) GetDailyLimit(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	var limit models.DailyLimit
	result := h.DB.Where("date = ?", today).First(&limit)

	// If no record for today, create one with default limit
	if result.Error == gorm.ErrRecordNotFound {
		limit = models.DailyLimit{
			Date:           today,
			MaxUploads:     0, // Default limit
			CurrentUploads: 0,
		}
		h.DB.Create(&limit)
	}

	remaining := limit.MaxUploads - limit.CurrentUploads
	if remaining < 0 {
		remaining = 0
	}
	c.JSON(http.StatusOK, gin.H{
		"max_uploads":     limit.MaxUploads,
		"current_uploads": limit.CurrentUploads,
		"remaining":       remaining,
		"date":            limit.Date,
	})
}

// SetDailyLimit allows admin to set the daily upload limit
func (h *DailyLimitHandler) SetDailyLimit(c *gin.Context) {
	var body struct {
		MaxUploads int `json:"max_uploads"`
	}

	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if body.MaxUploads < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Max uploads must be >= 0"})
		return
	}

	today := time.Now().Format("2006-01-02")

	var limit models.DailyLimit
	result := h.DB.Where("date = ?", today).First(&limit)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new record
		limit = models.DailyLimit{
			Date:           today,
			MaxUploads:     body.MaxUploads,
			CurrentUploads: 0,
		}
		h.DB.Create(&limit)
	} else {
		// Update existing record
		limit.MaxUploads = body.MaxUploads
		h.DB.Save(&limit)
	}

	remaining := limit.MaxUploads - limit.CurrentUploads
	if remaining < 0 {
		remaining = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"max_uploads":     limit.MaxUploads,
		"current_uploads": limit.CurrentUploads,
		"remaining":       remaining,
		"message":         "Daily limit updated successfully",
	})
}

// IncrementUploadCount increments the upload counter for today
func IncrementUploadCount(db *gorm.DB) error {
	today := time.Now().Format("2006-01-02")

	var limit models.DailyLimit
	result := db.Where("date = ?", today).First(&limit)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new record with default limit
		limit = models.DailyLimit{
			Date:           today,
			MaxUploads:     0, // Default to 0 to enforce admin setup
			CurrentUploads: 1,
		}
		return db.Create(&limit).Error
	}

	limit.CurrentUploads++
	return db.Save(&limit).Error
}

// CheckUploadAllowed checks if uploads are allowed today
func CheckUploadAllowed(db *gorm.DB) (bool, int) {
	today := time.Now().Format("2006-01-02")

	var limit models.DailyLimit
	result := db.Where("date = ?", today).First(&limit)

	if result.Error == gorm.ErrRecordNotFound {
		return false, 0 // Default: block uploads until configured
	}

	remaining := limit.MaxUploads - limit.CurrentUploads
	return remaining > 0, remaining
}
