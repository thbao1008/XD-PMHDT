import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export const learnerController = {
  // Lấy danh sách learners kèm đơn hàng mới nhất
  getAll: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.dob, u.status,
               p.id AS latest_purchase_id,
               pk.name AS latest_package_name,
               GREATEST(pk.duration_days - EXTRACT(DAY FROM (NOW() - p.created_at)), 0) AS remaining_days,
               p.status AS latest_status,
               p.created_at AS latest_created_at
        FROM users u
        LEFT JOIN LATERAL (
          SELECT * FROM purchases p
          WHERE p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) p ON true
        LEFT JOIN packages pk ON pk.id = p.package_id
        WHERE LOWER(u.role)='learner'
        ORDER BY u.id ASC
      `);
      res.json({ learners: result.rows });
    } catch (err) {
      console.error("❌ Lỗi getAll learners: - learnerController.js:28", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Lấy learner theo id kèm đơn hàng mới nhất
  getById: async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.dob, u.status,
               p.id AS latest_purchase_id,
               pk.name AS latest_package_name,
               GREATEST(pk.duration_days - EXTRACT(DAY FROM (NOW() - p.created_at)), 0) AS remaining_days,
               p.status AS latest_status,
               p.created_at AS latest_created_at
        FROM users u
        LEFT JOIN LATERAL (
          SELECT * FROM purchases p
          WHERE p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) p ON true
        LEFT JOIN packages pk ON pk.id = p.package_id
        WHERE u.id=$1 AND LOWER(u.role)='learner'
      `, [id]);

      if (result.rows.length === 0)
        return res.status(404).json({ message: "Learner not found" });

      res.json(result.rows[0]);
    } catch (err) {
      console.error("❌ Lỗi getById learner: - learnerController.js:60", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Tạo learner mới + insert purchase nếu có packageId
  create: async (req, res) => {
    const { name, email, phone, dob, password, packageId } = req.body;
    try {
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (name, email, phone, dob, password, role, status) VALUES ($1,$2,$3,$4,$5,'learner','active') RETURNING id, name, email, phone",
        [name, email, phone, dob, hashed]
      );
      const learner = result.rows[0];

      // Nếu có packageId thì tạo purchase
      if (packageId) {
        await pool.query(
          "INSERT INTO purchases (user_id, package_id, status, created_at) VALUES ($1,$2,'completed',NOW())",
          [learner.id, packageId]
        );
      }

      res.status(201).json(learner);
    } catch (err) {
      console.error("❌ Lỗi create learner: - learnerController.js:86", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Cập nhật learner
  update: async (req, res) => {
    const { id } = req.params;
    const { name, phone, dob, password } = req.body;
    try {
      const hashed = password ? await bcrypt.hash(password, 10) : null;
      if (hashed) {
        await pool.query(
          "UPDATE users SET name=$1, phone=$2, dob=$3, password=$4, updated_at=NOW() WHERE id=$5 AND LOWER(role)='learner'",
          [name, phone, dob, hashed, id]
        );
      } else {
        await pool.query(
          "UPDATE users SET name=$1, phone=$2, dob=$3, updated_at=NOW() WHERE id=$4 AND LOWER(role)='learner'",
          [name, phone, dob, id]
        );
      }
      res.json({ message: "Learner updated" });
    } catch (err) {
      console.error("❌ Lỗi update learner: - learnerController.js:110", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Xóa learner (sẽ xóa luôn purchases nhờ ON DELETE CASCADE)
  delete: async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM users WHERE id=$1 AND LOWER(role)='learner'", [id]);
      res.json({ message: "Learner deleted" });
    } catch (err) {
      console.error("❌ Lỗi delete learner: - learnerController.js:122", err);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Lấy toàn bộ lịch sử mua của learner (dùng cho PurchasesPage)
 // Lấy toàn bộ lịch sử mua của learner (dùng cho PurchasesPage)
getPurchases: async (req, res) => {
  const { id } = req.params; // id của learner
  try {
    const result = await pool.query(`
      SELECT p.id, p.package_id, pk.name AS package_name,
             p.status, p.created_at,
             GREATEST(pk.duration_days - EXTRACT(DAY FROM (NOW() - p.created_at)), 0) AS remaining_days
      FROM purchases p
      JOIN packages pk ON pk.id = p.package_id
      WHERE p.user_id=$1
      ORDER BY p.created_at DESC
    `, [id]);

    res.json({ purchases: result.rows });
  } catch (err) {
    console.error("❌ Lỗi getPurchases learner: - learnerController.js:144", err);
    res.status(500).json({ message: "Server error" });
  }
}

};
