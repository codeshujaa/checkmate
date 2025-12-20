package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	FirstName    string         `json:"first_name"`
	LastName     string         `json:"last_name"`
	Email        string         `gorm:"uniqueIndex" json:"email"`
	PasswordHash string         `json:"-"` // Never send password back
	IsAdmin      bool           `json:"is_admin"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type OrderStatus string

const (
	StatusPending    OrderStatus = "Pending"
	StatusProcessing OrderStatus = "Processing"
	StatusCompleted  OrderStatus = "Completed"
)

type Order struct {
	ID               uint        `gorm:"primaryKey" json:"id"`
	UserID           uint        `json:"user_id"`
	PaymentRef       string      `json:"payment_ref"` // IntaSend Reference
	Status           OrderStatus `gorm:"default:'Pending'" json:"status"`
	OriginalFilename string      `json:"original_filename"`
	LocalFilePath    string      `json:"local_file_path"` // File path on server

	User User `gorm:"foreignKey:UserID" json:"user"`

	// Admin Added Fields
	AIScore     int    `json:"ai_score"`
	SimScore    int    `json:"sim_score"`
	Report1Path string `json:"report1_path"` // Path to PDF 1
	Report2Path string `json:"report2_path"` // Path to PDF 2

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type DailyLimit struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Date           string    `gorm:"uniqueIndex" json:"date"` // Format: YYYY-MM-DD
	MaxUploads     int       `json:"max_uploads"`             // Admin-configured daily limit
	CurrentUploads int       `json:"current_uploads"`         // Number of uploads today
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UserCredits struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         uint      `gorm:"uniqueIndex" json:"user_id"` // One record per user
	SlotsRemaining int       `json:"slots_remaining"`            // Current slot balance
	TotalPurchased int       `json:"total_purchased"`            // Lifetime purchases
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type TransactionStatus string

const (
	TransactionPending   TransactionStatus = "pending"
	TransactionCompleted TransactionStatus = "completed"
	TransactionFailed    TransactionStatus = "failed"
)

type Transaction struct {
	ID                uint              `gorm:"primaryKey" json:"id"`
	UserID            uint              `json:"user_id"`
	Amount            float64           `json:"amount"`                                 // KES amount
	SlotsPurchased    int               `json:"slots_purchased"`                        // 1, 3, or 5
	PhoneNumber       string            `json:"phone_number"`                           // 254XXXXXXXXX
	CheckoutRequestID string            `gorm:"uniqueIndex" json:"checkout_request_id"` // M-Pesa CheckoutRequestID
	MerchantRequestID string            `json:"merchant_request_id"`                    // M-Pesa MerchantRequestID
	Status            TransactionStatus `gorm:"default:'pending'" json:"status"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
