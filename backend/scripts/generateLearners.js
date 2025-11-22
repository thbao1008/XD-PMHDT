// Script tự động tạo nhiều learners
import "dotenv/config";
import pool from "../src/config/db.js";
import bcrypt from "bcryptjs";

// Danh sách họ tên mẫu
const firstNames = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ",
  "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Đào", "Tô"
];

const middleNames = [
  "Văn", "Thị", "Đức", "Minh", "Thanh", "Hữu", "Công", "Quang", "Đình",
  "Xuân", "Hồng", "Thu", "Lan", "Hương", "Phương", "Anh", "Thảo", "Linh"
];

const lastNames = [
  "An", "Bình", "Cường", "Dũng", "Đức", "Giang", "Hải", "Hùng", "Khang",
  "Long", "Minh", "Nam", "Phong", "Quang", "Sơn", "Tài", "Tuấn", "Việt",
  "Anh", "Bảo", "Chi", "Dung", "Giang", "Hạnh", "Hoa", "Lan", "Linh",
  "Mai", "Nga", "Oanh", "Phương", "Quỳnh", "Thảo", "Uyên", "Vy", "Yến"
];

// Tạo tên ngẫu nhiên
function generateRandomName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${middleName} ${lastName}`;
}

// Tạo email ngẫu nhiên
function generateEmail(name, index) {
  const nameSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
  return `${nameSlug}${index}@example.com`;
}

// Tạo số điện thoại ngẫu nhiên
function generatePhone(index) {
  const prefixes = ["090", "091", "092", "093", "094", "096", "097", "098", "099"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = String(index).padStart(7, "0");
  return `${prefix}${number}`;
}

// Tạo ngày sinh ngẫu nhiên (18-30 tuổi)
function generateDOB() {
  const age = 18 + Math.floor(Math.random() * 13); // 18-30 tuổi
  const year = new Date().getFullYear() - age;
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Tạo password mặc định
const DEFAULT_PASSWORD = "123456";

// Lấy danh sách packages
async function getPackages() {
  const result = await pool.query("SELECT id FROM packages ORDER BY id");
  return result.rows.map(row => row.id);
}

// Tạo một learner
async function createLearner(index, packageIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const name = generateRandomName();
    const email = generateEmail(name, index);
    const phone = generatePhone(index);
    const dob = generateDOB();
    const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Kiểm tra email/phone đã tồn tại chưa
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  Bỏ qua ${name} - email/phone đã tồn tại`);
      await client.query("ROLLBACK");
      return null;
    }

    // Tạo user
    const userRes = await client.query(`
      INSERT INTO users (name, email, phone, dob, role, status, password, created_at)
      VALUES ($1, $2, $3, $4, 'learner', 'active', $5, NOW())
      RETURNING id
    `, [name, email, phone, dob, password]);

    const userId = userRes.rows[0].id;

    // Trigger sẽ tự động tạo learner, đợi một chút rồi lấy learner_id
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const learnerRes = await client.query(
      "SELECT id FROM learners WHERE user_id = $1",
      [userId]
    );

    let learnerId;
    if (learnerRes.rows.length === 0) {
      // Nếu trigger chưa tạo, tạo thủ công
      const newLearnerRes = await client.query(`
        INSERT INTO learners (user_id, start_date, created_at, updated_at)
        VALUES ($1, NOW(), NOW(), NOW())
        RETURNING id
      `, [userId]);
      learnerId = newLearnerRes.rows[0].id;
    } else {
      learnerId = learnerRes.rows[0].id;
    }

    // Gán package ngẫu nhiên (nếu có)
    if (packageIds.length > 0 && Math.random() > 0.3) { // 70% có package
      const randomPackageId = packageIds[Math.floor(Math.random() * packageIds.length)];
      await client.query(`
        INSERT INTO purchases (learner_id, package_id, status, created_at, extra_days)
        VALUES ($1, $2, 'active', NOW(), 0)
      `, [learnerId, randomPackageId]);
    }

    await client.query("COMMIT");
    return { userId, learnerId, name, email, phone };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 10; // Mặc định tạo 10 learners

  console.log(`🚀 Bắt đầu tạo ${count} learners...\n`);

  try {
    // Lấy danh sách packages
    const packageIds = await getPackages();
    console.log(`📦 Tìm thấy ${packageIds.length} packages\n`);

    const results = {
      success: 0,
      skipped: 0,
      errors: 0
    };

    // Tạo learners
    for (let i = 1; i <= count; i++) {
      try {
        const result = await createLearner(i, packageIds);
        if (result) {
          results.success++;
          console.log(`✅ [${i}/${count}] Đã tạo: ${result.name} (${result.email})`);
        } else {
          results.skipped++;
        }
      } catch (err) {
        results.errors++;
        console.error(`❌ [${i}/${count}] Lỗi:`, err.message);
      }

      // Delay nhỏ để tránh quá tải
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`   ✅ Thành công: ${results.success}`);
    console.log(`   ⚠️  Bỏ qua: ${results.skipped}`);
    console.log(`   ❌ Lỗi: ${results.errors}`);
    console.log(`\n🔑 Mật khẩu mặc định cho tất cả learners: ${DEFAULT_PASSWORD}`);

  } catch (err) {
    console.error("❌ Lỗi nghiêm trọng:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Chạy script
main();

