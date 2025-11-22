// backend/src/controllers/communityController.js
import * as communityService from "../services/communityService.js";
import * as notificationService from "../services/notificationService.js";
import pool from "../config/db.js";

/* =========================
   Helper Functions
   ========================= */

function formatPostUrls(post, baseUrl) {
  return {
    ...post,
    audio_url: post.audio_url?.startsWith("/") ? `${baseUrl}${post.audio_url}` : post.audio_url,
    image_url: post.image_url?.startsWith("/") ? `${baseUrl}${post.image_url}` : post.image_url
  };
}

function formatPostsUrls(posts, baseUrl) {
  return posts.map(post => formatPostUrls(post, baseUrl));
}

/* =========================
   Posts
   ========================= */

export async function createPost(req, res) {
  try {
    const userId = req.user.id || req.user.userId; // JWT token có field 'id'
    const { role } = req.user;
    const { title, content } = req.body;

    // Handle file uploads
    let finalAudioUrl = null;
    let finalImageUrl = null;

    if (req.files) {
      if (req.files.audio && req.files.audio[0]) {
        finalAudioUrl = `${req.protocol}://${req.get("host")}/uploads/${req.files.audio[0].filename}`;
      }
      // Image hoặc video đều lưu vào image_url (database chỉ có image_url)
      if (req.files.image && req.files.image[0]) {
        finalImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        finalImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.files.video[0].filename}`;
      }
    }

    // Also check body for audioUrl/imageUrl (for backward compatibility)
    if (!finalAudioUrl && req.body.audioUrl) {
      finalAudioUrl = req.body.audioUrl;
    }
    if (!finalImageUrl && req.body.imageUrl) {
      finalImageUrl = req.body.imageUrl;
    }

    if (!content && !finalAudioUrl && !finalImageUrl) {
      return res.status(400).json({ message: "Post must have content, audio, or image/video" });
    }

    // Xác định author_role từ role (cho phép learner, mentor, và admin)
    const authorRole = role === 'learner' ? 'learner' : role === 'mentor' ? 'mentor' : role === 'admin' ? 'admin' : null;
    if (!authorRole) {
      return res.status(403).json({ message: "Invalid role" });
    }

    const post = await communityService.createPost({
      authorId: userId,
      authorRole,
      title: title || null,
      content: content || '',
      audioUrl: finalAudioUrl,
      imageUrl: finalImageUrl
    });

    // Nếu admin đăng bài, gửi thông báo cho tất cả users
    if (authorRole === 'admin') {
      try {
        const allUserIds = await notificationService.getAllUserIds(userId);
        const authorName = req.user.name || "Người quản trị";
        await notificationService.createNotificationsForUsers({
          userIds: allUserIds,
          type: 'post_approved',
          title: '📢 Thông báo từ người quản trị',
          message: `${authorName} đã đăng một bài viết mới: "${(title || content || 'Bài viết mới').substring(0, 50)}${(title || content || '').length > 50 ? '...' : ''}"`,
          relatedPostId: post.id,
          relatedUserId: userId
        });
      } catch (notifErr) {
        console.error("Error creating notifications for admin post:", notifErr);
        // Không fail request nếu notification lỗi
      }
    }

    const message = authorRole === 'admin' 
      ? "Post đã được đăng thành công" 
      : "Post đã được gửi, đang chờ admin duyệt";
    res.status(201).json({ post, message });
  } catch (err) {
    console.error("createPost error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getPosts(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const role = req.user?.role;
    const { page = 1, limit = 20 } = req.query;
    // Admin feed cũng chỉ hiển thị approved posts (giống learner/mentor)
    // Để xem pending posts, admin phải vào phần "Quản lý bài đăng"
    const includePending = false;

    const posts = await communityService.getPosts({
      userId,
      role,
      includePending,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Format URLs to absolute URLs
    const baseUrl = req.protocol + "://" + req.get("host");
    const formattedPosts = posts.map(post => ({
      ...post,
      audio_url: post.audio_url?.startsWith("/") ? `${baseUrl}${post.audio_url}` : post.audio_url,
      image_url: post.image_url?.startsWith("/") ? `${baseUrl}${post.image_url}` : post.image_url
    }));

    // Lấy likes của user cho các posts
    const postIds = formattedPosts.map(p => p.id);
    const userLikes = userId ? await communityService.checkUserLikes(userId, { postIds }) : { posts: {} };

    const postsWithLikes = formattedPosts.map(post => ({
      ...post,
      is_liked: userLikes.posts[post.id] || false
    }));

    res.json({ posts: postsWithLikes });
  } catch (err) {
    console.error("getPosts error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function markPostViewed(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { postId } = req.params;
    
    if (!userId || !postId) {
      return res.status(400).json({ message: "Missing userId or postId" });
    }

    await communityService.markPostAsViewed(userId, parseInt(postId));
    res.json({ message: "Post marked as viewed" });
  } catch (err) {
    console.error("markPostViewed error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getPostById(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const role = req.user?.role;
    const { id } = req.params;

    const post = await communityService.getPostById(parseInt(id), { userId, role });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Format URLs
    const baseUrl = req.protocol + "://" + req.get("host");
    const formattedPost = formatPostUrls(post, baseUrl);

    // Lấy comments
    const comments = await communityService.getPostComments(parseInt(id));
    const commentIds = comments.map(c => c.id);
    const userLikes = userId ? await communityService.checkUserLikes(userId, { commentIds }) : { comments: {} };

    const commentsWithLikes = comments.map(comment => ({
      ...comment,
      is_liked: userLikes.comments[comment.id] || false
    }));

    // Kiểm tra user đã like post chưa
    const postLikes = userId ? await communityService.checkUserLikes(userId, { postIds: [formattedPost.id] }) : { posts: {} };
    formattedPost.is_liked = postLikes.posts[formattedPost.id] || false;

    res.json({ post: formattedPost, comments: commentsWithLikes });
  } catch (err) {
    console.error("getPostById error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getPendingPosts(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: "Only admins can view pending posts" });
    }

    const { page = 1, limit = 20 } = req.query;
    const posts = await communityService.getPendingPosts({
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Format URLs
    const baseUrl = req.protocol + "://" + req.get("host");
    const formattedPosts = formatPostsUrls(posts, baseUrl);

    res.json({ posts: formattedPosts });
  } catch (err) {
    console.error("getPendingPosts error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getUserPosts(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    
    const posts = await communityService.getUserPosts(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Format URLs
    const baseUrl = req.protocol + "://" + req.get("host");
    const formattedPosts = formatPostsUrls(posts, baseUrl);

    // Filter by status if provided
    let filteredPosts = formattedPosts;
    if (status && status !== 'all') {
      filteredPosts = formattedPosts.filter(p => p.status === status);
    }

    // Lấy likes của user cho các posts
    const postIds = filteredPosts.map(p => p.id);
    const userLikes = await communityService.checkUserLikes(userId, { postIds });

    const postsWithLikes = filteredPosts.map(post => ({
      ...post,
      is_liked: userLikes.posts[post.id] || false
    }));

    res.json({ posts: postsWithLikes });
  } catch (err) {
    console.error("getUserPosts error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function reviewPost(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    if (role !== 'admin') {
      return res.status(403).json({ message: "Only admins can review posts" });
    }

    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be 'approved' or 'rejected'" });
    }

    if (action === 'rejected' && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required when rejecting a post" });
    }

    const post = await communityService.reviewPost({
      postId: parseInt(id),
      adminId: userId,
      action,
      rejectionReason: rejectionReason || null
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found or already reviewed" });
    }

    // Tạo notification cho post author
    try {
      const adminName = req.user.name || "Người quản trị";
      if (action === 'approved') {
        await notificationService.createNotification({
          userId: post.author_id,
          type: 'post_approved',
          title: '✅ Bài viết của bạn đã được duyệt',
          message: `${adminName} đã duyệt bài viết của bạn: "${(post.title || post.content || 'Bài viết').substring(0, 50)}${(post.title || post.content || '').length > 50 ? '...' : ''}"`,
          relatedPostId: post.id,
          relatedUserId: userId
        });
      } else {
        await notificationService.createNotification({
          userId: post.author_id,
          type: 'post_rejected',
          title: '❌ Bài viết của bạn đã bị từ chối',
          message: `${adminName} đã từ chối bài viết của bạn. Lý do: ${rejectionReason || 'Không có lý do'}`,
          relatedPostId: post.id,
          relatedUserId: userId
        });
      }
    } catch (notifErr) {
      console.error("Error creating notification for review:", notifErr);
    }

    res.json({ post, message: `Post đã được ${action === 'approved' ? 'duyệt' : 'từ chối'}` });
  } catch (err) {
    console.error("reviewPost error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function deletePost(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    const { id } = req.params;

    const post = await communityService.deletePost(parseInt(id), userId, role);
    if (!post) {
      return res.status(404).json({ message: "Post not found or unauthorized" });
    }

    res.json({ message: "Post đã được xóa" });
  } catch (err) {
    console.error("deletePost error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function togglePinPost(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: "Only admins can pin posts" });
    }

    const { id } = req.params;
    const { isPinned } = req.body;

    const post = await communityService.togglePinPost(parseInt(id), isPinned);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ post, message: `Post đã được ${isPinned ? 'ghim' : 'bỏ ghim'}` });
  } catch (err) {
    console.error("togglePinPost error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

/* =========================
   Comments
   ========================= */

export async function createComment(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    const { postId } = req.params;
    const { content, audioUrl, parentCommentId } = req.body;

    // Handle file upload
    let finalAudioUrl = audioUrl || null;
    if (req.file) {
      finalAudioUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    if (!content && !finalAudioUrl) {
      return res.status(400).json({ message: "Comment must have content or audio" });
    }

    const authorRole = role === 'learner' ? 'learner' : role === 'mentor' ? 'mentor' : role === 'admin' ? 'admin' : null;
    if (!authorRole) {
      return res.status(403).json({ message: "Invalid role" });
    }

    const comment = await communityService.createComment({
      postId: parseInt(postId),
      authorId: userId,
      authorRole,
      content: content || null,
      audioUrl: finalAudioUrl,
      parentCommentId: parentCommentId ? parseInt(parentCommentId) : null
    });

    // Lấy thông tin post và parent comment để tạo notifications
    const post = await communityService.getPostById(parseInt(postId));
    let parentComment = null;
    if (parentCommentId) {
      const comments = await communityService.getPostComments(parseInt(postId));
      parentComment = comments.find(c => c.id === parseInt(parentCommentId));
    }

    // Tạo notifications
    try {
      const commenterName = req.user.name || "Người dùng";
      const isAdmin = authorRole === 'admin';
      const adminTag = isAdmin ? ' [Người quản trị]' : '';
      
      // Notification cho post author (nếu không phải chính họ)
      if (post && post.author_id !== userId) {
        await notificationService.createNotification({
          userId: post.author_id,
          type: 'comment_added',
          title: `💬 Có người bình luận bài viết của bạn${adminTag}`,
          message: `${commenterName}${adminTag} đã bình luận vào bài viết của bạn: "${(post.title || post.content || 'Bài viết').substring(0, 50)}${(post.title || post.content || '').length > 50 ? '...' : ''}"`,
          relatedPostId: post.id,
          relatedCommentId: comment.id,
          relatedUserId: userId
        });
      }

      // Notification cho parent comment author (nếu là reply)
      if (parentComment && parentComment.author_id !== userId && post.author_id !== parentComment.author_id) {
        await notificationService.createNotification({
          userId: parentComment.author_id,
          type: 'comment_replied',
          title: `↩️ Có người trả lời bình luận của bạn${adminTag}`,
          message: `${commenterName}${adminTag} đã trả lời bình luận của bạn`,
          relatedPostId: post.id,
          relatedCommentId: comment.id,
          relatedUserId: userId
        });
      }
    } catch (notifErr) {
      console.error("Error creating notifications for comment:", notifErr);
    }

    res.status(201).json({ comment, message: "Comment đã được đăng" });
  } catch (err) {
    console.error("createComment error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getComments(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const comments = await communityService.getPostComments(parseInt(postId));
    const commentIds = comments.map(c => c.id);
    const userLikes = userId ? await communityService.checkUserLikes(userId, { commentIds }) : { comments: {} };

    const commentsWithLikes = comments.map(comment => ({
      ...comment,
      is_liked: userLikes.comments[comment.id] || false
    }));

    res.json({ comments: commentsWithLikes });
  } catch (err) {
    console.error("getComments error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function deleteComment(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    const { id } = req.params;

    const comment = await communityService.deleteComment(parseInt(id), userId, role);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found or unauthorized" });
    }

    res.json({ message: "Comment đã được xóa" });
  } catch (err) {
    console.error("deleteComment error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

/* =========================
   Likes
   ========================= */

export async function toggleLike(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const { postId, commentId } = req.body;

    if (!postId && !commentId) {
      return res.status(400).json({ message: "Must provide either postId or commentId" });
    }

    const result = await communityService.toggleLike({ userId, postId, commentId });
    
    // Tạo notification khi like (không tạo khi unlike)
    if (result.liked) {
      try {
        let targetAuthorId = null;
        
        if (postId) {
          const post = await communityService.getPostById(postId);
          if (post && post.author_id !== userId) {
            targetAuthorId = post.author_id;
          }
        } else if (commentId) {
          // Cần lấy postId từ comment để query
          const commentResult = await pool.query(
            'SELECT post_id, author_id FROM post_comments WHERE id = $1',
            [commentId]
          );
          if (commentResult.rows[0] && commentResult.rows[0].author_id !== userId) {
            targetAuthorId = commentResult.rows[0].author_id;
          }
        }

        if (targetAuthorId) {
          const likerName = req.user.name || "Người dùng";
          const isAdmin = req.user.role === 'admin';
          const adminTag = isAdmin ? ' [Người quản trị]' : '';
          await notificationService.createNotification({
            userId: targetAuthorId,
            type: 'post_liked',
            title: postId ? `❤️ Có người thích bài viết của bạn${adminTag}` : `❤️ Có người thích bình luận của bạn${adminTag}`,
            message: `${likerName}${adminTag} đã thích ${postId ? 'bài viết' : 'bình luận'} của bạn`,
            relatedPostId: postId || null,
            relatedCommentId: commentId || null,
            relatedUserId: userId
          });
        }
      } catch (notifErr) {
        console.error("Error creating notification for like:", notifErr);
      }
    }
    
    res.json(result);
  } catch (err) {
    console.error("toggleLike error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function getLikedPosts(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const posts = await communityService.getLikedPosts(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Format URLs
    const baseUrl = req.protocol + "://" + req.get("host");
    const formattedPosts = formatPostsUrls(posts, baseUrl);

    // Lấy likes của user cho các posts (tất cả đều đã được like)
    const postIds = formattedPosts.map(p => p.id);
    const userLikes = await communityService.checkUserLikes(userId, { postIds });

    const postsWithLikes = formattedPosts.map(post => ({
      ...post,
      is_liked: userLikes.posts[post.id] || true // Tất cả đều đã được like
    }));

    res.json({ posts: postsWithLikes });
  } catch (err) {
    console.error("getLikedPosts error - communityController.js", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
