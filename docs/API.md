# API Documentation

## Base URL
```
Production: https://your-domain.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

All protected endpoints require authentication via NextAuth session.

### Get Nonce for Wallet Signing

```http
POST /api/auth/nonce
Content-Type: application/json

{
  "address": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123..."
  }
}
```

## User Endpoints

### Get Current User

```http
GET /api/user
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "address": "0x...",
    "settings": {
      "maxCopyPercentage": 10,
      "minTradeAmount": 1,
      "maxOpenPositions": 50
    }
  }
}
```

### Update User Settings

```http
PATCH /api/user/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "maxCopyPercentage": 15,
  "minTradeAmount": 5,
  "maxOpenPositions": 25
}
```

## Trade Endpoints

### Create Trade

```http
POST /api/trades
Authorization: Bearer <token>
Content-Type: application/json

{
  "marketId": "market-123",
  "outcomeIndex": 0,
  "side": "BUY",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "trade-id",
    "status": "PENDING",
    "amount": 100,
    "shares": 200,
    "price": 0.5
  }
}
```

### Get User Trades

```http
GET /api/trades?limit=50&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [...],
    "total": 150
  }
}
```

### Get Trade Details

```http
GET /api/trades/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "trade-id",
    "marketTitle": "Will BTC reach $100k?",
    "side": "BUY",
    "amount": 100,
    "status": "COMPLETED",
    "copiedTrades": [...]
  }
}
```

### Get Copied Trades

```http
GET /api/trades/copied?limit=50&offset=0
Authorization: Bearer <token>
```

## Market Endpoints

### Get Markets

```http
GET /api/markets?limit=20&active=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "market-123",
      "title": "Will BTC reach $100k?",
      "volume": 1000000,
      "outcomes": ["Yes", "No"],
      "outcomesPrices": [0.65, 0.35]
    }
  ]
}
```

### Get Market Details

```http
GET /api/markets/:id
```

## Follow Endpoints

### Follow Trader

```http
POST /api/follow
Authorization: Bearer <token>
Content-Type: application/json

{
  "followingId": "user-id"
}
```

### Get Following

```http
GET /api/follow?type=following
Authorization: Bearer <token>
```

### Get Followers

```http
GET /api/follow?type=followers
Authorization: Bearer <token>
```

### Unfollow Trader

```http
DELETE /api/follow/:id
Authorization: Bearer <token>
```

### Update Copy Settings

```http
PATCH /api/follow/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true,
  "copyPercentage": 50,
  "minTradeSize": 10
}
```

## Notification Endpoints

### Get Notifications

```http
GET /api/notifications?unread=true&limit=50
Authorization: Bearer <token>
```

### Mark as Read

```http
PATCH /api/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["id1", "id2"]
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user

## Webhooks (Coming Soon)

Subscribe to events:
- `trade.executed`
- `trade.failed`
- `follower.new`
- `position.closed`

---

For questions or support, contact api@example.com
