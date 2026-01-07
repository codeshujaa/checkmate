package handlers

import (
	"checkmate-backend/models"
	crand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/smtp"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB *gorm.DB
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var body struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		Code      string `json:"code"`
	}

	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// Verify OTP
	var vc models.VerificationCode
	if err := h.DB.Where("email = ? AND code = ?", body.Email, body.Code).First(&vc).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code"})
		return
	}
	if time.Now().After(vc.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code expired"})
		return
	}
	// Consume Code
	h.DB.Delete(&vc)

	// Check if this is the defined admin email
	adminEmail := os.Getenv("ADMIN_EMAIL")
	isAdmin := false
	if adminEmail != "" && body.Email == adminEmail {
		isAdmin = true // Auto-promote if matches .env
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		FirstName:    body.FirstName,
		LastName:     body.LastName,
		Email:        body.Email,
		PasswordHash: string(hash),
		IsAdmin:      isAdmin,
	}

	result := h.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create user (email might be taken)"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User created successfully"})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var body struct {
		Email    string
		Password string
	}

	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// Look up requested user
	var user models.User
	h.DB.First(&user, "email = ?", body.Email)

	if user.ID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or password"})
		return
	}

	// Compare pass
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or password"})
		return
	}

	// Auto-promote to admin if email matches ADMIN_EMAIL
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail != "" && user.Email == adminEmail && !user.IsAdmin {
		user.IsAdmin = true
		h.DB.Save(&user)
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"admin": user.IsAdmin,
		"exp":   time.Now().Add(time.Hour * 24 * 30).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"is_admin": user.IsAdmin,
		},
	})
}

// AdminListUsers returns all users with their credits
func (h *AuthHandler) AdminListUsers(c *gin.Context) {
	var users []models.User
	// Preload Credits to get slot info
	if err := h.DB.Preload("Credits").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// SendOTP generates and emails a code
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email"})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := h.DB.Select("id").Where("email = ?", body.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered. Please login."})
		return
	}

	// Generate 6 digit Code
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Delete old codes
	h.DB.Where("email = ?", body.Email).Delete(&models.VerificationCode{})

	// Save new code
	vc := models.VerificationCode{
		Email:     body.Email,
		Code:      code,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	if err := h.DB.Create(&vc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save code"})
		return
	}

	// Send Email via SMTP
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	if from == "" || password == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SMTP credentials missing in env"})
		return
	}

	msg := "From: " + from + "\n" +
		"To: " + body.Email + "\n" +
		"Subject: Checkmate Verification Code\n\n" +
		"Your verification code is: " + code

	auth := smtp.PlainAuth("", from, password, host)
	err := smtp.SendMail(host+":"+port, auth, from, []string{body.Email}, []byte(msg))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent"})
}

// GoogleLogin handles Sign in with Google
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var body struct {
		Credential string `json:"credential"`
	}
	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing credential"})
		return
	}

	// Verify ID Token with Google
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + body.Credential)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to connect to Google"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google Token"})
		return
	}

	var claims struct {
		Email      string `json:"email"`
		Sub        string `json:"sub"`
		GivenName  string `json:"given_name"`
		FamilyName string `json:"family_name"`
		Aud        string `json:"aud"`
	}
	json.NewDecoder(resp.Body).Decode(&claims)

	// Optional: Check Client ID
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID != "" && claims.Aud != clientID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token audience mismatch"})
		return
	}

	// Find or Create User
	var user models.User
	h.DB.First(&user, "email = ?", claims.Email)

	if user.ID == 0 {
		user = models.User{
			Email:        claims.Email,
			FirstName:    claims.GivenName,
			LastName:     claims.FamilyName,
			PasswordHash: "", // No password
			IsAdmin:      false,
		}
		if err := h.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"admin": user.IsAdmin,
		"exp":   time.Now().Add(time.Hour * 24 * 30).Unix(),
	})
	tokenString, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"is_admin": user.IsAdmin,
		},
	})
}

// ForgotPassword handles reset request
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
	}
	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email"})
		return
	}

	// Check if user exists (silently proceed if not found for security)
	var user models.User
	if err := h.DB.Where("email = ?", body.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Reset link sent"})
		return
	}

	// Generate Token
	bytes := make([]byte, 32)
	crand.Read(bytes)
	token := hex.EncodeToString(bytes)

	// Save Token
	h.DB.Where("email = ?", body.Email).Delete(&models.PasswordResetToken{})

	rt := models.PasswordResetToken{
		Email:     body.Email,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	h.DB.Create(&rt)

	// Send Email
	// Ideally use Env Var for Frontend URL
	baseURL := os.Getenv("APP_URL")
	if baseURL == "" {
		baseURL = "https://checkmateturnit.icu"
	}
	link := baseURL + "/reset-password?token=" + token

	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	if from != "" {
		msg := "From: " + from + "\n" +
			"To: " + body.Email + "\n" +
			"Subject: Password Reset Request\n\n" +
			"Click link to reset password:\n\n" +
			link + "\n\n" +
			"Link expires in 1 hour."

		auth := smtp.PlainAuth("", from, password, host)
		go smtp.SendMail(host+":"+port, auth, from, []string{body.Email}, []byte(msg))
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reset link sent"})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var body struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify Token
	var rt models.PasswordResetToken
	if err := h.DB.Where("token = ?", body.Token).First(&rt).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired token"})
		return
	}

	if time.Now().After(rt.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token expired"})
		return
	}

	// Update User Password
	hash, _ := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 10)

	if err := h.DB.Model(&models.User{}).Where("email = ?", rt.Email).Update("password_hash", string(hash)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Consume Token
	h.DB.Delete(&rt)

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}
