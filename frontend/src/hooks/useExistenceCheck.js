// src/hooks/useExistenceCheck.js
import { useState, useEffect } from "react";
import api from "../api.js"; // đường dẫn tới file api của bạn

export default function useExistenceCheck(field, value) {
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(null); // true = hợp lệ, false = đã tồn tại
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!value || !field) {
      setValid(null);
      setMessage("");
      return;
    }

    let active = true;
    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/users/check`, {
          params: { [field]: value }
        });
        if (!active) return;
        const exists = res.data?.exists ?? false;
        setValid(!exists);
        setMessage(exists ? `${field === "email" ? "Email" : "SĐT"} đã tồn tại` : "Hợp lệ");
      } catch (err) {
        if (!active) return;
        console.error("❌ Lỗi kiểm tra tồn tại: - useExistenceCheck.js:30", err);
        setValid(null);
        setMessage("Không thể kiểm tra");
      } finally {
        if (active) setLoading(false);
      }
    }, 500); // debounce 500ms

    return () => {
      active = false;
      clearTimeout(delay);
    };
  }, [field, value]);

  return { loading, valid, message };
}
