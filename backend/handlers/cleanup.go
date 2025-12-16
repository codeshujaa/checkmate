package handlers

import (
	"checkmate-backend/models"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gorm.io/gorm"
)

// StartCleanupJob starts a background goroutine that deletes old orders
func StartCleanupJob(db *gorm.DB, hoursToKeep int) {
	ticker := time.NewTicker(1 * time.Hour) // Run every hour

	fmt.Printf("Starting auto-cleanup job: will delete orders older than %d hours\n", hoursToKeep)

	go func() {
		for range ticker.C {
			cleanupOldOrders(db, hoursToKeep)
		}
	}()

	// Run immediately on startup
	go cleanupOldOrders(db, hoursToKeep)
}

func cleanupOldOrders(db *gorm.DB, hoursToKeep int) {
	cutoffTime := time.Now().Add(-time.Duration(hoursToKeep) * time.Hour)

	var oldOrders []models.Order
	db.Where("created_at < ?", cutoffTime).Find(&oldOrders)

	if len(oldOrders) == 0 {
		fmt.Printf("[CLEANUP] No orders older than %d hours found\n", hoursToKeep)
		return
	}

	fmt.Printf("[CLEANUP] Found %d orders older than %d hours. Deleting...\n", len(oldOrders), hoursToKeep)

	for _, order := range oldOrders {
		// Delete files from disk
		if order.LocalFilePath != "" {
			if err := os.Remove(order.LocalFilePath); err != nil {
				fmt.Printf("[CLEANUP] Failed to delete file %s: %v\n", order.LocalFilePath, err)
			} else {
				fmt.Printf("[CLEANUP] Deleted file: %s\n", order.LocalFilePath)
			}
		}

		if order.Report1Path != "" {
			reportPath := filepath.Join("uploads", order.Report1Path)
			if err := os.Remove(reportPath); err != nil {
				fmt.Printf("[CLEANUP] Failed to delete report1 %s: %v\n", reportPath, err)
			}
		}

		if order.Report2Path != "" {
			reportPath := filepath.Join("uploads", order.Report2Path)
			if err := os.Remove(reportPath); err != nil {
				fmt.Printf("[CLEANUP] Failed to delete report2 %s: %v\n", reportPath, err)
			}
		}

		// Delete from database
		db.Delete(&order)
	}

	fmt.Printf("[CLEANUP] Successfully deleted %d old orders\n", len(oldOrders))
}
