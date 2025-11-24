import express from "express";
import * as packageCtrl from "../controllers/packageController.js";
import { authGuard, adminGuard } from "../middleware/authGuard.js";

const router = express.Router();

// Public route (no auth required)
router.get("/packages/public", packageCtrl.getPackages);

// Admin CRUD (requires auth + admin)
router.get("/packages", authGuard, adminGuard, packageCtrl.getPackages);
router.post("/packages", authGuard, adminGuard, packageCtrl.createNewPackage);
router.put("/packages/:id", authGuard, adminGuard, packageCtrl.updateExistingPackage);
router.delete("/packages/:id", authGuard, adminGuard, packageCtrl.deleteExistingPackage);

export default router;

