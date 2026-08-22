import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import QLNhanVien from "../pages/QuanLyToChuc/QL_NhanVien";
import QLNhanVienChiTiet from "../pages/QuanLyToChuc/QL_NhanVienChiTiet";
import QLDonVi from "../pages/QuanLyToChuc/QL_DonVi";
import QLTieuChi from "../pages/QuanLyTieuChi/QL_TieuChi";
import QLNhomTieuChi from "../pages/QuanLyTieuChi/QL_NhomTieuChi";
import QLNamDanhGia from "../pages/QuanLyKeHoach/QL_NamDanhGia";
import QLMauDanhGia from "../pages/QuanLyKeHoach/QL_MauDanhGia";
import QLPhanQuyenTieuChi from "../pages/QuanLyKeHoach/QL_PhanQuyenTieuChi";
import QLThangDiemByTieuChi from "../pages/QuanLyTieuChi/QL_ThangDiemByTieuChi";
import QLDinhMucGiangVien from "../pages/QuanLyKeHoach/QL_DinhMucGiangVien";
import QLNgoaiLeDinhMuc from "../pages/QuanLyKeHoach/QL_NgoaiLeDinhMuc";
import DanhGiaPhuLuc2 from "../pages/DanhGia/DanhGiaPhuLuc2";
import DanhGiaNhanVien from "../pages/DanhGia/DanhGiaNhanVien";
import DanhGiaKpiDonVi from "../pages/DanhGia/DanhGiaKpiDonVi";
import ChiTietPhieuDonVi from "../pages/DanhGia/ChiTietPhieuDonVi";
import LichSuDanhGia from "../pages/DanhGia/LichSuDanhGia";
import ChiTietPhieuCuaToi from "../pages/DanhGia/ChiTietPhieuCuaToi";
import DuyetToTrinh from "../pages/QuanLyDanhGia/DuyetToTrinh";
import TheoDoiPhieuTruong from "../pages/QuanLyDanhGia/TheoDoiPhieuTruong";
import QLGioGiang from "../pages/QuanLyKeHoach/QL_GioGiang";
import QLViPham from "../pages/QuanLyKeHoach/QL_ViPham";
import QLLoaiViPham from "../pages/QuanLyKeHoach/QL_LoaiViPham";
import QLTongHopViPham from "../pages/QuanLyKeHoach/QL_TongHopViPham";
import QLThongKeViPhamKhoa from "../pages/QuanLyKeHoach/QL_ThongKeViPhamKhoa";
import QLDanhGiaSinhVien from "../pages/QuanLyKeHoach/QL_DanhGiaSinhVien";
import QLDiemTbDanhGiaSinhVien from "../pages/QuanLyKeHoach/QL_DiemTbDanhGiaSinhVien";
import QLChucDanh from "../pages/QuanLyToChuc/QL_ChucDanh";
import QLChucVu from "../pages/QuanLyToChuc/QL_ChucVu";
import DanhSachThanhVien from "../pages/QuanLyToChuc/DanhSachThanhVien";
import ThongTinCaNhan from "../pages/ThongTinCaNhan";
import TongQuanCaNhan from "../pages/CaNhan/TongQuanCaNhan";
import KhoMinhChung from "../pages/CaNhan/KhoMinhChung";
import PhanHoiSinhVienCuaToi from "../pages/CaNhan/PhanHoiSinhVienCuaToi";
import NhiemVuKhoaCuaToi from "../pages/CaNhan/NhiemVuKhoaCuaToi";
import ViPhamCuaToi from "../pages/CaNhan/ViPhamCuaToi";
import ThanhTichNckh from "../pages/CaNhan/ThanhTichNckh";
import KeKhaiGioQuyDoi from "../pages/CaNhan/KeKhaiGioQuyDoi";
import ChoCham from "../pages/QuanLyChamDiem/ChoCham";
// HangDoiThamDinh (hàng đợi theo dòng tiêu chí) đã bị ẩn — xem ghi chú ở
// menuConfig.js. File màn hình vẫn giữ trong pages/QuanLyChamDiem/.
import DanhSachPhieu from "../pages/QuanLyChamDiem/DanhSachPhieu";
import ChamDiemPhieu from "../pages/QuanLyChamDiem/ChamDiemPhieu";
import DuyetHoSoKhoa from "../pages/QuanLyChamDiem/DuyetHoSoKhoa";
import ChotHoSoKhoa from "../pages/QuanLyChamDiem/ChotHoSoKhoa";
import ToTrinhKhoa from "../pages/QuanLyChamDiem/ToTrinhKhoa";
import HoSoKpiGiangVien from "../pages/QuanLyChamDiem/HoSoKpiGiangVien";
import BaoCaoDonVi from "../pages/QuanLyChamDiem/BaoCaoDonVi";
import PhanCongNhiemVuKhoa from "../pages/QuanLyChamDiem/PhanCongNhiemVuKhoa";
import DuyetKeKhaiGioQuyDoi from "../pages/QuanLyChamDiem/DuyetKeKhaiGioQuyDoi";
import ChiTietDuyetKeKhai from "../pages/QuanLyChamDiem/ChiTietDuyetKeKhai";
import RequireRole from "../components/RequireRole";

