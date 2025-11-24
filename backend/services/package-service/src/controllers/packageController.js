import * as packageService from "../services/packageService.js";

export async function getPackages(req, res) {
  try {
    const pkgs = await packageService.getAllPackages();
    res.json(pkgs);
  } catch (err) {
    console.error("getPackages error:", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function createNewPackage(req, res) {
  try {
    const pkg = await packageService.createPackage(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    console.error("createNewPackage error:", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function updateExistingPackage(req, res) {
  try {
    const { id } = req.params;
    const pkg = await packageService.updatePackage(id, req.body);
    res.json(pkg);
  } catch (err) {
    console.error("updateExistingPackage error:", err);
    res.status(500).json({ error: "DB error" });
  }
}

export async function deleteExistingPackage(req, res) {
  try {
    const { id } = req.params;
    await packageService.deletePackage(id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteExistingPackage error:", err);
    res.status(500).json({ error: "DB error" });
  }
}

