import express from "express";
import { getAll, getById, getPurchases, create, update, remove,getLatestPurchase  } 
  from "../controllers/learnerController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/:id", getById);
router.get("/:id/purchases", getPurchases);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);
router.get("/:id/latest-purchase", getLatestPurchase);
export default router;
