# Microservices Architecture Plan

## Overview
Tài liệu này mô tả kế hoạch bóc tách hệ thống AESP từ monolithic thành microservices architecture.

## Current Architecture (Monolithic)
- **Backend**: Single Express.js application
- **Frontend**: Single React application
- **Database**: Single PostgreSQL database
- **All services**: Combined in one codebase

## Proposed Microservices Architecture

### 1. **API Gateway Service**
- **Purpose**: Single entry point for all client requests
- **Responsibilities**:
  - Request routing to appropriate services
  - Authentication/Authorization
  - Rate limiting
  - Request/Response transformation
  - Load balancing
- **Technology**: Express.js + API Gateway pattern

### 2. **User Service**
- **Purpose**: Manage users, authentication, authorization
- **Responsibilities**:
  - User CRUD operations
  - Authentication (login, logout, JWT)
  - Password management
  - Security questions
  - Avatar management
  - Role management
- **Database**: `users` table
- **API Endpoints**:
  - `/api/users/*`
  - `/api/auth/*`

### 3. **Admin Service**
- **Purpose**: Admin-specific operations
- **Responsibilities**:
  - User management (admin view)
  - Dashboard statistics
  - Reports management
  - Support tickets
  - System configuration
- **Database**: Uses `users`, `reports`, `support_requests` tables
- **API Endpoints**:
  - `/api/admin/*`

### 4. **Package Service**
- **Purpose**: Manage learning packages
- **Responsibilities**:
  - Package CRUD operations
  - Package pricing
  - Package availability
- **Database**: `packages` table
- **API Endpoints**:
  - `/api/packages/*`

### 5. **Purchase Service**
- **Purpose**: Handle package purchases and subscriptions
- **Responsibilities**:
  - Purchase creation
  - Subscription management
  - Renewal handling
  - Package changes
  - Payment processing integration
- **Database**: `purchases` table
- **API Endpoints**:
  - `/api/purchases/*`

### 6. **Mentor Service**
- **Purpose**: Mentor-specific operations
- **Responsibilities**:
  - Mentor profile management
  - Challenge creation
  - Resource management
  - Schedule management
  - Assessment panel
  - Learner assignment
- **Database**: `mentors`, `challenges`, `mentor_resources`, `schedules` tables
- **API Endpoints**:
  - `/api/mentors/*`

### 7. **Learner Service**
- **Purpose**: Learner-specific operations
- **Responsibilities**:
  - Learning catalog
  - Challenge participation
  - Speaking practice
  - Progress tracking
  - Bookmarking
- **Database**: `learners`, `learner_challenges`, `challenge_bookmarks` tables
- **API Endpoints**:
  - `/api/learners/*`

### 8. **Community Service**
- **Purpose**: Community features (Cư Dân AESP)
- **Responsibilities**:
  - Post management
  - Comments
  - Likes
  - Post moderation
  - Media uploads
- **Database**: `community_posts`, `post_comments`, `post_likes`, `post_views` tables
- **API Endpoints**:
  - `/api/community/*`

### 9. **Notification Service**
- **Purpose**: Handle all notifications
- **Responsibilities**:
  - Notification creation
  - Notification delivery
  - Read/unread status
  - Notification preferences
- **Database**: `notifications` table
- **API Endpoints**:
  - `/api/notifications/*`

### 10. **AI Service** (Future)
- **Purpose**: AI-powered features
- **Responsibilities**:
  - Speaking practice AI
  - Story generation
  - Progress analysis
  - Personalized recommendations
- **Technology**: Python + FastAPI (or Node.js)
- **API Endpoints**:
  - `/api/ai/*`

## Communication Patterns

### 1. **Synchronous Communication**
- REST APIs for most operations
- HTTP/HTTPS
- JSON payloads

### 2. **Asynchronous Communication** (Future)
- Message Queue (RabbitMQ / Redis / AWS SQS)
- Event-driven architecture
- For: Notifications, Analytics, Email sending

### 3. **Service Discovery**
- Consul / Eureka / Kubernetes Service Discovery
- Or: Simple DNS-based discovery

## Database Strategy

### Option 1: Database per Service
- Each service has its own database
- Better isolation and scalability
- More complex data consistency

### Option 2: Shared Database (Initial)
- Start with shared database
- Gradually split as needed
- Easier migration path

## Technology Stack

### Services
- **Language**: Node.js (TypeScript recommended)
- **Framework**: Express.js / Fastify
- **Database**: PostgreSQL
- **Cache**: Redis (for sessions, caching)

### API Gateway
- **Technology**: Express.js / Kong / AWS API Gateway
- **Features**: Rate limiting, Authentication, Routing

### Deployment
- **Containerization**: Docker
- **Orchestration**: Docker Compose (dev) / Kubernetes (prod)
- **Service Mesh**: (Optional) Istio / Linkerd

## Migration Strategy

### Phase 1: Preparation
1. ✅ Gộp admin routes thành adminRoutes.js
2. Refactor codebase to separate concerns
3. Create service boundaries
4. Set up API Gateway

### Phase 2: Extract Services (Priority Order)
1. **Notification Service** (Easiest - isolated)
2. **Community Service** (Isolated features)
3. **Package Service** (Simple CRUD)
4. **Purchase Service** (Depends on Package)
5. **User Service** (Core - many dependencies)
6. **Mentor Service** (Complex)
7. **Learner Service** (Complex)
8. **Admin Service** (Depends on others)

### Phase 3: Infrastructure
1. Set up service discovery
2. Implement API Gateway
3. Set up monitoring and logging
4. Implement distributed tracing

### Phase 4: Optimization
1. Add caching layers
2. Implement message queues
3. Optimize database queries
4. Add load balancing

## Benefits

1. **Scalability**: Scale services independently
2. **Maintainability**: Smaller, focused codebases
3. **Technology Diversity**: Use best tool for each service
4. **Team Autonomy**: Teams can work independently
5. **Fault Isolation**: Failure in one service doesn't break others

## Challenges

1. **Complexity**: More moving parts
2. **Network Latency**: Inter-service communication
3. **Data Consistency**: Distributed transactions
4. **Testing**: More complex integration testing
5. **Deployment**: More services to deploy and monitor

## Next Steps

1. Create service directory structure
2. Extract Notification Service first (proof of concept)
3. Set up API Gateway
4. Gradually migrate other services

