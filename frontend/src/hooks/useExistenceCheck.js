import { useEffect, useState } from "react";
import api from "../api"; // axios instance

export function useExistenceCheck(type, value, delay = 300) {
  const [state, setState] = useState({
    loading: false,
    valid: null,     // true = hợp lệ (chưa tồn tại), false = đã tồn tại, null = chưa kiểm tra
    message: "",     // thông điệp hiển thị
  });

  useEffect(() => {
    if (!value) {
      setState({ loading: false, valid: null, message: "" });
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    const t = setTimeout(async () => {
      try {
        const params = type === "email" ? { email: value } : { phone: value };
        const res = await api.get("/admin/users/check", { params });
        const exists = !!res.data?.exists;

        setState({
          loading: false,
          valid: !exists,
          message: exists
            ? (type === "email" ? "Email đã tồn tại" : "Số điện thoại đã tồn tại")
            : (type === "email" ? "Email hợp lệ" : "Số điện thoại hợp lệ"),
        });
      } catch (err) {
        // lỗi API: không thay đổi valid, chỉ tắt loading
        setState((s) => ({ ...s, loading: false }));
      }
    }, delay);

    return () => clearTimeout(t);
  }, [type, value, delay]);

  return state;
}
