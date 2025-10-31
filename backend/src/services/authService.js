// src/services/authService.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByIdentifier,
  findUserById,
  verifyUserInfo as checkUserInfo,
  updateUserPassword
} from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "replace_this";
const RESET_SECRET = process.env.RESET_SECRET || JWT_SECRET;

// Đăng nhập
export async function authenticateUser(identifier, password) {
  try {
    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return { success: false, message: "Sai mật khẩu" };
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    // Xóa password trước khi trả về
    delete user.password;

    return {
      success: true,
      token,
      user,
    };
  } catch (err) {
    console.error("authenticateUser error: - authService.js:40", err);
    return { success: false, message: "Lỗi server" };
  }
}

// Xác minh thông tin để reset password
export async function verifyUserInfo({ email, phone, name, dob }) {
  try {
    const user = await checkUserInfo({ email, phone, name, dob });
    if (!user) {
      return { success: false, message: "Thông tin không khớp" };
    }

    const token = jwt.sign({ id: user.id }, RESET_SECRET, {
      expiresIn: "15m",
    });

    return { success: true, token };
  } catch (err) {
    console.error("verifyUserInfo error: - authService.js:59", err);
    return { success: false, message: "Lỗi server" };
  }
}

// Cập nhật mật khẩu mới
export async function updatePassword(token, newPassword) {
  try {
    const decoded = jwt.verify(token, RESET_SECRET);
    const user = await findUserById(decoded.id);
    if (!user) {
      return { success: false, message: "Không tìm thấy người dùng" };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashed);

    return { success: true };
  } catch (err) {
    console.error("Password reset error (): - authService.js:78", err);
    return {
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    };
  }
}
