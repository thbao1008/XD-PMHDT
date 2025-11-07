import express from "express";
import {
  getPackages,
  getPackage,
  createNewPackage,
  updatePackageById,
  deletePackageById
} from "../controllers/packageController.js";

const router = express.Router();

// ================== Public ==================
router.get("/public", getPackages);

// ================== Admin CRUD ==================
router.get("/", getPackages);
router.get("/:id", getPackage);
router.post("/", createNewPackage);
router.put("/:id", updatePackageById);
router.delete("/:id", deletePackageById);

export default router;
