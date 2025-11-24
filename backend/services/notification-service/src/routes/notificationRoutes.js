import express from "express";
import * as notificationCtrl from "../controllers/notificationController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = express.Router();

router.get("/notifications", authGuard, notificationCtrl.getNotifications);
router.get("/notifications/unread-count", authGuard, notificationCtrl.getUnreadCount);
router.patch("/notifications/:id/read", authGuard, notificationCtrl.markAsRead);
router.patch("/notifications/mark-all-read", authGuard, notificationCtrl.markAllAsRead);

export default router;

