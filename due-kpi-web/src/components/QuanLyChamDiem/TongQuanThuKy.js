import React from "react";
import { Link } from "react-router-dom";
import { tenTrangThaiDonVi } from "../../utils/phieuDonViApi";
import {
  Card,
  DashHeader,
  demTrangThai,
  diem,
  gopDiemTrungBinh,
  hangXepLoaiNam,
  HeroKpi,
  hienThiKhoa,
  Icon,
  KpiCard,
  KpiRow,
  QuyCompact,
  Section,
  so,
  taoNhanTrangThai,
  TienDoPhieuNam,
  tyLe,
  XepLoaiBars,
} from "./TongQuanUi";

const NHAN_TRANG_THAI_NAM = {
  1: "Nháp",
  2: "Đang thẩm định",
  3: "Chờ trưởng đơn vị chốt",
  4: "Trưởng đơn vị đã chốt",
  5: "Hoàn tất",
};

/**
 * Tổng quan của Thư ký Khoa (TKK) / Thư ký Phòng (TKP).
 *
 * Thư ký chỉ được xem SỐ TỔNG HỢP (`CoQuyenXemDanhSach = false`): mọi danh sách
 * từng người đều ẩn, kể cả đường tắt "xem danh sách" trên thẻ số. Việc của thư
 * ký là phiếu đánh giá của chính đơn vị, nên các thẻ việc trỏ về đó.
 *
 * @param {object} duLieu số liệu cùng hợp đồng với GET bao-cao/tong-quan
 * @param {number|null} trangThaiPhieuDv trạng thái phiếu đánh giá đơn vị (null = chưa lập)
 * @param {object[]|null} diemTb các dòng GET bao-cao/diem-trung-binh, null = không đọc được
 */
