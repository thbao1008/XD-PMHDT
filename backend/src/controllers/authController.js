import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByEmail,
  findUserByPhone,
  findUserByIdentifier,
  createUserInDb,
  updateUserPasswordByEmail,
  updateUserPasswordById,
} from "../models/userModel.js";

/**
 * Helpers
 */
function safeUserForClient(user) {
  if (!user) return null;
  const u = { ...user };
  delete u.password;
  return u;
}

function validateEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

function validatePhone(phone) {
  return typeof phone === "string" && /^0\d{9}$/.test(phone);
}

function validatePassword(pw) {
  return typeof pw === "string" && pw.length >= 6;
}

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";
const RESET_TOKEN_EXPIRES = process.env.RESET_TOKEN_EXPIRES || "1h";

/**
 * Register
 */
export async function register(req, res) {
  try {
    const { name, email, phone, dob, role, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: "Vui lòng cung cấp email hoặc số điện thoại" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
    }
    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    }

    if (email) {
      const existingEmail = await findUserByEmail(email);
      if (existingEmail) return res.status(400).json({ message: "Email đã tồn tại" });
    }

    if (phone) {
      const existingPhone = await findUserByPhone(phone);
      if (existingPhone) return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const created = await createUserInDb({
      name,
      email: email || null,
      phone: phone || null,
      dob: dob || null,
      role: role || "USER",
      password: hashed,
    });

    return res.status(201).json({ message: "Đăng ký thành công", user: safeUserForClient(created) });
  } catch (err) {
    console.error("Register error - authController.js:80", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Login
 */
export async function login(req, res) {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Vui lòng cung cấp tài khoản và mật khẩu" });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({ message: "Đăng nhập thành công", token, user: safeUserForClient(user) });
  } catch (err) {
    console.error("Login error - authController.js:109", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "Vui lòng cung cấp email hoặc số điện thoại" });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRES }
    );

    // In production: gửi token qua email/SMS
    return res.json({ message: "Reset token tạo thành công", resetToken });
  } catch (err) {
    console.error("RequestPasswordReset error - authController.js:134", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Reset password using reset token
 */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !validatePassword(newPassword)) {
      return res.status(400).json({ message: "Token hoặc mật khẩu mới không hợp lệ" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    if (decoded.id) {
      await updateUserPasswordById(decoded.id, hashed);
    } else if (decoded.email) {
      await updateUserPasswordByEmail(decoded.email, hashed);
    } else {
      return res.status(400).json({ message: "Token không hợp lệ" });
    }

    return res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    console.error("ResetPassword error - authController.js:168", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Get profile
 */
export async function getProfile(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    const dbUser = await findUserByIdentifier(requester.email || requester.phone || requester.id);
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    return res.json({ profile: safeUserForClient(dbUser) });
  } catch (err) {
    console.error("GetProfile error - authController.js:186", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Change password
 */
export async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!validatePassword(newPassword)) return res.status(400).json({ message: "Mật khẩu mới không hợp lệ" });
    if (!oldPassword) return res.status(400).json({ message: "Vui lòng cung cấp mật khẩu cũ" });

    const dbUser = await findUserByIdentifier(requester.email || requester.phone || requester.id);
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const match = await bcrypt.compare(oldPassword, dbUser.password);
    if (!match) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const hashed = await bcrypt.hash(newPassword, 10);
    if (dbUser.id) {
      await updateUserPasswordById(dbUser.id, hashed);
    } else if (dbUser.email) {
      await updateUserPasswordByEmail(dbUser.email, hashed);
    } else {
      return res.status(500).json({ message: "Không thể cập nhật mật khẩu" });
    }

    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("ChangePassword error - authController.js:219", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// Alias cho forgotPassword
export { requestPasswordReset as forgotPassword };
