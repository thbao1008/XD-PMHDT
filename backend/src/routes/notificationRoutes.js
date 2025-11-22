// backend/src/routes/notificationRoutes.js
import express from "express";
import * as notificationCtrl from "../controllers/notificationController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = express.Router();

router.get("/", authGuard, notificationCtrl.getNotifications);
router.get("/unread-count", authGuard, notificationCtrl.getUnreadCount);
router.patch("/:id/read", authGuard, notificationCtrl.markAsRead);
router.patch("/mark-all-read", authGuard, notificationCtrl.markAllAsRead);

export default router;

