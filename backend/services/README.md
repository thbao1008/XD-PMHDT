# Microservices Directory Structure

Cấu trúc này sẽ chứa các microservices được tách ra từ monolithic application.

## Structure

```
services/
├── api-gateway/          # API Gateway service
├── user-service/         # User & Auth service
├── admin-service/        # Admin operations service
├── package-service/      # Package management service
├── purchase-service/     # Purchase & Subscription service
├── mentor-service/       # Mentor operations service
├── learner-service/      # Learner operations service
├── community-service/    # Community features service
├── notification-service/ # Notification service
└── ai-service/          # AI features service (future)
```

## Migration Plan

1. **Notification Service** - First to extract (isolated, simple)
2. **Community Service** - Second (isolated features)
3. **Package Service** - Third (simple CRUD)
4. **Purchase Service** - Fourth (depends on Package)
5. **User Service** - Fifth (core, many dependencies)
6. **Mentor Service** - Sixth (complex)
7. **Learner Service** - Seventh (complex)
8. **Admin Service** - Last (depends on all others)

## Each Service Structure

```
service-name/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── config/
├── tests/
├── Dockerfile
├── package.json
└── README.md
```

