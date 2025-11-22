-- Cập nhật view learner_package_view để không trừ thời gian khi bị ban hoặc paused
-- Khi status = 'paused' hoặc user status = 'banned', thời gian học sẽ không bị trừ

DROP VIEW IF EXISTS public.learner_package_view;

CREATE VIEW public.learner_package_view AS
SELECT 
    l.id AS learner_id,
    u.name AS learner_name,
    u.email,
    u.phone,
    u.dob,
    l.mentor_id,
    l.start_date,
    l.note,
    p.id AS purchase_id,
    p.status,
    p.created_at,
    p.renewed_at,
    p.changed_at,
    (COALESCE(p.expiry_date, (p.created_at + ((pkg.duration_days || ' days'::text))::interval)) + ((p.extra_days || ' days'::text))::interval) AS expiry_date,
    pkg.id AS package_id,
    pkg.name AS package_name,
    pkg.price,
    pkg.duration_days,
    -- Tính days_left: không trừ thời gian khi paused hoặc banned
    -- Khi paused/banned, thời gian học sẽ bị "đóng băng" (không trừ ngày)
    -- Khi active lại, thời gian sẽ tiếp tục từ expiry_date cũ
    CASE
        -- Nếu purchase status = 'paused' hoặc user status = 'banned', không tính days_left (đóng băng thời gian)
        WHEN (p.status = 'paused'::public.purchase_status OR u.status = 'banned'::character varying) THEN NULL::double precision
        -- Nếu purchase status = 'expired', trả về 0
        WHEN (p.status = 'expired'::public.purchase_status) THEN 0::double precision
        -- Nếu đã hết hạn (expiry_date < NOW()), trả về 0
        WHEN (COALESCE(p.expiry_date, (p.created_at + ((pkg.duration_days || ' days'::text))::interval)) + ((p.extra_days || ' days'::text))::interval) < NOW() THEN 0::double precision
        -- Tính số ngày còn lại cho purchase active
        ELSE GREATEST(
            0::double precision, 
            date_part('day'::text, 
                ((COALESCE(p.expiry_date, (p.created_at + ((pkg.duration_days || ' days'::text))::interval)) + ((p.extra_days || ' days'::text))::interval)::timestamp with time zone - NOW())
            )
        )
    END AS days_left
FROM 
    ((public.learners l
    JOIN public.users u ON (l.user_id = u.id))
    LEFT JOIN public.purchases p ON (p.learner_id = l.id))
    LEFT JOIN public.packages pkg ON (p.package_id = pkg.id);

COMMENT ON VIEW public.learner_package_view IS 'View hiển thị thông tin learner và package. Khi purchase status = paused hoặc user status = banned, days_left sẽ là NULL (không trừ thời gian)';

