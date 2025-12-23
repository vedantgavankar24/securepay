# SecurePay: Immutable Fintech Ledger & Security Audit System

SecurePay is a production-grade backend system designed for financial integrity and security transparency. While primarily developed for **Assignment 2 (Ledger & Audit Trail)**, it incorporates high-level features from **Assignment 1 (Authentication & RBAC)** to provide a complete, secure environment for financial transactions.

### Video Demonstration Link : https://drive.google.com/file/d/12b7f5tADUbODNL38dTN7VadWwDm6RrM4/view?usp=sharing

## 🚀 Project Overview

This project demonstrates a "Security-First" approach to fintech backend engineering. It ensures that every financial movement is not only executed accurately but is also permanently recorded in an immutable ledger and shadowed by a security audit trail.

### Key Focus Areas:
- **Financial Integrity**: Double-entry bookkeeping logic ensures balance consistency.
- **Traceability**: Comprehensive logging of both financial and administrative actions.
- **Security**: Robust protection against common vulnerabilities like negative amount transfers and unauthorized privilege escalation.

## ✨ Features

### 1. Immutable Financial Ledger (Assignment 2)
- **Transaction Snapshots**: Every entry records `senderBalanceAfter` and `receiverBalanceAfter`, allowing for point-in-time recovery and verification.
- **Data Integrity**: Backend validation ensures users cannot transfer more than their current balance or send negative/zero amounts.

### 2. Security Audit Trail (Assignment 2)
- **Automatic Event Capture**: Logs all critical actions including `LOGIN`, `FAILED_LOGIN`, `REGISTRATION`, and `TRANSFER`.
- **Compliance Ready**: Built-in CSV Export functionality for all audit logs and ledger entries.
- **Admin Visibility**: A dedicated dashboard for administrators to monitor system-wide security events.

### 3. Authentication & Role Based Access Control (RBAC) (Assignment 1 Integration)
- **JWT-Based Auth**: Secure session management using JSON Web Tokens.
- **Role-Based Access**: 
  - **Users**: Manage personal funds and view personal transaction history.
  - **Admins**: Overlook global system health, view all users, and access the full audit trail.



## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Security**: Bcrypt.js (Password Hashing), JWT (Stateless Auth)
- **Frontend**: React.js & Tailwind CSS (Audit & Transaction Dashboard)
- **Icons**: Lucide-React

## 🏗️ Data Models

### Transaction Ledger
```javascript
{
  senderUserId: String,
  receiverUserId: String,
  amount: Number,
  senderBalanceAfter: Number,
  receiverBalanceAfter: Number,
  timestamp: Date
}
```

### Audit Log Schema
The audit trail tracks user behavior and system events to detect anomalies or unauthorized attempts.
``` javascript
{
  userId: { type: String, required: true },
  action: { type: String }, // e.g., 'TRANSFER'
  status: { type: String }, // 'SUCCESS' or 'FAILURE'
  details: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
}
```

## Getting started
### Prerequisites
- Node.js (v14 or higher)
- MongoDB (Local or Atlas)

## Installation
### 1. Clone the repository
```Bash
git clone https://github.com/vedantgavankar24/securepay.git
```
### 2. Install dependencies
```Bash
npm install
```
### 3. Configure Environment Variables 
Create a .env file in the root directory:
```Code snippet
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```
### 4. Start the server
```Bash
npm start
```

## Security Implementation Details
-  **Atomic transactions:** Transfers are processed with strict checks to ensure no data is lost if a database error occurs mid-process.
-  **Anti-Pull Logic:** Strict validation ensures that amount must be a positive number. This prevents users from initiating a "transfer" of -100 to effectively steal funds from a recipient.
-  **Audit Immutability:** The audit trail is designed to be "Append-Only" to prevent history tampering.
-  **Sanitized Exports:** CSV generation logic strips potential malicious characters to prevent CSV Injection attacks.

## 📊 API Reference:

| **Method** | **Endpoint**      | **Access** | **Description**                                        |
| ---------- | ----------------- | ---------- | ------------------------------------------------------ |
| `POST`     | `/api/register`   | Public     | Register a new user                                    |
| `POST`     | `/api/login`      | Public     | Authenticate and receive JWT                           |
| `POST`     | `/api/transfer`   | User       | Execute fund transfer between accounts                 |
| `GET`      | `/api/ledger`     | User/Admin | Retrieve transaction history (filtered by role/owner)  |
| `GET`      | `/api/audit-logs` | User/Admin | Retrieve security audit trail (filtered by role/owner) |
| `GET`      | `/api/users`      | Admin      | List all registered users in the system                |
| `GET`      | `/api/me`         | User       | Displays current balance by fetching it from database  |


## AI Tool Usage:

| **Date**   | **Tool Used** | **Purpose**                            | **Outcome**                                                                           |
|------------|---------------|----------------------------------------|---------------------------------------------------------------------------------------|
| 21st Dec   | Gemini        | Ensuring data privacy and integrity    | Applied role and user-specific filtering on data fetched from the API                 |
| 21st Dec   | Gemini        | Security Auditing                      | Implemented *Anti-Pull* validation to prevent negative amount transfers via API       |
| 22nd Dec   | Gemini        | UI/UX Design                           | Refined dashboard layout using Tailwind CSS for better accessibility and font scaling |
| 23rd Dec   | Chatgpt       | Documentation                          | Readme file formatting                                                                |

### AI effectiveness score: 4.5/5
**Justification:** Logic optimization through AI saved time (~2 hours), but manual testing revealed loopholes, which had to be fixed later.

- Developed as part of the Backend Engineering Selection Process.

- Focus: Data Consistency, Security Auditing, and Clean Architecture.

### Author: Vedant Gavankar
