import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage
} from "../models/packageModel.js";

// Lấy tất cả gói học
export async function getPackages(req, res) {
  try {
    const packages = await getAllPackages();
    res.json({ packages });
  } catch (err) {
    console.error("❌ Lỗi GET packages: - packageController.js:15", err);
    res.status(500).json({ error: "DB error" });
  }
}

// Lấy gói học theo id
export async function getPackage(req, res) {
  try {
    const pkg = await getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Không tìm thấy gói học" });
    res.json(pkg);
  } catch (err) {
    console.error("❌ Lỗi GET package by id: - packageController.js:27", err);
    res.status(500).json({ error: "DB error" });
  }
}

// Tạo gói học mới
export async function createNewPackage(req, res) {
  try {
    const pkg = await createPackage(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    console.error("❌ Lỗi POST package: - packageController.js:38", err);
    res.status(500).json({ error: "DB error" });
  }
}

// Cập nhật gói học
export async function updatePackageById(req, res) {
  try {
    const pkg = await updatePackage(req.params.id, req.body);
    if (!pkg) return res.status(404).json({ error: "Không tìm thấy gói học" });
    res.json(pkg);
  } catch (err) {
    console.error("❌ Lỗi PUT package: - packageController.js:50", err);
    res.status(500).json({ error: "DB error" });
  }
}

// Xóa gói học
export async function deletePackageById(req, res) {
  try {
    const pkg = await deletePackage(req.params.id);
    if (!pkg) return res.status(404).json({ error: "Không tìm thấy gói học" });
    res.json({ message: "Đã xóa gói học" });
  } catch (err) {
    console.error("❌ Lỗi DELETE package: - packageController.js:62", err);
    res.status(500).json({ error: "DB error" });
  }
}