const AppRoutes = ({ triggerNotification, setIsPassModalOpen }) => {
  return (
    <Routes>
      <Route
        element={
          <RequireRole>
            <Outlet />
          </RequireRole>
        }
      >
        <Route path="/" element={<TongQuanCaNhan />} />
        <Route
          path="/thong-tin-lien-he"
          element={<ThongTinCaNhan setIsPassModalOpen={setIsPassModalOpen} />}
        />
        <Route path="/danh-gia-phu-luc-2" element={<DanhGiaPhuLuc2 />} />
        <Route path="/danh-gia-kpi-nhan-vien" element={<DanhGiaNhanVien />} />
        <Route path="/danh-gia-kpi-don-vi" element={<DanhGiaKpiDonVi />} />
        <Route
          path="/danh-gia-kpi-don-vi/:id"
          element={<ChiTietPhieuDonVi />}
        />
        <Route path="/lich-su-danh-gia" element={<LichSuDanhGia />} />
        <Route path="/lich-su-danh-gia/:id" element={<ChiTietPhieuCuaToi />} />
        <Route path="/kho-minh-chung" element={<KhoMinhChung />} />
        <Route
          path="/phan-hoi-sinh-vien-cua-toi"
          element={<PhanHoiSinhVienCuaToi />}
        />
        <Route
          path="/nhiem-vu-khoa-cua-toi"
          element={<NhiemVuKhoaCuaToi />}
        />
        <Route path="/vi-pham-cua-toi" element={<ViPhamCuaToi />} />
        <Route path="/thanh-tich-nckh" element={<ThanhTichNckh />} />
        <Route path="/ke-khai-gio-quy-doi" element={<KeKhaiGioQuyDoi />} />
        <Route path="/quan-ly-nguoi-dung" element={<QLNhanVien />} />
        <Route
          path="/quan-ly-nguoi-dung/them-moi"
          element={<QLNhanVienChiTiet />}
        />
        <Route
          path="/quan-ly-nguoi-dung/chi-tiet/:id"
          element={<QLNhanVienChiTiet />}
        />
        <Route path="/quan-ly-don-vi" element={<QLDonVi />} />
        <Route
          path="/quan-ly-don-vi/:maDonVi/danh-sach-thanh-vien"
          element={<DanhSachThanhVien />}
        />
        <Route path="/tieu-chi-danh-gia" element={<QLTieuChi />} />
        <Route path="/nhom-tieu-chi" element={<QLNhomTieuChi />} />
        <Route path="/quan-ly-nam-danh-gia" element={<QLNamDanhGia />} />
        <Route path="/mau-danh-gia" element={<QLMauDanhGia />} />
        <Route
          path="/mau-danh-gia/:idMau/phan-quyen"
          element={<QLPhanQuyenTieuChi />}
        />
        <Route
          path="/:tieuChiId/thang-diem"
          element={<QLThangDiemByTieuChi />}
        />
        <Route
          path="/quan-ly-dinh-muc-giang-vien"
          element={<QLDinhMucGiangVien />}
        />
        <Route
          path="/quan-ly-ngoai-le-dinh-muc"
          element={<QLNgoaiLeDinhMuc />}
        />
        <Route path="/quan-ly-chuc-danh" element={<QLChucDanh />} />
        <Route path="/quan-ly-chuc-vu" element={<QLChucVu />} />
        <Route path="/truong/to-trinh" element={<DuyetToTrinh />} />
        <Route path="/truong/phieu" element={<TheoDoiPhieuTruong />} />
        <Route path="/quan-ly-gio-giang" element={<QLGioGiang />} />
        <Route path="/quan-ly-vi-pham" element={<QLViPham />} />
        <Route path="/danh-muc-loai-vi-pham" element={<QLLoaiViPham />} />
        <Route path="/tong-hop-vi-pham" element={<QLTongHopViPham />} />
        <Route
          path="/thong-ke-vi-pham-khoa"
          element={<QLThongKeViPhamKhoa />}
        />
        <Route
          path="/quan-ly-danh-gia-sinh-vien"
          element={<QLDanhGiaSinhVien />}
        />
        <Route
          path="/diem-trung-binh-danh-gia-sinh-vien"
          element={<QLDiemTbDanhGiaSinhVien />}
        />

        <Route path="/quan-ly/cho-cham" element={<ChoCham />} />
        <Route path="/quan-ly/phieu" element={<DanhSachPhieu />} />
        <Route path="/quan-ly/phieu/:id" element={<ChamDiemPhieu />} />
        <Route path="/quan-ly/duyet-ho-so" element={<DuyetHoSoKhoa />} />
        <Route path="/quan-ly/duyet-ho-so/:id" element={<ChotHoSoKhoa />} />
        <Route path="/quan-ly/to-trinh" element={<ToTrinhKhoa />} />
        <Route
          path="/quan-ly/giang-vien/:idNv"
          element={<HoSoKpiGiangVien />}
        />
        <Route path="/quan-ly/vi-pham" element={<QLViPham />} />
        <Route path="/quan-ly/bao-cao" element={<BaoCaoDonVi />} />
        <Route
          path="/quan-ly/nhiem-vu-khoa"
          element={<PhanCongNhiemVuKhoa />}
        />
        <Route
          path="/quan-ly/ke-khai-gio-quy-doi"
          element={<DuyetKeKhaiGioQuyDoi />}
        />
        <Route
          path="/quan-ly/ke-khai-gio-quy-doi/:id"
          element={<ChiTietDuyetKeKhai />}
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
