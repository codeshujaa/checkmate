# Checkmate - AI Essay Verification Platform

Checkmate is a full-stack automated essay verification system that allows users to upload documents for similarity checks, AI detection, and plagiarism scanning. It features a credit-based system, Paystack integration for payments, and a robust admin dashboard for managing users and orders.

## Features

### User Features
- **Document Upload**: Users can upload `.pdf`, `.doc`, and `.docx` files.
- **Automated Analysis**: The system queues files for similarity and AI detection analysis.
- **Credit System**: Users purchase "Slots" (credits) to pay for document checks.
- **Pricing & Payments**: Integrated with **Paystack** for seamless M-Pesa mobile money payments.
- **Dashboard**: Real-time view of uploaded files, analysis status, and download reports.
- **Downloads**: Users can download their original files as well as generated AI and Plagiarism reports.

### Admin Features
- **Dashboard**: Overview of recent transactions and platform activity.
- **Order Management**: View, download, and manage user uploads. Upload result reports manually if needed.
- **User Management**: View user details and credit balances.
- **Package Management**: Create and modify pricing packages (slots, prices, features).
- **Transaction Verification**: Manually verify pending payments with Paystack.
- **Notifications**: Real-time sound and visual alerts for new completed payments.

## Tech Stack

### Frontend
- **React.js (Vite)**: Fast and modern UI library.
- **Recharts**: For data visualization (if used).
- **Lucide React**: For beautiful icons.
- **Axios**: For API communication.

### Backend
- **Go (Golang)**: High-performance backend server.
- **Gin**: Web framework for Go.
- **GORM**: ORM for database interactions.
- **SQLite**: Lightweight database (embedded).

### Infrastructure
- **Nginx**: Reverse proxy and web server.
- **Systemd**: Process management on Linux.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Go (v1.20+)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/codeshujaa/checkmate.git
    cd checkmate
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd backend
    go mod download
    ```

4.  **Configuration:**
    - Create a `.env` file in the `backend/` directory based on `.env.example` (if available) or set the following variables:
      ```env
      PORT=8080
      JWT_SECRET=your_jwt_secret
      PAYSTACK_SECRET_KEY=your_paystack_key
      ADMIN_EMAIL=your_admin_email
      SMTP_HOST=your_smtp_host
      SMTP_PORT=587
      SMTP_EMAIL=your_email_address
      SMTP_PASSWORD=your_email_password
      ```

### Running Locally

1.  **Start Backend:**
    ```bash
    cd backend
    go run main.go
    ```

2.  **Start Frontend:**
    ```bash
    # Open a new terminal
    npm run dev
    ```

3.  Open `http://localhost:5173` in your browser.

## Deployment

To build for production:

1.  **Build Frontend:**
    ```bash
    npm run build
    ```

2.  **Build Backend (for Linux):**
    ```bash
    cd backend
    GOOS=linux GOARCH=amd64 go build -o checkmate-backend-linux main.go
    ```

3.  **Upload to Server:**
    - Copy `dist/` folder to `/var/www/html`.
    - Copy `checkmate-backend-linux` to your app directory.
    - Configure Nginx to proxy API requests to port 8080.
