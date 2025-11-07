import express from "express";
import {
  listPurchases,
  listUserPurchases,
  createNewPurchase,
  renewPurchaseController,
  changePackageController
} from "../controllers/purchaseController.js";

const router = express.Router();

// ================== Admin ==================
router.get("/", listPurchases);
router.get("/:userId", listUserPurchases);
router.post("/", createNewPurchase);
router.patch("/:id/renew", renewPurchaseController);
router.patch("/:id/change-package", changePackageController);

export default router;
