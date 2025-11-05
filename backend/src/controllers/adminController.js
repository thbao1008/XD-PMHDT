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
    const safe = users.map(({ password, ...rest }) => rest);
    return res.json({ success: true, users: safe });
  } catch (err) {
    console.error("listUsers error - adminController.js:19", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Lấy user theo id
export async function getUser(req, res) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Not found" });
    const { password, ...safe } = user;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("getUser error - adminController.js:32", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Tạo user mới
export async function createUser(req, res) {
  try {
    const { name, email, phone, dob, role, password, packageId } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc" });
    }
    if (role === "admin") {
      return res.status(403).json({ success: false, message: "Không được tạo admin từ giao diện" });
    }

    // Check trùng email
    if (email) {
      const existingEmail = await findUserByIdentifier(email);
      if (existingEmail?.email === email) {
        return res.status(409).json({ success: false, message: "Email đã tồn tại" });
      }
    }
    // Check trùng phone
    if (phone) {
      const existingPhone = await findUserByIdentifier(phone);
      if (existingPhone?.phone === phone) {
        return res.status(409).json({ success: false, message: "Số điện thoại đã tồn tại" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await createUserInDb({
      name,
      email,
      phone: phone || null,
      dob: dob || null,
      role: (role || "learner").toLowerCase(), // ép lowercase
      password: hashed,
      status: "active",
      package_id: role === "learner" ? (packageId || null) : null,
    });


    const { password: _, ...safe } = newUser;
    return res.status(201).json({ success: true, user: safe });
  } catch (err) {
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "Email hoặc SĐT đã tồn tại" });
  }
  console.error("createUser error: - adminController.js:84", err);
  return res.status(500).json({ success: false, message: "Server error" });
}
}

// Cập nhật user
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.role === "admin") {
      return res.status(403).json({ success: false, message: "Không được cập nhật role thành admin" });
    }

    if (updates.email) {
      const existingEmail = await findUserByIdentifier(updates.email);
      if (existingEmail && existingEmail.email === updates.email && existingEmail.id !== Number(id)) {
        return res.status(409).json({ success: false, message: "Email đã tồn tại" });
      }
    }
    if (updates.phone) {
      const existingPhone = await findUserByIdentifier(updates.phone);
      if (existingPhone && existingPhone.phone === updates.phone && existingPhone.id !== Number(id)) {
        return res.status(409).json({ success: false, message: "Số điện thoại đã tồn tại" });
      }
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await updateUserInDb(id, updates);
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    const { password, ...safe } = updated;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("updateUser error - adminController.js:122", err);
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
    console.error("deleteUser error - adminController.js:134", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Toggle trạng thái (active/banned)
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const updated = await toggleUserStatusInDb(id);
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    const { password, ...safe } = updated;
    return res.json({ success: true, user: safe });
  } catch (err) {
    console.error("toggleUserStatus error - adminController.js:149", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
