# AESP Microservices Overview

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │
│  (Port 5173)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│        API Gateway (4000)           │
│  Routes requests to services        │
└──────┬──────────────────────────────┘
       │
       ├──► Notification Service (4001) ✅
       ├──► Community Service (4002) ✅
       ├──► Package Service (4003) ✅
       ├──► Purchase Service (4004) ✅
       ├──► User Service (4005) ✅
       ├──► Mentor Service (4006) 🔄
       ├──► Learner Service (4007) 🔄
       └──► Admin Service (4008) 🔄
```

## 📋 Services Details

### ✅ Fully Migrated Services

#### 1. API Gateway (Port 4000)
- **Purpose:** Routes all API requests to appropriate microservices
- **Features:**
  - Request routing
  - CORS handling
  - Authentication header forwarding
  - Health check endpoint

#### 2. Notification Service (Port 4001)
- **Purpose:** Manages all notifications
- **Endpoints:**
  - `GET /notifications` - Get user notifications
  - `GET /notifications/unread-count` - Get unread count
  - `POST /notifications/:id/read` - Mark as read
  - `POST /notifications/read-all` - Mark all as read

#### 3. Community Service (Port 4002)
- **Purpose:** Community posts, comments, likes
- **Endpoints:**
  - `POST /community/posts` - Create post
  - `GET /community/posts` - Get posts
  - `POST /community/posts/:id/comments` - Create comment
  - `POST /community/likes` - Toggle like
  - File upload support (images, videos, audio)

#### 4. Package Service (Port 4003)
- **Purpose:** Learning package management
- **Endpoints:**
  - `GET /packages/public` - Get all packages (public)
  - `GET /packages` - Get packages (admin)
  - `POST /packages` - Create package (admin)
  - `PUT /packages/:id` - Update package (admin)
  - `DELETE /packages/:id` - Delete package (admin)

#### 5. Purchase Service (Port 4004)
- **Purpose:** Subscription and purchase management
- **Endpoints:**
  - `GET /purchases` - Get all purchases (admin)
  - `GET /purchases/:learnerId` - Get learner purchases
  - `POST /purchases` - Create purchase
  - `PATCH /purchases/:id/renew` - Renew purchase
  - `POST /purchases/change-package` - Change package

#### 6. User Service (Port 4005)
- **Purpose:** Authentication and user management
- **Endpoints:**
  - **Auth:**
    - `POST /auth/register` - Register
    - `POST /auth/login` - Login
    - `POST /auth/forgot-password` - Request password reset
    - `POST /auth/verify-security-answer` - Verify security answer
    - `POST /auth/reset-password` - Reset password
    - `GET /auth/profile` - Get profile
    - `POST /auth/change-password` - Change password
    - `GET /auth/security-question` - Get security question
    - `POST /auth/security-question` - Set security question
  - **Users (Admin):**
    - `GET /admin/users` - List users
    - `GET /admin/users/:id` - Get user
    - `POST /admin/users` - Create user
    - `PUT /admin/users/:id` - Update user
    - `DELETE /admin/users/:id` - Delete user
    - `POST /admin/users/:id/avatar` - Upload avatar

### 🔄 Proxied Services (Gradual Migration)

#### 7. Mentor Service (Port 4006)
- **Status:** Proxying to legacy backend
- **Will handle:**
  - Mentor resources
  - Challenges
  - Schedules
  - Learner assignments
  - Reports

#### 8. Learner Service (Port 4007)
- **Status:** Proxying to legacy backend
- **Will handle:**
  - Learning catalog
  - Practice history
  - Bookmarked challenges
  - Progress tracking

#### 9. Admin Service (Port 4008)
- **Status:** Proxying to legacy backend
- **Will handle:**
  - Dashboard stats
  - User management
  - Reports
  - Support tickets

## 🔐 Authentication

All services use JWT authentication:
- Token passed in `Authorization: Bearer <token>` header
- JWT_SECRET must be consistent across all services
- Token contains: `{ id, email, phone, role, name }`

## 📊 Database

Currently all services share the same PostgreSQL database:
- **Host:** localhost (or `db` in Docker)
- **Database:** aesp
- **Future:** Database per service (recommended for production)

## 🚀 Deployment

### Development
- Run each service individually or use `start-all-services.js`
- All services connect to local PostgreSQL

### Production (Future)
- Use Docker Compose
- Each service in separate container
- Database per service
- Service discovery and load balancing
- Monitoring and logging

## 📝 Notes

- **Proxied Services:** Mentor, Learner, and Admin services currently proxy to legacy backend. This allows gradual migration without breaking changes.
- **File Uploads:** Community service handles file uploads. Other services will need similar setup if required.
- **CORS:** All services have CORS enabled for `http://localhost:5173`
- **Health Checks:** All services have `/health` endpoint

