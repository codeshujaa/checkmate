package main

import (
	"log"
	"os"
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
	db.AutoMigrate(&models.User{}, &models.Order{}, &models.DailyLimit{}, &models.UserCredits{}, &models.Transaction{})

	// Handlers
	authHandler := handlers.NewAuthHandler(db)
	orderHandler := handlers.NewOrderHandler(db)
	dailyLimitHandler := handlers.NewDailyLimitHandler(db)
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
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://checkmateturnit.icu", "https://checkmateturnit.icu", "http://63.176.147.96"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes
	r.POST("/auth/signup", authHandler.Signup)
	r.POST("/auth/login", authHandler.Login)

	// Protected Routes
	authorized := r.Group("/")
	authorized.Use(middleware.RequireAuth)
	{
		authorized.POST("/upload", orderHandler.Upload)
		authorized.GET("/user/orders", orderHandler.ListOrders)
		authorized.DELETE("/user/orders/:id", orderHandler.DeleteOrder)
		authorized.GET("/download/:filename", orderHandler.Download)
		authorized.GET("/daily-limit", dailyLimitHandler.GetDailyLimit)

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
			admin.PUT("/daily-limit", dailyLimitHandler.SetDailyLimit)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
