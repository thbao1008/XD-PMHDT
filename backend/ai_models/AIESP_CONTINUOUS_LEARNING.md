# AiESP Continuous Learning System

## Tổng quan

AiESP tự học liên tục từ OpenRouter (giáo viên), với hệ thống monitoring và tự động cải thiện để đạt trình độ cao nhất.

## Kiến trúc

### 1. OpenRouter = Giáo viên
- OpenRouter phản hồi user và dạy AiESP
- Mỗi OpenRouter response được lưu vào `assistant_ai_training` để AiESP học

### 2. AiESP = Học sinh
- AiESP là nhân tố phản hồi chính
- Học từ OpenRouter responses liên tục
- Tự động train và cải thiện

### 3. Continuous Learning System = Hệ thống giám sát
- Tự động kiểm tra training data mới
- Tự động train khi đủ điều kiện
- Đánh giá và cải thiện model
- Monitoring performance liên tục

## Cách hoạt động

### Flow học tập

```
User Message
    ↓
AiESP phản hồi (nhân tố chính)
    ↓
OpenRouter phản hồi song song (giáo viên dạy)
    ↓
Lưu OpenRouter response vào database
    ↓
Continuous Learning System kiểm tra
    ↓
Tự động train khi đủ 50 samples
    ↓
Đánh giá và cải thiện model
    ↓
AiESP trở nên thông minh hơn
```

### Điều kiện training

1. **Có 50+ samples mới**: Tự động train
2. **Accuracy < 70% và có 20+ samples**: Train để cải thiện
3. **Có 100+ samples**: Force train (bất kể accuracy)

### Đánh giá performance

- **Excellent (≥95%)**: Model đã đạt trình độ cao
- **Very Good (≥85%)**: Model tốt, tiếp tục training
- **Good (≥70%)**: Model ổn, cần thêm data
- **Fair (≥50%)**: Model cần cải thiện
- **Poor (<50%)**: Model yếu, cần nhiều data hơn

## Sử dụng

### 1. Start Continuous Learning

```bash
npm run aiesp:learn
```

Hệ thống sẽ:
- Kiểm tra mỗi 5 phút (300 giây)
- Tự động train các task types cần train
- Monitor và đánh giá performance
- Log kết quả training

### 2. Monitor Models

```bash
npm run aiesp:monitor
```

Xem trạng thái tất cả models:
- Accuracy hiện tại
- Số lượng training samples
- Số samples mới chưa train
- Trạng thái sẵn sàng

### 3. Manual Check & Train

```bash
npm run aiesp:check
```

Kiểm tra và train tất cả task types nếu cần.

### 4. Train một task type cụ thể

```bash
python backend/ai_models/aiespContinuousLearning.py train conversation_ai
```

## Task Types được hỗ trợ

1. **conversation_ai**: TellMeYourStory
2. **translation_check**: Kiểm tra translation
3. **speaking_practice**: Speaking practice (sẽ phát triển)

## Monitoring

Hệ thống tự động log:
- ✅ Training thành công với accuracy improvement
- ⏭️ Skipped training (chưa đủ điều kiện)
- 📊 Performance metrics
- 🎯 Recommendations

## Tự động cải thiện

1. **Tự động train**: Khi đủ điều kiện
2. **Đánh giá accuracy**: So sánh trước/sau training
3. **Performance grading**: Excellent, Very Good, Good, Fair, Poor
4. **Recommendations**: Gợi ý cải thiện
5. **Target tracking**: Theo dõi distance to 95% accuracy

## Lợi ích

1. **Tự động hóa**: Không cần can thiệp thủ công
2. **Liên tục**: Học từ mỗi interaction
3. **Thông minh**: Tự động đánh giá và cải thiện
4. **Mở rộng**: Dễ thêm task types mới
5. **Monitoring**: Theo dõi performance liên tục

## Best Practices

1. **Chạy continuous learning 24/7**: Để AiESP học liên tục
2. **Monitor định kỳ**: Kiểm tra performance mỗi ngày
3. **Review recommendations**: Xem gợi ý cải thiện
4. **Thêm training data**: Nếu accuracy thấp, cần thêm data

## Troubleshooting

### Model không cải thiện
- Kiểm tra training data quality
- Review patterns trong model_state
- Tăng số lượng training samples

### Training timeout
- Tăng timeout trong code (hiện tại 5 phút)
- Giảm số lượng patterns (hiện tại 200)

### Accuracy giảm
- Review training logic
- Kiểm tra data quality
- Có thể cần rollback về model cũ

