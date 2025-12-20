package main

import (
	"checkmate-backend/models"
	"flag"
	"fmt"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func main() {
	emailPtr := flag.String("email", "", "Email of the user to promote to admin")
	flag.Parse()

	if *emailPtr == "" {
		log.Fatal("Please provide an email using -email flag")
	}

	dbPath := "checkmate.db"
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	var user models.User
	result := db.Where("email = ?", *emailPtr).First(&user)
	if result.Error != nil {
		log.Fatalf("User not found: %v", result.Error)
	}

	user.IsAdmin = true
	db.Save(&user)

	fmt.Printf("Successfully promoted user %s to admin!\n", user.Email)
}
