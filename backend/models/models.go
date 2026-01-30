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
	PasswordHash string         `json:"-"`
	IsAdmin      bool           `json:"is_admin"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Credits UserCredits `gorm:"foreignKey:UserID" json:"credits"`
}

type VerificationCode struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"index"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time
}

type PasswordResetToken struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"index"`
	Token     string    `gorm:"uniqueIndex"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time
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
	PaymentRef       string      `json:"payment_ref"`
	Status           OrderStatus `gorm:"default:'Pending'" json:"status"`
	OriginalFilename string      `json:"original_filename"`
	LocalFilePath    string      `json:"-"`

	User User `gorm:"foreignKey:UserID" json:"user"`

	// Admin Added Fields
	AIScore     int    `json:"ai_score"`
	SimScore    int    `json:"sim_score"`
	Report1Path string `json:"report1_path"`
	Report2Path string `json:"report2_path"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type PricingPackage struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Name           string    `json:"name"`
	Price          float64   `json:"price"`
	Currency       string    `json:"currency"` // Default KSH
	Slots          int       `json:"slots"`
	Features       string    `json:"features"` // JSON string array
	Unavailable    bool      `json:"unavailable"`
	Highlight      bool      `json:"highlight"`
	Offer          string    `json:"offer"`           // e.g. "POPULAR"
	AvailableSlots int       `json:"available_slots"` // Inventory: how many can be purchased
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
	ID             uint    `gorm:"primaryKey" json:"id"`
	UserID         uint    `json:"user_id"`
	Amount         float64 `json:"amount"`
	SlotsPurchased int     `json:"slots_purchased"`
	PhoneNumber    string  `json:"phone_number"`

	PaymentReference  string            `gorm:"uniqueIndex" json:"payment_reference"` // Paystack Reference
	ProviderReference string            `json:"provider_reference"`                   // Paystack Internal ID (optional)
	Status            TransactionStatus `gorm:"default:'pending'" json:"status"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type PushSubscription struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"` // Encryption key
	Auth      string    `json:"auth"`   // Auth secret
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

