import express from "express";
import {
  getPackages,
  createNewPackage,
  updateExistingPackage,
  deleteExistingPackage,
} from "../controllers/packageController.js";

const router = express.Router();

// ================== Public ==================
router.get("/public", getPackages);

// ================== Admin CRUD ==================
router.get("/", getPackages);
router.post("/", createNewPackage);
router.put("/:id", updateExistingPackage);
router.delete("/:id", deleteExistingPackage);
export default router;