const TongQuanThuKy = ({
  tieuDe,
  phuDe,
  loaiDonVi = "Khoa",
  controls,
  chinh = true,
  duLieu,
  trangThaiPhieuDv,
  duongDanPhieuDv,
  diemTb,
}) => {
  const tenTruong = loaiDonVi === "Khoa" ? "Trưởng khoa" : "Trưởng phòng";
  const dem = demTrangThai(duLieu?.DemTheoTrangThai);
  const nhanTrangThai = taoNhanTrangThai(duLieu?.DemTheoTrangThai, NHAN_TRANG_THAI_NAM);
  const soNhanVien = duLieu?.SoNhanVien;
  const soChuaLap = Number(duLieu?.SoChuaLapPhieu) || 0;
  const tongSoPhieu = Number(duLieu?.TongSoPhieu) || 0;
  const apDungQuy = duLieu?.ApDungPhieuQuy === true && (duLieu?.PhieuQuy || []).length > 0;
  const quyHienTai = apDungQuy ? duLieu?.QuyHienTai : null;
  const hocVu = duLieu?.HocVu;
  const diemGop = diemTb?.length ? gopDiemTrungBinh(diemTb) : null;
  const daLapPhieuDv = trangThaiPhieuDv != null;
  const dangNhap = Number(trangThaiPhieuDv) === 1;

  return (
    <>
      <DashHeader
        title={tieuDe}
        subtitle={phuDe}
        controls={controls}
        quyHienTai={quyHienTai}
        chinh={chinh}
      />

      {duLieu?.CoQuyenXemDanhSach !== true && (
        <div className="db-banner" role="note">
          <div className="db-banner-main">
            <Icon ten="khoa" size={18} />
            <span>
              Bạn xem được <b>số liệu tổng hợp</b> của {loaiDonVi}. Danh sách
              từng người (hồ sơ chưa hoàn tất, người chưa lập phiếu) chỉ{" "}
              {tenTruong} xem được.
            </span>
          </div>
        </div>
      )}

      <Section title="Việc của thư ký">
        <div className="db-task-grid">
          <div className="db-task db-thu-ky-task">
            <div className="db-quy-head">
              <span className="db-task-nhan">Phiếu đánh giá {loaiDonVi}</span>
              <span className="db-chip">
                {daLapPhieuDv ? tenTrangThaiDonVi(trangThaiPhieuDv) : "Chưa lập"}
              </span>
            </div>
            <span className="db-task-tieu-de">
              {!daLapPhieuDv
                ? `Lập phiếu, nhập điểm các tiêu chí của ${loaiDonVi} rồi gửi ${tenTruong} duyệt`
                : dangNhap
                  ? `Nhập điểm các tiêu chí của ${loaiDonVi} rồi gửi ${tenTruong} duyệt`
                  : "Phiếu đã gửi đi — theo dõi tiến trình duyệt"}
            </span>
            <Link
              className={`db-btn${!daLapPhieuDv || dangNhap ? " db-btn-primary" : ""}`}
              to={duongDanPhieuDv}
            >
              {!daLapPhieuDv ? "Lập phiếu" : dangNhap ? "Tiếp tục nhập điểm" : "Xem phiếu"}
            </Link>
          </div>
          {(!daLapPhieuDv || dangNhap) && (
            <div className="db-task db-thu-ky-task">
              <span className="db-task-nhan">Tổng hợp KPI {loaiDonVi}</span>
              <span className="db-task-tieu-de">
                Lấy số liệu tự động
                {loaiDonVi === "Khoa" ? " (giờ giảng, NCKH, học vụ...)" : ""} vào
                phiếu đánh giá {loaiDonVi}
              </span>
              <Link className="db-btn" to={duongDanPhieuDv}>
                Chạy tổng hợp
              </Link>
            </div>
          )}
          <div className="db-task db-thu-ky-task">
            <span className="db-task-nhan">Minh chứng đơn vị</span>
            <span className="db-task-tieu-de">
              Tra cứu tệp và liên kết minh chứng đã gắn vào phiếu đánh giá{" "}
              {loaiDonVi}
            </span>
            <Link className="db-btn" to="/kho-minh-chung-don-vi">
              Mở kho minh chứng
            </Link>
          </div>
        </div>
      </Section>

      <KpiRow
        hero={
          soNhanVien != null && (
            <HeroKpi
              nhan="Nhân sự đã lập phiếu năm"
              xong={Math.max(Number(soNhanVien) - soChuaLap, 0)}
              tong={soNhanVien}
            >
              <span className="db-kpi-phu">
                {so(soChuaLap)} người chưa lập · danh sách do {tenTruong} theo dõi
              </span>
            </HeroKpi>
          )
        }
      >
        <KpiCard
          nhan="Phiếu năm hoàn tất"
          giaTri={so(dem.get(5) || 0)}
          phu={`trên ${so(tongSoPhieu)} phiếu đã lập`}
        />
        {diemGop && (
          <KpiCard
            nhan="Điểm TB phiếu hoàn tất"
            giaTri={diem(diemGop.chung)}
            phu={[
              diemGop.giangVien != null && `GV ${diem(diemGop.giangVien)}`,
              diemGop.vienChuc != null && `VC ${diem(diemGop.vienChuc)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        {hocVu && (
          <KpiCard
            nhan="Tốt nghiệp đúng hạn"
            laChu={hocVu.TyLeTotNghiepDungHan == null}
            giaTri={hocVu.TyLeTotNghiepDungHan == null ? "Chưa có dữ liệu" : tyLe(hocVu.TyLeTotNghiepDungHan)}
            phu={`Khóa ${hienThiKhoa(hocVu.NamNhapHocTotNghiep)} · cảnh báo học vụ ${tyLe(hocVu.TyLeCanhBaoHocVu)}`}
          />
        )}
      </KpiRow>

      <div className="db-grid-3">
        <TienDoPhieuNam
          className="db-span-2"
          dem={dem}
          nhanTrangThai={nhanTrangThai}
          tongSoPhieu={tongSoPhieu}
          theoLoai={duLieu?.TheoLoaiDoiTuong}
        />
        {apDungQuy ? (
          <Card
            title={`Phiếu quý — viên chức${loaiDonVi === "Khoa" ? " văn phòng" : ""}`}
            meta={`${so(duLieu.PhieuQuy[0]?.SoNhanVien)} viên chức`}
          >
            <QuyCompact rows={duLieu.PhieuQuy} quyHienTai={quyHienTai} />
          </Card>
        ) : (
          <Card
            title="Xếp loại năm"
            meta={`${so(dem.get(5) || 0)} phiếu hoàn tất`}
          >
            {duLieu?.DemTheoXepLoai?.length ? (
              <XepLoaiBars rows={hangXepLoaiNam(duLieu.DemTheoXepLoai)} />
            ) : (
              <p className="db-empty">Chưa có phiếu hoàn tất được xếp loại.</p>
            )}
          </Card>
        )}
      </div>
    </>
  );
};

export default TongQuanThuKy;
