# AiESP - Khả năng hiện tại

## 🤖 Tổng quan
**AiESP** (AI phụ trợ của AESP) là một AI được train để học từ OpenRouter và dần thay thế OpenRouter để tiết kiệm chi phí API.

## ✅ Khả năng hiện tại

### 1. **Kiểm tra Translation (Translation Check)**
- **Chức năng**: Kiểm tra xem bản dịch tiếng Việt có đúng với đoạn văn tiếng Anh không
- **Độ chính xác**: 87.2% (đã vượt ngưỡng 85% để sẵn sàng)
- **Cách hoạt động**:
  - Sử dụng pattern matching từ dữ liệu đã học
  - Rule-based checking cho các trường hợp chưa học
  - Kiểm tra độ dài, từ khóa, và ngữ nghĩa
- **Kết quả trả về**:
  ```json
  {
    "correct": true/false,
    "feedback": "Phản hồi bằng tiếng Việt"
  }
  ```

### 2. **Học tập tự động (Auto Learning)**
- **Tự động học từ OpenRouter**: Mỗi khi OpenRouter trả về kết quả, AiESP tự động lưu để học
- **Tự động train**: Train lại mỗi 50 samples mới
- **Continuous Learning**: Có thể chạy liên tục để tạo samples và train tự động

### 3. **Fallback System**
- Khi OpenRouter fail → Tự động chuyển sang AiESP
- Đảm bảo hệ thống luôn hoạt động

### 4. **Pattern Matching**
- Học các patterns từ training data
- So khớp keywords trong English và Vietnamese
- Trả về kết quả dựa trên patterns đã học

### 5. **Rule-based Checking**
- Kiểm tra độ dài translation
- Kiểm tra tỷ lệ từ (không quá ngắn/dài)
- Chấp nhận tương đối (lenient) - không yêu cầu chính xác 100%

## 📊 Trạng thái hiện tại

- ✅ **Accuracy**: 87.2%
- ✅ **Status**: Sẵn sàng (>= 85%)
- 📚 **Training samples**: 43 samples
- 🎯 **Next training**: Khi đạt 50 samples

## 🔄 Quy trình hoạt động

1. **Khi user nhập translation**:
   - Gọi song song OpenRouter và AiESP
   - Ưu tiên OpenRouter response
   - Lưu OpenRouter response để AiESP học

2. **Học tập**:
   - Lưu training data vào database
   - Tự động train khi đủ 50 samples
   - Cập nhật accuracy và model state

3. **Khi đủ thông minh** (accuracy >= 85%):
   - Có thể thay thế OpenRouter
   - Tiết kiệm chi phí API
   - Vẫn học liên tục để cải thiện

## 🚀 Các tính năng đang phát triển

- [ ] Hỗ trợ nhiều task types khác (pronunciation_analysis, etc.)
- [ ] Cải thiện pattern matching
- [ ] Tự động chuyển sang AiESP khi đủ thông minh
- [ ] Real-time learning từ user feedback

## 📝 API Endpoints

- `GET /learners/assistant-ai/status` - Kiểm tra trạng thái
- `GET /learners/assistant-ai/readiness` - Kiểm tra sẵn sàng
- `POST /learners/assistant-ai/train` - Train thủ công

## 🎯 Mục tiêu

- **Tiết kiệm chi phí**: Giảm dependency vào OpenRouter API
- **Tự chủ**: Có AI riêng được train cho nhu cầu cụ thể
- **Liên tục cải thiện**: Accuracy tăng dần theo thời gian

