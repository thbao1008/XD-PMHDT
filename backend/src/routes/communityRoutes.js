// backend/src/routes/communityRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import * as communityCtrl from "../controllers/communityController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = express.Router();

// Configure multer to preserve file extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Preserve original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

/* =========================
   Posts
   ========================= */
router.post("/posts", authGuard, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), communityCtrl.createPost);
router.get("/posts", authGuard, communityCtrl.getPosts);
router.get("/posts/my-posts", authGuard, communityCtrl.getUserPosts); // User's own posts
router.get("/posts/liked", authGuard, communityCtrl.getLikedPosts); // User's liked posts
router.get("/posts/pending", authGuard, communityCtrl.getPendingPosts); // Admin only
router.get("/posts/:id", authGuard, communityCtrl.getPostById);
router.post("/posts/:postId/view", authGuard, communityCtrl.markPostViewed); // Track post view
router.post("/posts/:id/review", authGuard, communityCtrl.reviewPost); // Admin only
router.delete("/posts/:id", authGuard, communityCtrl.deletePost);
router.patch("/posts/:id/pin", authGuard, communityCtrl.togglePinPost); // Admin only

/* =========================
   Comments
   ========================= */
router.post("/posts/:postId/comments", authGuard, upload.single('audio'), communityCtrl.createComment);
router.get("/posts/:postId/comments", authGuard, communityCtrl.getComments);
router.delete("/comments/:id", authGuard, communityCtrl.deleteComment);

/* =========================
   Likes
   ========================= */
router.post("/likes", authGuard, communityCtrl.toggleLike);

export default router;
