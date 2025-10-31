import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByIdentifier,
  createUserInDb,
  updateUserPassword,
} from "../models/userModel.js";

// Đăng ký
export async function register(req, res) {
  try {
    const { name, email, phone, dob, role, password } = req.body;

    // Check email trùng
    const existingEmail = await findUserByIdentifier(email);
    if (existingEmail && existingEmail.email === email) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Check phone trùng
    const existingPhone = await findUserByIdentifier(phone);
    if (existingPhone && existingPhone.phone === phone) {
      return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await createUserInDb({
      name,
      email,
      phone,
      dob,
      role: role || "user", 
      password: hashed,
    });

    delete user.password;
    res.status(201).json({ message: "Đăng ký thành công", user });
  } catch (err) {
    console.error("Register error: - authController.js:40", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

// Đăng nhập (email hoặc phone)
export async function login(req, res) {
  try {
    const { identifier, password } = req.body; // identifier = email hoặc phone

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "1d" }
    );

    delete user.password;
    res.json({ message: "Đăng nhập thành công", token, user });
  } catch (err) {
    console.error("Login error: - authController.js:69", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

// Quên mật khẩu (giả lập)
export async function forgotPassword(req, res) {
  try {
    const { identifier } = req.body; // có thể là email hoặc phone
    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    // Tạo token reset giả lập
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "15m" }
    );

    res.json({ message: "Đã gửi link reset mật khẩu", resetToken });
  } catch (err) {
    console.error("ForgotPassword error: - authController.js:92", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

// Reset mật khẩu
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    const hashed = await bcrypt.hash(newPassword, 10);

    await updateUserPassword(decoded.email, hashed);

    res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    console.error("ResetPassword error: - authController.js:109", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

// ✅ Lấy profile user (admin/learner/mentor đều dùng chung)
export async function getProfile(req, res) {
  try {
    // giả sử middleware auth đã gắn req.user từ JWT
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    res.json({ profile: user });
  } catch (err) {
    console.error("GetProfile error: - authController.js:124", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}

// ✅ Đổi mật khẩu (dùng chung cho mọi role)
export async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user; // lấy từ JWT middleware

    if (!user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const dbUser = await findUserByIdentifier(user.email);
    if (!dbUser) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const match = await bcrypt.compare(oldPassword, dbUser.password);
    if (!match) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.email, hashed);

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("ChangePassword error: - authController.js:154", err);
    res.status(500).json({ message: "Lỗi server" });
  }
}
