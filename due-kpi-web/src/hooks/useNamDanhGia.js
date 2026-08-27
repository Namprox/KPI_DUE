import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

/**
 * Danh sách năm đánh giá + năm được chọn mặc định.
 *
 * Mặc định ưu tiên năm dương lịch hiện tại nếu có trong danh mục, ngược lại lấy
 * năm mới nhất - cùng quy ước với các màn hình quản lý sẵn có, để người dùng
 * chuyển trang không thấy bộ lọc nhảy lung tung.
 */
export const useNamDanhGia = () => {
  const [namList, setNamList] = useState([]);
  const [selectedNam, setSelectedNam] = useState("");
  const [dangTaiNam, setDangTaiNam] = useState(true);

  useEffect(() => {
    let huy = false;

    const tai = async () => {
      try {
        const res = await apiFetch("namdanhgia");
        if (!res.ok) throw new Error("Không tải được danh mục năm");
        const result = await res.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        const sorted = [...list].sort((a, b) => b.IdNam - a.IdNam);
        if (huy) return;

        setNamList(sorted);
        const namHienTai = new Date().getFullYear();
        const khop = sorted.find((n) => n.IdNam === namHienTai);
        setSelectedNam(String(khop?.IdNam ?? sorted[0]?.IdNam ?? ""));
      } catch (error) {
        console.error("Lỗi tải năm đánh giá:", error);
      } finally {
        if (!huy) setDangTaiNam(false);
      }
    };

    tai();
    return () => {
      huy = true;
    };
  }, []);

  return { namList, selectedNam, setSelectedNam, dangTaiNam };
};

export default useNamDanhGia;
