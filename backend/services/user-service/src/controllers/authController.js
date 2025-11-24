import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  findUserByIdentifier,
  createUserInDb,
  updateUserInDb,
  updateUserPasswordByEmail,
  updateUserPasswordById,
} from "../models/userModel.js";

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
    console.error("Register error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function login(req, res) {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Vui lòng cung cấp tài khoản và mật khẩu" });
    }

    // Find user with timeout
    let user;
    try {
      user = await Promise.race([
        findUserByIdentifier(identifier),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database query timeout")), 10000)
        )
      ]);
    } catch (dbErr) {
      console.error("Database query error in login:", dbErr.message);
      if (dbErr.message === "Database query timeout") {
        return res.status(503).json({ 
          message: "Database query timeout. Vui lòng thử lại sau.",
          error: process.env.NODE_ENV === "development" ? dbErr.message : undefined
        });
      }
      if (dbErr.code === "ECONNREFUSED" || dbErr.code === "ETIMEDOUT") {
        return res.status(503).json({ 
          message: "Không thể kết nối đến database. Vui lòng kiểm tra database đã chạy chưa.",
          error: process.env.NODE_ENV === "development" ? dbErr.message : undefined
        });
      }
      throw dbErr; // Re-throw other errors
    }
    
    if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({ message: "Đăng nhập thành công", token, user: safeUserForClient(user) });
  } catch (err) {
    console.error("Login error:", err);
    console.error("Error stack:", err.stack);
    
    // Handle specific database errors
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(503).json({ 
        message: "Không thể kết nối đến database. Vui lòng kiểm tra database đã chạy chưa.",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
    
    return res.status(500).json({ 
      message: "Lỗi server", 
      error: process.env.NODE_ENV === "development" ? err.message : undefined 
    });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "Vui lòng cung cấp email hoặc số điện thoại" });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (!user.security_question || !user.security_answer) {
      return res.status(400).json({ 
        message: "Tài khoản chưa thiết lập câu hỏi bảo mật. Vui lòng liên hệ quản trị viên." 
      });
    }

    return res.json({ 
      message: "Vui lòng trả lời câu hỏi bảo mật",
      security_question: user.security_question,
      userId: user.id
    });
  } catch (err) {
    console.error("RequestPasswordReset error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function verifySecurityAnswer(req, res) {
  try {
    const { identifier, security_answer } = req.body;
    if (!identifier || !security_answer) {
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin" });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (!user.security_answer) {
      return res.status(400).json({ message: "Tài khoản chưa thiết lập câu hỏi bảo mật" });
    }

    const userAnswer = (user.security_answer || "").trim().toLowerCase();
    const providedAnswer = (security_answer || "").trim().toLowerCase();

    if (userAnswer !== providedAnswer) {
      return res.status(400).json({ message: "Câu trả lời không đúng" });
    }

    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: "password_reset" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ 
      message: "Xác thực thành công",
      resetToken 
    });
  } catch (err) {
    console.error("VerifySecurityAnswer error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !validatePassword(newPassword)) {
      return res.status(400).json({ message: "Token hoặc mật khẩu mới không hợp lệ" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== "password_reset") {
        return res.status(400).json({ message: "Token không hợp lệ" });
      }
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
    console.error("ResetPassword error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function getProfile(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    const dbUser = await findUserByIdentifier(requester.email || requester.phone || requester.id);
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    return res.json({ profile: safeUserForClient(dbUser) });
  } catch (err) {
    console.error("GetProfile error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function getSecurityQuestion(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    if (requester.role?.toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admin không có câu hỏi bảo mật" });
    }

    const dbUser = await findUserById(Number(requester.id));
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    return res.json({ 
      security_question: dbUser.security_question || null,
      has_question: !!dbUser.security_question 
    });
  } catch (err) {
    console.error("GetSecurityQuestion error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function setSecurityQuestion(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    if (requester.role?.toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admin không có câu hỏi bảo mật" });
    }

    const { security_question, security_answer, old_answer } = req.body;
    
    if (!security_question || !security_answer) {
      return res.status(400).json({ message: "Vui lòng cung cấp câu hỏi và câu trả lời" });
    }

    const dbUser = await findUserById(Number(requester.id));
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    if (dbUser.security_question && dbUser.security_answer) {
      if (!old_answer) {
        return res.status(400).json({ message: "Vui lòng nhập câu trả lời của câu hỏi bảo mật hiện tại" });
      }

      const oldAnswerNormalized = (dbUser.security_answer || "").trim().toLowerCase();
      const providedOldAnswer = (old_answer || "").trim().toLowerCase();

      if (oldAnswerNormalized !== providedOldAnswer) {
        return res.status(400).json({ message: "Câu trả lời câu hỏi bảo mật hiện tại không đúng" });
      }
    }

    await updateUserInDb(dbUser.id, {
      security_question: security_question.trim(),
      security_answer: security_answer.trim().toLowerCase()
    });

    return res.json({ message: "Cập nhật câu hỏi bảo mật thành công" });
  } catch (err) {
    console.error("SetSecurityQuestion error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!validatePassword(newPassword)) return res.status(400).json({ message: "Mật khẩu mới không hợp lệ" });
    if (!oldPassword) return res.status(400).json({ message: "Vui lòng cung cấp mật khẩu cũ" });

    let dbUser = null;
    if (requester.id) {
      dbUser = await findUserById(Number(requester.id));
    }
    
    if (!dbUser) {
      dbUser = await findUserByIdentifier(requester.email || requester.phone || requester.id);
    }
    
    if (!dbUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const match = await bcrypt.compare(oldPassword, dbUser.password);
    if (!match) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

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
    console.error("ChangePassword error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export { requestPasswordReset as forgotPassword };

