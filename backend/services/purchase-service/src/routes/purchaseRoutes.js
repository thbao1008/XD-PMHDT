import express from "express";
import * as purchaseCtrl from "../controllers/purchaseController.js";
import { authGuard, adminGuard } from "../middleware/authGuard.js";

const router = express.Router();

router.get("/purchases", authGuard, adminGuard, purchaseCtrl.getAllPurchases);
router.get("/purchases/:learnerId", authGuard, adminGuard, purchaseCtrl.listLearnerPurchases);
router.post("/purchases", authGuard, adminGuard, purchaseCtrl.createNewPurchase);
router.patch("/purchases/:id/renew", authGuard, adminGuard, purchaseCtrl.renewPurchaseController);
router.post("/purchases/change-package", authGuard, adminGuard, purchaseCtrl.changePackageController);

export default router;

