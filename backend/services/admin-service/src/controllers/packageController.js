import {
  createPackage,
  updatePackage,
  deletePackage,
  getAllPackages
} from "../models/packageModel.js";

export async function createNewPackage(req, res) {
  try {
    const pkg = await createPackage(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    console.error("❌ Lỗi POST package: - packageController.js:13", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function updateExistingPackage(req, res) {
  try {
    const { id } = req.params;
    const pkg = await updatePackage(id, req.body);
    res.json(pkg);
  } catch (err) {
    console.error("❌ Lỗi PUT package: - packageController.js:24", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function deleteExistingPackage(req, res) {
  try {
    const { id } = req.params;
    await deletePackage(id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Lỗi DELETE package: - packageController.js:35", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function getPackages(req, res) {
  try {
    const pkgs = await getAllPackages();
    res.json(pkgs);
  } catch (err) {
    console.error("❌ Lỗi GET packages: - packageController.js:45", err);
    res.status(500).json({ error: "DB error" });
  }
}