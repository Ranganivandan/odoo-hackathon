# Expense Management System - API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Users](#users)
3. [Expenses](#expenses)
4. [Approvals](#approvals)
5. [Companies](#companies)
6. [Currencies](#currencies)
7. [OCR](#ocr)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)

## Authentication

### Register User
Creates a new user and company on first signup.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "country": "United States"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company and admin user created successfully",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "company": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "John Doe's Company",
        "country": "United States",
        "currency": "USD",
        "currencySymbol": "$"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
Authenticates user and returns JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "company": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "John Doe's Company",
        "country": "United States",
        "currency": "USD",
        "currencySymbol": "$"
      },
      "lastLogin": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get User Profile
Retrieves current user's profile information.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "company": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "John Doe's Company",
        "country": "United States",
        "currency": "USD",
        "currencySymbol": "$"
      },
      "manager": null,
      "isManagerApprover": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Users

### Get All Users (Admin Only)
Retrieves all users in the company with pagination.

**Endpoint:** `GET /api/users`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `search` (optional): Search by name or email

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "admin",
        "manager": null,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1
    }
  }
}
```

### Create User (Admin Only)
Creates a new user in the company.

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "email": "employee@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "employee",
  "manager": "64f1a2b3c4d5e6f7g8h9i0j1",
  "isManagerApprover": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "email": "employee@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "employee",
      "manager": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com"
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Expenses

### Submit Expense
Submits a new expense with optional receipt upload.

**Endpoint:** `POST /api/expenses`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `amount`: Number (required)
- `currency`: String (required, 3-letter code)
- `category`: String (required)
- `description`: String (required)
- `expenseDate`: Date (required, ISO string)
- `tags`: String (optional, comma-separated)
- `isUrgent`: Boolean (optional)
- `receipt`: File (optional, image or PDF)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Expense submitted successfully",
  "data": {
    "expense": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j4",
      "employee": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "employee@example.com"
      },
      "amount": 50.00,
      "currency": "USD",
      "amountInCompanyCurrency": 50.00,
      "exchangeRate": 1.0,
      "category": "Meals & Entertainment",
      "description": "Business lunch with client",
      "expenseDate": "2024-01-15T00:00:00.000Z",
      "status": "pending",
      "currentApprover": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com"
      },
      "receipt": {
        "filename": "receipt-1234567890.jpg",
        "originalName": "lunch_receipt.jpg",
        "path": "./uploads/receipt-1234567890.jpg",
        "mimeType": "image/jpeg",
        "size": 245760
      },
      "ocrData": {
        "extractedText": "RESTAURANT ABC\n123 Main St\nDate: 01/15/2024\nTotal: $50.00",
        "confidence": 0.95,
        "extractedAmount": 50.00,
        "extractedDate": "2024-01-15T00:00:00.000Z",
        "extractedMerchant": "RESTAURANT ABC",
        "extractedCategory": "Meals & Entertainment"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Get My Expenses
Retrieves current user's expenses with filtering and pagination.

**Endpoint:** `GET /api/expenses/my-expenses`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j4",
        "amount": 50.00,
        "currency": "USD",
        "amountInCompanyCurrency": 50.00,
        "category": "Meals & Entertainment",
        "description": "Business lunch with client",
        "expenseDate": "2024-01-15T00:00:00.000Z",
        "status": "pending",
        "currentApprover": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "user@example.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1
    }
  }
}
```

### Get Pending Approvals
Retrieves expenses pending approval for managers/admins.

**Endpoint:** `GET /api/expenses/pending-approval`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `employee` (optional): Filter by employee ID
- `category` (optional): Filter by category
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Headers:**
```
Authorization: Bearer <manager-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j4",
        "employee": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j3",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "employee@example.com"
        },
        "amount": 50.00,
        "currency": "USD",
        "amountInCompanyCurrency": 50.00,
        "category": "Meals & Entertainment",
        "description": "Business lunch with client",
        "expenseDate": "2024-01-15T00:00:00.000Z",
        "status": "pending",
        "currentApprover": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "user@example.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1
    }
  }
}
```

## Approvals

### Approve/Reject Expense
Approves or rejects an expense assigned to the current user.

**Endpoint:** `PUT /api/approvals/:id/action`

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Approved for reimbursement"
}
```

**Headers:**
```
Authorization: Bearer <manager-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Expense approved successfully",
  "data": {
    "expense": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j4",
      "status": "approved",
      "finalApproval": {
        "approvedBy": "64f1a2b3c4d5e6f7g8h9i0j1",
        "approvedAt": "2024-01-15T11:00:00.000Z",
        "finalComments": "Approved for reimbursement"
      },
      "currentApprover": null
    }
  }
}
```

### Get Approval History
Retrieves approval history for an expense.

**Endpoint:** `GET /api/approvals/:id/history`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "approvalHistory": [
      {
        "approver": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "user@example.com"
        },
        "sequence": 1,
        "status": "approved",
        "comments": "Approved for reimbursement",
        "approvedAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "finalApproval": {
      "approvedBy": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com"
      },
      "approvedAt": "2024-01-15T11:00:00.000Z",
      "finalComments": "Approved for reimbursement"
    },
    "currentStatus": "approved"
  }
}
```

