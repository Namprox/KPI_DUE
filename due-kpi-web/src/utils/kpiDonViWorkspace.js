import { donViTheoVaiTro, ROLE, ROLE_SETS, coQuyenTaiDonVi } from "./roles";
import { laDonViPhongTrungTam } from "./phieuPhongApi";
import { fetchPhieuDonViList, taoPhieuDonVi } from "./phieuDonViApi";

export const cauHinhKpiDonVi = (loai) => loai === "phong" ? {
  ten: "Phòng/Trung tâm", danhGia: "/danh-gia-kpi-phong",
  lichSu: "/lich-su-danh-gia-phong", roles: ROLE_SETS.KPI_PHONG,
  thuKy: ROLE.THU_KY_PHONG,
} : {
  ten: "Khoa", danhGia: "/danh-gia-kpi-don-vi",
  lichSu: "/lich-su-danh-gia-khoa", roles: ROLE_SETS.KPI_KHOA,
  thuKy: ROLE.THU_KY_KHOA,
};

export function donViKpiCuaToi(user, danhMuc, loai) {
  const config = cauHinhKpiDonVi(loai);
  const result = new Map();
  donViTheoVaiTro(config.roles, user).forEach((dv) => {
    const item = { ...dv, ...danhMuc.find((d) => Number(d.IdDonVi) === Number(dv.IdDonVi)) };
    if (!String(item.MaDonVi || "").trim()) return;
    if (laDonViPhongTrungTam(item.MaDonVi) !== (loai === "phong")) return;
    result.set(String(item.IdDonVi), item);
  });
  return [...result.values()];
}

// Chỉ chia sẻ POST đang chạy, không cache phiếu: lần mở tiếp theo luôn đọc server.
const dangTao = new Map();
export async function timHoacTaoPhieu({ user, loai, idNam, idDonVi, conHieuLuc = () => true }) {
  const tim = async () => {
    const rows = await fetchPhieuDonViList({ idNam, idDonVi, page: 1, pageSize: 20 });
    return rows.find((p) => Number(p.IdNam) === Number(idNam) && Number(p.IdDonVi) === Number(idDonVi)) || null;
  };
  const phieu = await tim();
  if (phieu || !conHieuLuc()) return phieu;
  if (!coQuyenTaiDonVi([cauHinhKpiDonVi(loai).thuKy], idDonVi, user)) return null;
  const key = `${user?.IdNhanVien}:${idNam}:${idDonVi}`;
  if (!dangTao.has(key)) {
    const request = (async () => {
      try {
        const item = await taoPhieuDonVi({ idNam, idDonVi });
        if (item?.IdPhieuDv) return item;
      } catch (error) {
        // Người khác có thể vừa tạo cùng phiếu. Không tự lặp POST khi thất bại.
        const existing = await tim().catch(() => null);
        if (existing) return existing;
        throw error;
      }
      const existing = await tim();
      if (!existing) throw new Error("Chưa lấy được phiếu vừa tạo. Vui lòng thử lại.");
      return existing;
    })();
    dangTao.set(key, request);
    request.finally(() => dangTao.delete(key)).catch(() => {});
  }
  return dangTao.get(key);
}
