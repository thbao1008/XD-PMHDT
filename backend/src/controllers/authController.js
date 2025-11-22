import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
 * Request password reset - Step 1: Get security question
 */
export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "Vui lòng cung cấp email hoặc số điện thoại" });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

    // Kiểm tra xem user đã có security question chưa
    if (!user.security_question || !user.security_answer) {
      return res.status(400).json({ 
        message: "Tài khoản chưa thiết lập câu hỏi bảo mật. Vui lòng liên hệ quản trị viên." 
      });
    }

    // Trả về câu hỏi bảo mật (không trả về answer)
    return res.json({ 
      message: "Vui lòng trả lời câu hỏi bảo mật",
      security_question: user.security_question,
      userId: user.id // Cần để verify answer ở bước sau
    });
  } catch (err) {
    console.error("RequestPasswordReset error - authController.js:134", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Verify security answer - Step 2: Verify answer
 */
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

    // So sánh answer (case-insensitive, trim whitespace)
    const userAnswer = (user.security_answer || "").trim().toLowerCase();
    const providedAnswer = (security_answer || "").trim().toLowerCase();

    if (userAnswer !== providedAnswer) {
      return res.status(400).json({ message: "Câu trả lời không đúng" });
    }

    // Tạo reset token nếu answer đúng
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: "password_reset" },
      JWT_SECRET,
      { expiresIn: "15m" } // Token chỉ có hiệu lực 15 phút
    );

    return res.json({ 
      message: "Xác thực thành công",
      resetToken 
    });
  } catch (err) {
    console.error("VerifySecurityAnswer error - authController.js", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Reset password using reset token - Step 3: Set new password
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
      // Kiểm tra token có phải là password reset token không
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
 * Get security question (for profile)
 */
export async function getSecurityQuestion(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Chỉ mentor và learner mới có security question
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
    console.error("GetSecurityQuestion error - authController.js", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Set/Update security question
 */
export async function setSecurityQuestion(req, res) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Chỉ mentor và learner mới có security question
    if (requester.role?.toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admin không có câu hỏi bảo mật" });
    }

    const { security_question, security_answer, old_answer } = req.body;
    
    if (!security_question || !security_answer) {
      return res.status(400).json({ message: "Vui lòng cung cấp câu hỏi và câu trả lời" });
    }

    const dbUser = await findUserById(Number(requester.id));
    if (!dbUser) return res.status(404).json({ message: "Người dùng không tồn tại" });

    // Nếu đã có câu hỏi bảo mật, cần verify câu trả lời cũ
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

    // Cập nhật security question và answer
    await updateUserInDb(dbUser.id, {
      security_question: security_question.trim(),
      security_answer: security_answer.trim().toLowerCase() // Lưu lowercase để so sánh dễ hơn
    });

    return res.json({ message: "Cập nhật câu hỏi bảo mật thành công" });
  } catch (err) {
    console.error("SetSecurityQuestion error - authController.js", err);
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

    // Ưu tiên dùng id trực tiếp từ token (chính xác nhất)
    let dbUser = null;
    if (requester.id) {
      dbUser = await findUserById(Number(requester.id));
    }
    
    // Nếu không tìm được bằng id, thử dùng email hoặc phone
    if (!dbUser) {
      dbUser = await findUserByIdentifier(requester.email || requester.phone || requester.id);
    }
    
    if (!dbUser) {
      console.error("ChangePassword - User not found:", { requester });
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // So sánh mật khẩu cũ
    const match = await bcrypt.compare(oldPassword, dbUser.password);
    if (!match) {
      console.error("ChangePassword - Password mismatch for user:", dbUser.id);
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    // Hash mật khẩu mới và cập nhật
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