### Bulk Approve/Reject
Performs bulk approval or rejection of multiple expenses.

**Endpoint:** `PUT /api/approvals/bulk-action`

**Request Body:**
```json
{
  "expenseIds": ["64f1a2b3c4d5e6f7g8h9i0j4", "64f1a2b3c4d5e6f7g8h9i0j5"],
  "action": "approve",
  "comments": "Bulk approved"
}
```

**Headers:**
```
Authorization: Bearer <manager-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk approve completed",
  "data": {
    "results": [
      {
        "expenseId": "64f1a2b3c4d5e6f7g8h9i0j4",
        "status": "success"
      },
      {
        "expenseId": "64f1a2b3c4d5e6f7g8h9i0j5",
        "status": "success"
      }
    ]
  }
}
```

## Companies

### Get Company Details
Retrieves company information.

**Endpoint:** `GET /api/companies`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "name": "John Doe's Company",
      "country": "United States",
      "currency": "USD",
      "currencySymbol": "$",
      "address": {
        "street": "123 Business St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "United States"
      },
      "contactInfo": {
        "phone": "+1-555-0123",
        "email": "info@company.com",
        "website": "https://company.com"
      },
      "settings": {
        "expenseCategories": [
          {
            "name": "Meals & Entertainment",
            "description": "Food and entertainment expenses",
            "isActive": true
          }
        ]
      }
    }
  }
}
```

### Get Expense Categories
Retrieves active expense categories.

**Endpoint:** `GET /api/companies/categories`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Meals & Entertainment",
        "description": "Food and entertainment expenses",
        "isActive": true
      },
      {
        "name": "Travel",
        "description": "Travel related expenses",
        "isActive": true
      }
    ]
  }
}
```

## Currencies

### Get Countries and Currencies
Retrieves all countries with their currencies.

**Endpoint:** `GET /api/currencies/countries`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "countries": [
      {
        "name": "United States",
        "currency": "USD",
        "currencyName": "US Dollar",
        "symbol": "$"
      },
      {
        "name": "United Kingdom",
        "currency": "GBP",
        "currencyName": "British Pound",
        "symbol": "£"
      }
    ]
  }
}
```

### Convert Currency
Converts amount from one currency to another.

**Endpoint:** `POST /api/currencies/convert`

**Request Body:**
```json
{
  "amount": 100,
  "fromCurrency": "USD",
  "toCurrency": "EUR"
}
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalAmount": 100,
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "convertedAmount": 85.50,
    "exchangeRate": 0.855
  }
}
```

## OCR

### Extract Text from Image
Extracts text from uploaded image using OCR.

**Endpoint:** `POST /api/ocr/extract-text`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: File (required, image or PDF)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "extractedText": "RESTAURANT ABC\n123 Main St\nDate: 01/15/2024\nTotal: $50.00",
    "confidence": 0.95,
    "filename": "receipt.jpg"
  }
}
```

### Extract Receipt Data
Extracts structured data from receipt image.

**Endpoint:** `POST /api/ocr/extract-receipt-data`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image`: File (required, image or PDF)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "extractedText": "RESTAURANT ABC\n123 Main St\nDate: 01/15/2024\nTotal: $50.00",
    "confidence": 0.95,
    "extractedAmount": 50.00,
    "extractedDate": "2024-01-15T00:00:00.000Z",
    "extractedMerchant": "RESTAURANT ABC",
    "extractedCategory": "Meals & Entertainment",
    "filename": "receipt.jpg"
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Validation Errors

When validation fails, the API returns detailed error messages:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Email is required",
    "Password must be at least 6 characters long"
  ]
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit information is included in response headers
- **Exceeded**: Returns 429 status code when limit is exceeded

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642252800
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiration

- Default expiration: 7 days
- Configurable via `JWT_EXPIRE` environment variable
- Refresh token not implemented (logout and re-login required)

### Role-Based Access

The API implements role-based access control:

- **Admin**: Full access to all endpoints
- **Manager**: Access to team management and approval workflows
- **Employee**: Access to own expenses and profile

### Permission Matrix

| Endpoint | Admin | Manager | Employee |
|----------|-------|---------|----------|
| User Management | ✅ | ❌ | ❌ |
| Expense Submission | ✅ | ✅ | ✅ |
| Expense Approval | ✅ | ✅ | ❌ |
| Company Settings | ✅ | ❌ | ❌ |
| OCR Processing | ✅ | ✅ | ✅ |
| Currency Conversion | ✅ | ✅ | ✅ |
