# AESP (microservices scaffold)

Các file tạo sẵn: docker-compose.yml, Dockerfile mẫu, infra/nginx/frontend.conf, services/*/Dockerfile, services/auth/.env.example

Chạy local:
1. Cài Docker và Docker Compose.
2. Vào D:\aesp
3. Xây và chạy: docker-compose up --build -d
4. Kiểm tra: docker-compose ps ; docker-compose logs -f reverse-proxy

Lưu ý:
- Tạo file .env riêng cho mỗi service từ .env.example và đặt giá trị thực tế.
- Mỗi service cần code trong services/<service>/src, file entry chạy server tại src/server.js
