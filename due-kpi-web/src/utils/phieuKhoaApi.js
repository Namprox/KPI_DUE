/**
 * Phần nghiệp vụ RIÊNG của phiếu KPI Khoa (mẫu `loai_doi_tuong = 3`).
 *
 * Anh em của phieuPhongApi.js: hai loại phiếu dùng CHUNG bảng, chung stored
 * procedure, chung controller và chung phieuDonViApi.js - kể cả máy trạng thái,
 * tên ba lớp điểm và bảng quyền thao tác. File này chỉ giữ hai thứ thật sự khác:
 *
 *   1. Chức vụ hai cấp dưới   Thư ký Khoa (TKK) nhập, Trưởng Khoa / Trưởng Khoa
 *                             lớn (TK/TKL) duyệt - bên Phòng là TKP và TP
 *   2. Nhãn cấp chấm          hiển thị "Trưởng Khoa" thay vì "Trưởng phòng"
 *
 * Bốn điểm rẽ nhánh còn lại (nhóm tiêu chí hai tầng A/B, cách cộng tổng, ngưỡng
 * xếp loại 95/80/60, cây nhóm) được khai ở nơi dùng: phần gom nhóm nằm trong
 * ChiTietPhieuDonVi, còn tổng cơ bản / vượt trội thì tinhTongDiemDonViTamTinh
 * của phieuDonViApi đã tách sẵn theo `LoaiNhom`.
 */

import { ROLE } from "./roles";
import { CAP_CHAM, quyenPhieuDonVi } from "./phieuDonViApi";

/**
 * Nhãn cột cho dải lớp điểm hiển thị trên mỗi dòng tiêu chí.
 *
 * "Trưởng đơn vị" chứ không phải "Trưởng Khoa": cùng một mẫu loại 3 còn được
 * dùng cho TNNCN (xem laDonViPhongTrungTam), nơi người duyệt giữ chức vụ TKL.
 */
export const NHAN_CAP_CHAM_KHOA = {
  [CAP_CHAM.NHAP]: "Thư ký",
  [CAP_CHAM.DUYET_DV]: "Trưởng đơn vị",
  [CAP_CHAM.TRUONG]: "Cấp Trường",
};

/**
 * Người dùng được làm gì trên phiếu Khoa này.
 *
 * Luật nằm ở quyenPhieuDonVi() dùng chung; ở đây chỉ khai hai chức vụ của Khoa.
 * TKL có mặt cùng TK theo đúng ROLE_SETS.TRUONG_KHOA: Khoa lớn cũng là một đơn
 * vị lập phiếu, và server nhận cả hai mã ở bước duyệt-dv.
 */
export const quyenPhieuKhoa = (phieu, user) =>
  quyenPhieuDonVi(phieu, user, {
    vaiTroThuKy: [ROLE.THU_KY_KHOA],
    vaiTroTruongDv: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],
  });
