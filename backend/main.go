package main

import (
	"log"
	"os"
	"strings"
	"time"

	"checkmate-backend/handlers"
	"checkmate-backend/middleware"
	"checkmate-backend/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite" // Pure Go SQLite
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func main() {
	// Load env
	godotenv.Load()

	// DB Setup
	db, err := gorm.Open(sqlite.Open("checkmate.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Migrate
	db.AutoMigrate(&models.User{}, &models.Order{}, &models.UserCredits{}, &models.Transaction{}, &models.VerificationCode{}, &models.PasswordResetToken{}, &models.PricingPackage{})

	// Seed Packages
	var count int64
	db.Model(&models.PricingPackage{}).Count(&count)
	if count == 0 {
		packages := []models.PricingPackage{
			{Name: "1 Slot", Price: 100, Currency: "KSH", Slots: 1, Features: `["1 Document Check","AI Detection","Plagiarism Scan","Instant Results"]`, Unavailable: false, Highlight: false},
			{Name: "3 Slots", Price: 250, Currency: "KSH", Slots: 3, Features: `["3 Document Checks","AI Detection","Plagiarism Scan","Best Value"]`, Unavailable: false, Highlight: true, Offer: "POPULAR"},
			{Name: "5 Slots", Price: 480, Currency: "KSH", Slots: 5, Features: `["5 Document Checks","AI Detection","Plagiarism Scan","Priority Support"]`, Unavailable: true, Highlight: false},
		}
		db.Create(&packages)
	}

	// Handlers
	authHandler := handlers.NewAuthHandler(db)
	pkgHandler := handlers.NewPackageHandler(db)
	orderHandler := handlers.NewOrderHandler(db)
	paymentHandler := handlers.NewPaymentHandler(db)

	// Start background cleanup job (delete orders older than 5 hours)
	handlers.StartCleanupJob(db, 5)

	// AUTO-PROMOTE ADMIN (If defined in .env)
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail != "" {
		var user models.User
		if err := db.Where("email = ?", adminEmail).First(&user).Error; err == nil {
			if !user.IsAdmin {
				user.IsAdmin = true
				db.Save(&user)
				log.Println("Successfully promoted " + adminEmail + " to admin")
			}
		}
	}

	// Router
	r := gin.Default()

	// CORS
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173" // Default fallback
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Split(origins, ","),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes
	r.POST("/auth/signup", authHandler.Signup)
	r.POST("/auth/login", authHandler.Login)
	r.POST("/auth/otp", authHandler.SendOTP)
	r.POST("/auth/google", authHandler.GoogleLogin)
	r.POST("/auth/forgot-password", authHandler.ForgotPassword)
	r.POST("/auth/reset-password", authHandler.ResetPassword)
	r.GET("/packages", pkgHandler.ListPackages)

	// Protected Routes
	authorized := r.Group("/")
	authorized.Use(middleware.RequireAuth)
	{
		authorized.POST("/upload", orderHandler.Upload)
		authorized.GET("/user/orders", orderHandler.ListOrders)
		authorized.DELETE("/user/orders/:id", orderHandler.DeleteOrder)
		authorized.GET("/download/:filename", orderHandler.Download)

		// Payment routes
		authorized.POST("/payment/initiate", paymentHandler.InitiatePayment)
		authorized.GET("/payment/status/:invoice_id", paymentHandler.CheckPaymentStatus)
		authorized.GET("/user/credits", paymentHandler.GetUserCredits)

		// Admin
		admin := authorized.Group("/admin")
		admin.Use(middleware.RequireAdmin)
		{
			admin.GET("/users", authHandler.AdminListUsers)
			admin.GET("/orders", orderHandler.AdminListOrders)
			admin.POST("/complete/:id", orderHandler.AdminComplete)
			admin.GET("/transactions", paymentHandler.AdminListTransactions)
			admin.POST("/transactions/:reference/verify", paymentHandler.AdminVerifyTransaction)

			// Packages
			admin.GET("/packages", pkgHandler.ListPackages)
			admin.POST("/packages", pkgHandler.AdminCreatePackage)
			admin.PUT("/packages/:id", pkgHandler.AdminUpdatePackage)
			admin.DELETE("/packages/:id", pkgHandler.AdminDeletePackage)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
