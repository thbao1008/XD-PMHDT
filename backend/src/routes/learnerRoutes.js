import express from "express";
import {
  getAll,
  getById,
  getPurchases,
  create,
  update,
  remove,
  getLatestPurchase
} from "../controllers/learnerController.js";

const router = express.Router();

// Lấy danh sách learners
router.get("/", getAll);

// Lấy learner theo ID
router.get("/:id", getById);

// Lấy toàn bộ purchases của learner
router.get("/:id/purchases", getPurchases);

// Tạo learner mới (tự động gán mentor ngay trong create)
router.post("/", create);

// Cập nhật learner
router.put("/:id", update);

// Xóa learner
router.delete("/:id", remove);

// Lấy purchase mới nhất của learner
router.get("/:id/latest-purchase", getLatestPurchase);

export default router;