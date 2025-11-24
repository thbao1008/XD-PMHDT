# Quick Start Guide - AESP Microservices

## 🚀 Quick Setup

### 1. Install All Dependencies

```bash
cd backend/services
npm run install:all
```

Hoặc cài đặt từng service:

```bash
cd backend/services/api-gateway && npm install
cd ../notification-service && npm install
cd ../community-service && npm install
cd ../package-service && npm install
cd ../purchase-service && npm install
cd ../user-service && npm install
cd ../mentor-service && npm install
cd ../learner-service && npm install
cd ../admin-service && npm install
```

### 2. Start All Services

**Option 1: Start individually (recommended for development)**

Mở 9 terminals và chạy từng service:

```bash
# Terminal 1: API Gateway
cd backend/services/api-gateway
npm run dev

# Terminal 2: Notification Service
cd backend/services/notification-service
npm run dev

# Terminal 3: Community Service
cd backend/services/community-service
npm run dev

# Terminal 4: Package Service
cd backend/services/package-service
npm run dev

# Terminal 5: Purchase Service
cd backend/services/purchase-service
npm run dev

# Terminal 6: User Service
cd backend/services/user-service
npm run dev

# Terminal 7: Mentor Service
cd backend/services/mentor-service
npm run dev

# Terminal 8: Learner Service
cd backend/services/learner-service
npm run dev

# Terminal 9: Admin Service
cd backend/services/admin-service
npm run dev

# Terminal 10: Legacy Backend (for proxied services)
cd backend
npm run dev:be
```

**Option 2: Start all at once (using script)**
   cd backend/services
   .\start-all-services.ps1
```bash
cd backend/services
node start-all-services.js
```

### 3. Verify Services

Check health endpoints:

- API Gateway: http://localhost:4000/health
- Notification: http://localhost:4001/health
- Community: http://localhost:4002/health
- Package: http://localhost:4003/health
- Purchase: http://localhost:4004/health
- User: http://localhost:4005/health
- Mentor: http://localhost:4006/health
- Learner: http://localhost:4007/health
- Admin: http://localhost:4008/health

### 4. Update Frontend

Update frontend API base URL to use API Gateway:

```javascript
// frontend/src/utils/api.js
const API_BASE_URL = "http://localhost:4000/api";
```

## 📋 Service Ports

| Service | Port | Status |
|---------|------|--------|
| API Gateway | 4000 | ✅ |
| Notification | 4001 | ✅ |
| Community | 4002 | ✅ |
| Package | 4003 | ✅ |
| Purchase | 4004 | ✅ |
| User | 4005 | ✅ |
| Mentor | 4006 | 🔄 |
| Learner | 4007 | 🔄 |
| Admin | 4008 | 🔄 |

## 🔧 Environment Variables

All services use the same environment variables from `.env.local`:

```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=aesp
DB_PORT=5432
JWT_SECRET=secret_key
```

## 🐛 Troubleshooting

### Port Already in Use

If a port is already in use, you can change it in the service's `server.js`:

```javascript
const PORT = process.env.SERVICE_PORT || 400X;
```

### Database Connection Error

Make sure PostgreSQL is running and the database exists:

```bash
# Check PostgreSQL status
# Windows: Check Services
# Linux/Mac: sudo systemctl status postgresql
```

### Service Not Starting

1. Check if dependencies are installed: `npm install`
2. Check for syntax errors in `server.js`
3. Check console logs for error messages
4. Verify database connection

## 📚 Next Steps

1. ✅ All services created
2. ✅ API Gateway routing configured
3. ⏳ Update frontend to use API Gateway
4. ⏳ Gradually migrate Mentor/Learner/Admin services
5. ⏳ Set up Docker Compose
6. ⏳ Add monitoring and logging

