
﻿# AESP (microservices scaffold)

Các file tạo sẵn: docker-compose.yml, Dockerfile mẫu, infra/nginx/frontend.conf, services/*/Dockerfile, services/auth/.env.example

Chạy local:
1. Cài Docker và Docker Compose.
2. Vào D:\aesp
3. Xây và chạy: docker-compose up --build -d
4. Sau đó: docker compose exec app npm run seed:admin
5. Kiểm tra: docker-compose ps ; docker-compose logs -f reverse-proxy
6. Tắt: docker compose down -v

Lưu ý:
- Tạo file .env riêng cho mỗi service từ .env.example và đặt giá trị thực tế.
- Mỗi service cần code trong services/<service>/src, file entry chạy server tại src/server.js

# XD-PMHDT
<<<<<<< HEAD
=======
Hiện tại source chưa hoàn thiện nên
debug với
"npm run dev:all"

>>>>>>> a278c9cac4c5eb494dd25f845bee4a57b7e42369
