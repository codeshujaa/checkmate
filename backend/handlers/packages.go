package handlers

import (
	"checkmate-backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PackageHandler struct {
	DB *gorm.DB
}

func NewPackageHandler(db *gorm.DB) *PackageHandler {
	return &PackageHandler{DB: db}
}

// ListPackages (Public)
func (h *PackageHandler) ListPackages(c *gin.Context) {
	var packages []models.PricingPackage
	h.DB.Order("price asc").Find(&packages)
	c.JSON(http.StatusOK, packages)
}

// AdminCreatePackage
func (h *PackageHandler) AdminCreatePackage(c *gin.Context) {
	var pkg models.PricingPackage
	if err := c.BindJSON(&pkg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}
	h.DB.Create(&pkg)
	c.JSON(http.StatusOK, pkg)
}

// AdminUpdatePackage
func (h *PackageHandler) AdminUpdatePackage(c *gin.Context) {
	id := c.Param("id")
	var pkg models.PricingPackage
	if err := h.DB.First(&pkg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Package not found"})
		return
	}

	// Bind to a generic map to handle boolean false updates correctly if needed,
	// but mapping to struct works if we trust the client sends all fields or we manually checks.
	// For "unavailable", if false is sent, it acts as false.
	// Let's use the struct binding.
	if err := c.BindJSON(&pkg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}

	h.DB.Save(&pkg)
	c.JSON(http.StatusOK, pkg)
}

// AdminDeletePackage
func (h *PackageHandler) AdminDeletePackage(c *gin.Context) {
	id := c.Param("id")
	h.DB.Delete(&models.PricingPackage{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
