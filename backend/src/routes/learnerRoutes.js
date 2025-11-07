import express from "express";
import { learnerController } from "../controllers/learnerController.js";

const router = express.Router();

router.get("/", learnerController.getAll);
router.get("/:id", learnerController.getById);
router.post("/", learnerController.create);
router.put("/:id", learnerController.update);
router.delete("/:id", learnerController.delete);

// ✅ Thêm route lấy toàn bộ lịch sử mua
router.get("/:id/purchases", learnerController.getPurchases);

export default router;
