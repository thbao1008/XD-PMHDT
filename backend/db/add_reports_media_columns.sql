-- Thêm cột image_url và video_url vào bảng reports (nếu chưa có)
-- Chạy script này để hỗ trợ upload image/video khi report mentor

-- Kiểm tra và thêm cột image_url
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE reports ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Đã thêm cột image_url vào bảng reports';
    ELSE
        RAISE NOTICE 'Cột image_url đã tồn tại';
    END IF;
END $$;

-- Kiểm tra và thêm cột video_url
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'video_url'
    ) THEN
        ALTER TABLE reports ADD COLUMN video_url TEXT;
        RAISE NOTICE 'Đã thêm cột video_url vào bảng reports';
    ELSE
        RAISE NOTICE 'Cột video_url đã tồn tại';
    END IF;
END $$;

