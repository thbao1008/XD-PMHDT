import bcrypt from "bcryptjs";
import {
  getAllUsers,
  findUserById,
  findUserByIdentifier,
  createUserInDb,
  updateUserInDb,
  deleteUserInDb,
  toggleUserStatusInDb
} from "../models/userModel.js";

// Lấy danh sách user
export async function listUsers(req, res) {
  try {
    const users = await getAllUsers();
    users.forEach(u => delete u.password);
    return res.json({ success: true, users });
  } catch (err) {
    console.error("listUsers error: - adminController.js:19", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Lấy user theo id
export async function getUser(req, res) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    delete user.password;
    return res.json({ success: true, user });
  } catch (err) {
    console.error("getUser error: - adminController.js:32", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Tạo user mới
export async function createUser(req, res) {
  try {
    const { name, email, phone, dob, role, password } = req.body;

    // Check email trùng
    const existingEmail = await findUserByIdentifier(email);
    if (existingEmail && existingEmail.email === email) {
      return res.status(400).json({ success: false, message: "Email đã tồn tại" });
    }

    // Check phone trùng
    const existingPhone = await findUserByIdentifier(phone);
    if (existingPhone && existingPhone.phone === phone) {
      return res.status(400).json({ success: false, message: "Số điện thoại đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await createUserInDb({
      name,
      email,
      phone,
      dob,
      role: role || "user",
      password: hashed
    });

    delete newUser.password;
    return res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    console.error("createUser error: - adminController.js:67", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Update user (cho phép reset mật khẩu)
export async function updateUser(req, res) {
  try {
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await updateUserInDb(req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    delete updated.password;
    return res.json({ success: true, user: updated });
  } catch (err) {
    console.error("updateUser error: - adminController.js:87", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Xóa user
export async function deleteUser(req, res) {
  try {
    const deleted = await deleteUserInDb(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteUser error: - adminController.js:99", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Toggle active
export async function toggleUserStatus(req, res) {
  try {
    const updated = await toggleUserStatusInDb(req.params.id);
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, active: updated.active });
  } catch (err) {
    console.error("toggleUserStatus error: - adminController.js:111", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
