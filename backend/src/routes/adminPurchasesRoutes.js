// adminPurchasesRoutes.js
import express from "express";
import {
  getAllPurchases,
  listLearnerPurchases,
  createNewPurchase,
  renewPurchaseController,
  changePackageController,

} from "../controllers/purchaseController.js";

const router = express.Router();

// ================== Admin Purchases ==================
router.get("/", getAllPurchases);                  // /api/admin/purchases
router.get("/:learnerId", listLearnerPurchases);   // /api/admin/purchases/:learnerId
router.post("/", createNewPurchase);               // tạo purchase mới
router.patch("/:id/renew", renewPurchaseController);
router.post("/change-package", changePackageController);

export default router;
