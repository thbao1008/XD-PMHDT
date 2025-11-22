// backend/src/services/communityService.js
import pool from "../config/db.js";

/* =========================
   Posts
   ========================= */

/**
 * Tạo post mới
 * - Admin posts: status = 'approved' (tự động duyệt, không cần chờ)
 * - Learner/Mentor posts: status = 'pending' (cần admin duyệt)
 */
export async function createPost({ authorId, authorRole, title, content, audioUrl = null, imageUrl = null }) {
  // Admin posts được auto-approve, learner/mentor cần duyệt
  const status = authorRole === 'admin' ? 'approved' : 'pending';
  const sql = `
    INSERT INTO community_posts (author_id, author_role, title, content, audio_url, image_url, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;
  const result = await pool.query(sql, [authorId, authorRole, title, content, audioUrl, imageUrl, status]);
  return result.rows[0];
}

/**
 * Lấy danh sách posts (chỉ approved cho public, tất cả cho admin)
 * Ưu tiên hiển thị bài chưa xem trước
 */
export async function getPosts({ userId = null, role = null, includePending = false, page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  let sql = `
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      reviewer.name AS reviewer_name,
      CASE WHEN pv.id IS NULL THEN 0 ELSE 1 END AS is_viewed
    FROM community_posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id
    LEFT JOIN post_views pv ON pv.post_id = p.id AND pv.user_id = ${userId ? '$' + (params.length + 1) : 'NULL'}
    WHERE p.is_deleted = false
  `;
  if (userId) {
    params.push(userId);
  }

  // Nếu không phải admin, chỉ lấy approved posts
  if (!includePending) {
    sql += ` AND p.status = 'approved'`;
  } else if (role !== 'admin') {
    // Nếu là learner/mentor, chỉ thấy approved posts hoặc posts của chính mình
    if (userId) {
      params.push(userId);
      sql += ` AND (p.status = 'approved' OR p.author_id = $${params.length})`;
    } else {
      sql += ` AND p.status = 'approved'`;
    }
  }

  // Ưu tiên: pinned > chưa xem > đã xem, sau đó sắp xếp theo thời gian
  sql += ` ORDER BY p.is_pinned DESC, is_viewed ASC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Track khi user xem một post
 */
export async function markPostAsViewed(userId, postId) {
  const sql = `
    INSERT INTO post_views (user_id, post_id, viewed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, post_id) 
    DO UPDATE SET viewed_at = NOW()
    RETURNING *
  `;
  const result = await pool.query(sql, [userId, postId]);
  return result.rows[0];
}

/**
 * Lấy posts của một user cụ thể (tất cả status)
 */
export async function getUserPosts(userId, { page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const sql = `
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      reviewer.name AS reviewer_name
    FROM community_posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id
    WHERE p.is_deleted = false AND p.author_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(sql, [userId, parseInt(limit), offset]);
  return result.rows;
}

/**
 * Lấy posts đang chờ duyệt (chỉ admin)
 */
export async function getPendingPosts({ page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const sql = `
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      u.role AS author_role
    FROM community_posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.is_deleted = false AND p.status = 'pending'
    ORDER BY p.created_at ASC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(sql, [parseInt(limit), offset]);
  return result.rows;
}

/**
 * Lấy post theo ID
 */
export async function getPostById(postId, { userId = null, role = null } = {}) {
  const sql = `
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      reviewer.name AS reviewer_name
    FROM community_posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id
    WHERE p.id = $1 AND p.is_deleted = false
  `;
  const result = await pool.query(sql, [postId]);
  if (!result.rows[0]) return null;

  const post = result.rows[0];
  // Nếu không phải admin và không phải tác giả, chỉ trả về nếu approved
  if (role !== 'admin' && post.author_id !== userId && post.status !== 'approved') {
    return null;
  }

  return post;
}

/**
 * Admin duyệt/từ chối post
 */
export async function reviewPost({ postId, adminId, action, rejectionReason = null }) {
  if (!['approved', 'rejected'].includes(action)) {
    throw new Error('Invalid action. Must be "approved" or "rejected"');
  }

  const sql = `
    UPDATE community_posts
    SET status = $1,
        rejection_reason = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = $4 AND status = 'pending'
    RETURNING *
  `;
  const result = await pool.query(sql, [action, rejectionReason, adminId, postId]);
  return result.rows[0];
}

/**
 * Xóa post (soft delete)
 */
export async function deletePost(postId, userId, role) {
  const sql = `
    UPDATE community_posts
    SET is_deleted = true, updated_at = NOW()
    WHERE id = $1 AND (author_id = $2 OR $3 = 'admin')
    RETURNING *
  `;
  const result = await pool.query(sql, [postId, userId, role]);
  return result.rows[0];
}

/**
 * Pin/Unpin post (chỉ admin)
 */
export async function togglePinPost(postId, isPinned) {
  const sql = `
    UPDATE community_posts
    SET is_pinned = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(sql, [isPinned, postId]);
  return result.rows[0];
}

/* =========================
   Comments
   ========================= */

/**
 * Tạo comment (không cần duyệt)
 */
export async function createComment({ postId, authorId, authorRole, content = null, audioUrl = null, parentCommentId = null }) {
  if (!content && !audioUrl) {
    throw new Error('Comment must have either content or audioUrl');
  }

  const sql = `
    INSERT INTO post_comments (post_id, author_id, author_role, content, audio_url, parent_comment_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;
  const result = await pool.query(sql, [postId, authorId, authorRole, content, audioUrl, parentCommentId]);
  return result.rows[0];
}

/**
 * Lấy comments của một post
 */
export async function getPostComments(postId, { includeReplies = true } = {}) {
  let sql = `
    SELECT 
      c.*,
      u.name AS author_name,
      u.email AS author_email
    FROM post_comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.post_id = $1 AND c.is_deleted = false
  `;

  if (includeReplies) {
    sql += ` ORDER BY c.parent_comment_id NULLS FIRST, c.created_at ASC`;
  } else {
    sql += ` AND c.parent_comment_id IS NULL ORDER BY c.created_at ASC`;
  }

  const result = await pool.query(sql, [postId]);
  return result.rows;
}

/**
 * Xóa comment (soft delete)
 */
export async function deleteComment(commentId, userId, role) {
  const sql = `
    UPDATE post_comments
    SET is_deleted = true, updated_at = NOW()
    WHERE id = $1 AND (author_id = $2 OR $3 = 'admin')
    RETURNING *
  `;
  const result = await pool.query(sql, [commentId, userId, role]);
  return result.rows[0];
}

/* =========================
   Likes
   ========================= */

/**
 * Toggle like cho post hoặc comment
 */
export async function toggleLike({ userId, postId = null, commentId = null }) {
  if (!postId && !commentId) {
    throw new Error('Must provide either postId or commentId');
  }

  // Kiểm tra đã like chưa
  const checkSql = postId
    ? `SELECT id FROM post_likes WHERE user_id = $1 AND post_id = $2`
    : `SELECT id FROM post_likes WHERE user_id = $1 AND comment_id = $2`;
  const checkParams = postId ? [userId, postId] : [userId, commentId];
  const checkResult = await pool.query(checkSql, checkParams);

  if (checkResult.rows.length > 0) {
    // Đã like, xóa like
    const deleteSql = postId
      ? `DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2 RETURNING *`
      : `DELETE FROM post_likes WHERE user_id = $1 AND comment_id = $2 RETURNING *`;
    await pool.query(deleteSql, checkParams);
    return { liked: false };
  } else {
    // Chưa like, thêm like
    const insertSql = `
      INSERT INTO post_likes (user_id, post_id, comment_id, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    await pool.query(insertSql, [userId, postId, commentId]);
    return { liked: true };
  }
}

/**
 * Kiểm tra user đã like post/comment chưa
 */
export async function checkUserLikes(userId, { postIds = [], commentIds = [] }) {
  const results = { posts: {}, comments: {} };

  if (postIds.length > 0) {
    const sql = `SELECT post_id FROM post_likes WHERE user_id = $1 AND post_id = ANY($2::int[])`;
    const result = await pool.query(sql, [userId, postIds]);
    result.rows.forEach(row => {
      results.posts[row.post_id] = true;
    });
  }

  if (commentIds.length > 0) {
    const sql = `SELECT comment_id FROM post_likes WHERE user_id = $1 AND comment_id = ANY($2::int[])`;
    const result = await pool.query(sql, [userId, commentIds]);
    result.rows.forEach(row => {
      results.comments[row.comment_id] = true;
    });
  }

  return results;
}

/**
 * Lấy các posts đã được user like (yêu thích)
 */
export async function getLikedPosts(userId, { page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const sql = `
    SELECT 
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      reviewer.name AS reviewer_name
    FROM community_posts p
    JOIN post_likes pl ON p.id = pl.post_id
    JOIN users u ON p.author_id = u.id
    LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id
    WHERE pl.user_id = $1 
      AND p.is_deleted = false 
      AND p.status = 'approved'
    ORDER BY pl.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(sql, [userId, parseInt(limit), offset]);
  return result.rows;
}

/**
 * Lấy số lượng pending posts (cho admin dashboard)
 */
export async function getPendingPostsCount() {
  const sql = `SELECT COUNT(*) as count FROM community_posts WHERE status = 'pending' AND is_deleted = false`;
  const result = await pool.query(sql);
  return parseInt(result.rows[0].count);
}

