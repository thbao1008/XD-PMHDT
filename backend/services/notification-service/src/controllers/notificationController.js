import * as notificationService from "../services/notificationService.js";

export async function getNotifications(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const notifications = await notificationService.getNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({ notifications });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function markAsRead(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, userId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ notification });
  } catch (err) {
    console.error("markAsRead error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id || req.user.userId;
    const notifications = await notificationService.markAllAsRead(userId);
    res.json({ count: notifications.length });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

