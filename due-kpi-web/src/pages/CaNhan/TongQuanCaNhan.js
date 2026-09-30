import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/CaNhan/TongQuanCaNhan.css";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import {
  fetchKiemTraHopLe,
  fetchPhieuCuaToi,
  formatNgay,
  laDongBiTraVe,
  locDongChoBoSung,
  moTaHanNop,
  nhanHanNop,
  parseNgay,
  tenTrangThai,
  tinhCuaSoTuDanhGia,
  TRANG_THAI,
  XEP_LOAI_META,
} from "../../utils/phieuApi";
import {
  donViTheoVaiTro,
  duongDanPhieuTuDanhGia,
  hasRole,
  ROLE,
  ROLE_SETS,
  coLoaiDoiTuong,
  LOAI_DOI_TUONG_KPI,
  VAI_TRO_TRUONG_PHONG,
} from "../../utils/roles";
import ThieuTieuChiChecklist from "../../components/DanhGia/ThieuTieuChiChecklist";
import TongQuanKhoa from "../../components/QuanLyChamDiem/TongQuanKhoa";
import TongQuanCapQuanLy from "../../components/QuanLyChamDiem/TongQuanCapQuanLy";
import TongQuanVienChucCaNhan from "../../components/QuanLyChamDiem/TongQuanVienChucCaNhan";
import {
  Card,
  DangTai,
  DashHeader,
  diem,
  Icon,
  KpiCard,
  KpiRow,
} from "../../components/QuanLyChamDiem/TongQuanUi";

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;

/**
 * Số ngày còn lại tính từ một mốc hạn do SERVER cấp (HanNop).
 *
 * Đây chỉ là định dạng hiển thị, không phải suy diễn hạn: cột hạn trong DB là
 * DATE nên phải kéo đến hết ngày trước khi trừ, nếu không người dùng mất trắng
 * ngày cuối.
 */
const soNgayToiHan = (han) => {
  const ngay = parseNgay(han);
  if (!ngay) return null;
  const hetNgay = new Date(ngay);
  hetNgay.setHours(23, 59, 59, 999);
  return Math.ceil((hetNgay.getTime() - Date.now()) / MOT_NGAY_MS);
};

/**
 * Trang chủ: bảng điều khiển theo vai trò (Hiệu trưởng, Trưởng khoa / Thư ký
 * khoa, Trưởng phòng / Thư ký phòng) rồi tới phiếu KPI của chính người xem -
 * phiếu năm hiện tại đang ở đâu, được bao nhiêu điểm, còn bao lâu để tự đánh
 * giá và còn thiếu gì trước khi nộp.
 *
 * Route "/" mở cho MỌI vai trò (xem PUBLIC_ROUTES trong config/menuConfig.js), kể
 * cả tài khoản quản trị vốn không có phiếu KPI cá nhân nào. Vì vậy mọi khối đều
 * phải xuống thang êm: không phiếu = trạng thái trống, KHÔNG phải lỗi để báo đỏ.
 */
const TongQuanCaNhan = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = useMemo(() => user || {}, [user]);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [phieu, setPhieu] = useState(null);
  const [kiemTra, setKiemTra] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const coTongQuanKhoa = hasRole(ROLE_SETS.KPI_KHOA, currentUser);
  const coTongQuanTruong = hasRole(ROLE_SETS.CAP_TRUONG, currentUser);
  const coTongQuanPhong =
    !coTongQuanTruong && hasRole(ROLE_SETS.KPI_PHONG, currentUser);
  // TKP chỉ xem số tổng hợp; người vừa là TKP vừa là trưởng Phòng thì xem bản trưởng.
  const laThuKyPhong =
    coTongQuanPhong && !hasRole(VAI_TRO_TRUONG_PHONG, currentUser);
  const coDashboard = coTongQuanKhoa || coTongQuanTruong || coTongQuanPhong;

  const dsDonVi = useMemo(
    () => (Array.isArray(currentUser.DonVi) ? currentUser.DonVi : []),
    [currentUser],
  );

  const idDonViKhoa = useMemo(() => {
    const donViKpiKhoa = donViTheoVaiTro(ROLE_SETS.KPI_KHOA, currentUser);
    const donViTruongKhoa = donViKpiKhoa.find((d) =>
      ROLE_SETS.TRUONG_KHOA.includes(
        String(d.MaChucVu || "").trim().toUpperCase(),
      ),
    );
    const donViThuKyKhoa = donViKpiKhoa.find(
      (d) => String(d.MaChucVu || "").trim().toUpperCase() === ROLE.THU_KY_KHOA,
    );
    return (donViTruongKhoa || donViThuKyKhoa)?.IdDonVi || currentUser.IdDonVi;
  }, [currentUser]);

  const tenDonViKhoa = dsDonVi.find(
    (d) => Number(d.IdDonVi) === Number(idDonViKhoa),
  )?.TenDonVi;
  const donViChinh = dsDonVi.find((d) => d?.LaChinh) || dsDonVi[0];

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const duongDanPhieu = duongDanPhieuTuDanhGia(currentUser, selectedNam);

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    setKiemTra(null);

    const phieuCuaToi = await fetchPhieuCuaToi(selectedNam);
    setPhieu(phieuCuaToi);

    // Gọi cho MỌI phiếu, không chỉ phiếu đang ở trạng thái Nhập: từ khi hạn được
    // chọn theo giai đoạn, đây là chỗ duy nhất biết hạn hiệu lực và cờ QuaHan
    // của phiếu ở trạng thái 2 (vòng lặp trả về). SoTieuChiThieu cũng chỉ đếm
    // dòng đang chờ kê khai nên dùng chung được cho cả nộp lại.
    if (phieuCuaToi?.IdPhieu) {
      try {
        setKiemTra(await fetchKiemTraHopLe(phieuCuaToi.IdPhieu));
      } catch (error) {
        console.error("Lỗi kiểm tra điều kiện nộp phiếu:", error);
        showToast("warn", "Không kiểm tra được điều kiện nộp", error.message);
      }
    }

    setIsLoading(false);
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const namDangChon = useMemo(
    () => namList.find((n) => String(n.IdNam) === String(selectedNam)) || null,
    [namList, selectedNam],
  );

  /**
   * Cửa sổ tự đánh giá theo cấu hình NĂM - chỉ dùng khi CHƯA có phiếu.
   * Có phiếu rồi thì hạn hiệu lực do server chọn theo giai đoạn và chỉ đọc được
   * ở kiem-tra-hop-le; tự tính lại sẽ báo "đã đóng" cho cả người đang trong hạn
   * bổ sung theo yêu cầu thẩm định.
   */
  const cuaSoNam = useMemo(
    () => tinhCuaSoTuDanhGia(namDangChon),
    [namDangChon],
  );

  /**
   * Chủ phiếu còn việc phải làm không.
   *
   * Nộp lại KHÔNG đưa phiếu ra khỏi trạng thái 2 (đúng thiết kế - không phải
   * vòng đánh giá mới) nên `HanNop` vẫn là hạn thẩm định và vẫn còn giá trị.
   * Nhưng lúc đó bóng đã sang chân đơn vị thẩm định, hiện tiếp một cái hạn chỉ
   * khiến người dùng tưởng mình còn phải nộp gì nữa.
   */
  const conViecCuaChuPhieu =
    !phieu ||
    Number(phieu.TrangThai) === TRANG_THAI.NHAP ||
    locDongChoBoSung(phieu.ChiTiet || []).length > 0;

  const quaHan = kiemTra
    ? Boolean(kiemTra.QuaHan)
    : cuaSoNam.trangThai === "da-dong";

  // Nhãn tự đổi theo giai đoạn: "Hạn tự đánh giá" ở trạng thái 1, "Hạn bổ sung
  // theo yêu cầu thẩm định" ở trạng thái 2.
  const nhanHan = kiemTra ? nhanHanNop(kiemTra.TrangThai) : "Hạn tự đánh giá";
  const thongDiepHan = kiemTra ? moTaHanNop(kiemTra) : cuaSoNam.thongDiep;

  const hanNop = kiemTra ? kiemTra.HanNop : cuaSoNam.ngayDong;
  const soNgayConLai = quaHan ? null : soNgayToiHan(hanNop);
  const chuaMo = !kiemTra && cuaSoNam.trangThai === "chua-mo";
  const sapHetHan = soNgayConLai != null && soNgayConLai <= 7;

  /**
   * Điểm tạm tính khi server chưa chốt TongDiemTichLuy: cộng dồn điểm tự đánh giá
   * trên từng tiêu chí. Đây là con số GV nhìn thấy trong form, chưa gồm điểm cấp
   * trên chấm lại - nhãn hiển thị phải nói rõ điều đó.
   */
  const diemTamTinh = useMemo(() => {
    const chiTiet = phieu?.ChiTiet || [];
    if (chiTiet.length === 0) return null;
    return chiTiet.reduce(
      (tong, ct) => tong + (Number(ct.DiemTuDanhGia) || 0),
      0,
    );
  }, [phieu]);

  /**
   * Tiêu chí đơn vị thẩm định đã trả về cho chính người đang xem (NguonTraVe = 2).
   * Chỉ dòng có yêu cầu trả về ĐANG MỞ mới còn giữ trường này - nộp lại xong là
   * server xóa, nên không cần lọc thêm theo TrangThaiDong.
   *
   * NguonTraVe = 3 (Trưởng khoa trả đơn vị thẩm định làm lại) KHÔNG thuộc việc
   * của giảng viên, đừng gộp vào đây.
   */
  const dongBiTraVe = useMemo(
    () => (phieu?.ChiTiet || []).filter(laDongBiTraVe),
    [phieu],
  );

  const daChotDiem = phieu?.TongDiemTichLuy != null;
  const thieu = kiemTra?.ThieuMinhChung || [];

  const moPhieu = () => {
    if (duongDanPhieu) navigate(duongDanPhieu);
  };

  const boLoc = (
    <label className="db-field">
      Năm đánh giá
      <select
        className="db-select"
        value={selectedNam}
        onChange={(e) => setSelectedNam(e.target.value)}
        disabled={dangTaiNam}
      >
        {namList.map((n) => (
          <option key={n.IdNam} value={String(n.IdNam)}>
            {n.IdNam}
          </option>
        ))}
      </select>
    </label>
  );

  /* -------------------------------------------------------------- */
  /* Khối "việc với phiếu năm": trả về / còn thiếu / chưa có phiếu    */
  /* -------------------------------------------------------------- */

  const khoiViecPhieu = !phieu ? (
    <Card title="Phiếu năm của bạn">
      {duongDanPhieu ? (
        <div className="db-inline-item" style={{ fontSize: 14 }}>
          <Icon ten="thongTin" />
          <span>
            <b>Bạn chưa có phiếu năm {selectedNam}.</b> Phiếu được tạo khi bạn lưu
            lần đầu trong form tự đánh giá.
          </span>
        </div>
      ) : (
        <div className="db-inline-item" style={{ fontSize: 14 }}>
          <Icon ten="thongTin" />
          <span>
            <b>Bạn không thuộc diện tự đánh giá KPI.</b> Chức danh nghề nghiệp hiện
            tại không gắn với biểu mẫu KPI cá nhân nào.
          </span>
        </div>
      )}
    </Card>
  ) : dongBiTraVe.length > 0 ? (
    <Card
      title="Cần bạn bổ sung"
      meta={`${dongBiTraVe.length} tiêu chí bị trả về - sửa xong bấm "Nộp lại" trong phiếu tự đánh giá`}
    >
      <div>
        {dongBiTraVe.map((ct) => (
          <div className="cd-mc-row" key={ct.IdChiTiet}>
            <i
              className="fa-solid fa-circle-exclamation cd-mc-icon"
              style={{ color: "#d97706" }}
            ></i>
            <div className="cd-mc-main">
              <div
                className="cd-mc-name"
                style={{ color: "#0f172a", cursor: "default" }}
              >
                {ct.TenTieuChi || `Tiêu chí #${ct.IdTieuChi}`}
              </div>
              {ct.LyDoTraVe && (
                <div className="db-tra-ve-ly-do">{ct.LyDoTraVe}</div>
              )}
              <div className="cd-mc-meta">
                {ct.TenDonViThamDinh || "Đơn vị thẩm định"} trả về
                {ct.NgayTraVe ? ` ngày ${formatNgay(ct.NgayTraVe)}` : ""}
                {ct.SoLanTraVe > 1 ? ` · lần thứ ${ct.SoLanTraVe}` : ""}
              </div>
            </div>
            {duongDanPhieu && (
              <button type="button" className="cd-mc-act" onClick={moPhieu}>
                <i className="fa-solid fa-arrow-right"></i> Bổ sung
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  ) : Number(phieu.TrangThai) !== TRANG_THAI.NHAP ? null : !kiemTra ? (
    <Card title="Còn thiếu gì để nộp">
      <div className="db-inline-item" style={{ fontSize: 14 }}>
        <Icon ten="canhBao" />
        <span>Chưa lấy được kết quả kiểm tra. Tải lại trang để thử lại.</span>
      </div>
    </Card>
  ) : (
    <Card
      title="Còn thiếu gì để nộp"
      meta={
        kiemTra.CoTheNop
          ? `Phiếu đủ điều kiện nộp (${kiemTra.TongSoTieuChi} tiêu chí đã hoàn tất)`
          : `Còn ${kiemTra.SoTieuChiThieu}/${kiemTra.TongSoTieuChi} tiêu chí chưa xong`
      }
    >
      {/* Cùng schema với missingItems của 422 /submit và /nop-lai nên dùng
          chung đúng một component checklist. */}
      {thieu.length > 0 ? (
        <ThieuTieuChiChecklist
          items={thieu}
          onMo={duongDanPhieu ? moPhieu : undefined}
        />
      ) : (
        <div className="db-inline-item" style={{ fontSize: 14 }}>
          <Icon ten="xong" />
          <span>Không còn tiêu chí nào thiếu minh chứng.</span>
        </div>
      )}
    </Card>
  );

  /* -------------------------------------------------------------- */
  /* Phiếu cá nhân chung (giảng viên, và viên chức khi năm chưa chấm  */
  /* theo quý)                                                        */
  /* -------------------------------------------------------------- */

  const bannerMuc = !conViecCuaChuPhieu
    ? ""
    : quaHan
      ? " is-danger"
      : sapHetHan || (!kiemTra && cuaSoNam.trangThai !== "dang-mo")
        ? " is-warn"
        : "";

  const khoiPhieuChung = (
    <>
      <div className={`db-banner${bannerMuc}`}>
        <div className="db-banner-main">
          <Icon
            ten={!conViecCuaChuPhieu ? "xong" : quaHan || sapHetHan ? "canhBao" : "dongHo"}
            size={20}
            mau={!conViecCuaChuPhieu || !(quaHan || sapHetHan) ? "#0056b3" : undefined}
          />
          <div className="db-banner-text">
            {conViecCuaChuPhieu ? (
              <>
                <span className="db-banner-tieu-de">{thongDiepHan}</span>
                {dongBiTraVe.length > 0 && (
                  <span className="db-banner-mo-ta">
                    Đơn vị thẩm định đã trả về {dongBiTraVe.length} tiêu chí cần bạn
                    bổ sung rồi nộp lại. Các tiêu chí khác vẫn giữ nguyên tiến độ.
                    {/* Hạn chặn việc bổ sung là hạn THẨM ĐỊNH chứ không phải hạn tự
                        đánh giá - QuaHan của kiem-tra-hop-le đã phản ánh đúng. */}
                    {quaHan &&
                      " Đã quá hạn nên bạn cần được gia hạn riêng mới sửa được - liên hệ đơn vị quản lý."}
                  </span>
                )}
              </>
            ) : (
              <span className="db-banner-tieu-de">
                Bạn đã nộp xong phần của mình. Phiếu đang{" "}
                {tenTrangThai(phieu?.TrangThai).toLowerCase()}.
              </span>
            )}
          </div>
        </div>
        {duongDanPhieu && (
          <button type="button" className="db-btn db-btn-primary" onClick={moPhieu}>
            {dongBiTraVe.length > 0
              ? `Bổ sung ${dongBiTraVe.length} tiêu chí`
              : phieu
                ? "Mở phiếu tự đánh giá"
                : "Bắt đầu tự đánh giá"}
          </button>
        )}
      </div>

      <KpiRow>
        <KpiCard
          nhan="Trạng thái phiếu"
          laChu
          giaTri={phieu ? tenTrangThai(phieu.TrangThai) : "Chưa có phiếu"}
          phu={phieu ? `Lần đánh giá ${phieu.LanDanhGia ?? 1}` : undefined}
        />
        <KpiCard
          nhan={daChotDiem ? "Tổng điểm tích lũy" : "Điểm tạm tính"}
          giaTri={diem(daChotDiem ? phieu.TongDiemTichLuy : diemTamTinh)}
          phu={!daChotDiem && diemTamTinh != null ? "Chưa gồm điểm cấp trên chấm" : undefined}
        />
        <KpiCard
          nhan="Xếp loại"
          laChu
          giaTri={phieu?.XepLoai ? XEP_LOAI_META[phieu.XepLoai]?.label || "—" : "Chưa chốt kết quả"}
        />
        {/* Không còn việc thì thẻ này nói về tình trạng chứ không nói về hạn:
            hạn của giai đoạn vẫn còn hiệu lực nhưng không phải việc của chủ
            phiếu nữa. */}
        {conViecCuaChuPhieu ? (
          <KpiCard
            nhan={nhanHan}
            laChu={quaHan || chuaMo || !hanNop}
            giaTri={
              quaHan
                ? "Đã đóng"
                : chuaMo
                  ? "Chưa mở"
                  : !hanNop
                    ? "Chưa thiết lập"
                    : `${soNgayConLai} ngày`
            }
            phu={hanNop ? `Hạn chót ${formatNgay(hanNop)}` : undefined}
          />
        ) : (
          <KpiCard
            nhan="Việc của bạn"
            laChu
            giaTri="Đã xong"
            phu={`Phiếu đang ${tenTrangThai(phieu?.TrangThai).toLowerCase()}`}
          />
        )}
      </KpiRow>

      <div className="db-grid-3">
        <div className="db-span-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {khoiViecPhieu || (
            <Card title="Còn thiếu gì để nộp">
              <div className="db-inline-item" style={{ fontSize: 14 }}>
                <Icon ten="xong" />
                <span>
                  Phiếu đã nộp, đang <b>{tenTrangThai(phieu?.TrangThai)}</b>.
                </span>
              </div>
            </Card>
          )}
        </div>
        <Card title={`Phiếu năm ${selectedNam}`}>
          <div className="db-kv-list">
            <div className="db-kv">
              <span>Ngày gửi</span>
              <span>{phieu ? formatNgay(phieu.NgayGui) : "—"}</span>
            </div>
            <div className="db-kv">
              <span>Cập nhật gần nhất</span>
              <span>{phieu ? formatNgay(phieu.NgayCapNhat) : "—"}</span>
            </div>
            <div className="db-kv">
              <span>Số tiêu chí</span>
              <span>{phieu ? (phieu.ChiTiet || []).length : "—"}</span>
            </div>
          </div>
          <div className="db-quick-links">
            <Link className="db-btn" to="/lich-su-danh-gia">
              Danh sách phiếu của tôi
            </Link>
            <Link className="db-btn" to="/kho-minh-chung">
              Kho minh chứng
            </Link>
          </div>
        </Card>
      </div>
    </>
  );

  const laVienChuc = coLoaiDoiTuong(currentUser, LOAI_DOI_TUONG_KPI.VIEN_CHUC);
  // Chỉ việc thật sự cần làm mới đi kèm khối viên chức; phiếu đã nộp thì thôi.
  const khoiViecVienChuc =
    phieu && (dongBiTraVe.length > 0 || Number(phieu.TrangThai) === TRANG_THAI.NHAP)
      ? khoiViecPhieu
      : null;

  const phanCaNhan =
    isLoading || dangTaiNam ? (
      <DangTai>Đang tải thông tin phiếu của bạn...</DangTai>
    ) : !coDashboard && laVienChuc ? (
      <TongQuanVienChucCaNhan
        idNam={selectedNam}
        idNhanVien={currentUser.IdNhanVien}
        phieu={phieu}
        hanNop={hanNop}
        nhanHan={nhanHan}
        duongDanPhieu={duongDanPhieu}
        fallback={khoiPhieuChung}
      >
        {khoiViecVienChuc}
      </TongQuanVienChucCaNhan>
    ) : (
      khoiPhieuChung
    );

  return (
    <div className="page-container tq-page db">
      <Toast ref={toast} position="top-right" />

      {/* Khối quản lý đặt TRÊN phần cá nhân và ngoài nhánh isLoading: số liệu
          đơn vị là việc hằng ngày của người quản lý, và để ngoài thì hai nửa tải
          song song thay vì nửa dưới phải chờ phiếu cá nhân xong. */}
      {coTongQuanKhoa && !dangTaiNam && (
        <TongQuanKhoa
          idNam={selectedNam}
          idDonVi={idDonViKhoa}
          tenDonVi={tenDonViKhoa}
          controls={boLoc}
          chinh
        />
      )}

      {(coTongQuanTruong || coTongQuanPhong) && !dangTaiNam && (
        <TongQuanCapQuanLy
          idNam={selectedNam}
          cap={coTongQuanTruong ? "truong" : "phong"}
          anThongKeTienDo={hasRole(ROLE_SETS.TRUONG_KHOA, currentUser)}
          thuKy={laThuKyPhong}
          controls={coTongQuanKhoa ? undefined : boLoc}
          chinh={!coTongQuanKhoa}
        />
      )}

      {coDashboard ? (
        <h2 className="db-section-title" style={{ fontSize: 20, marginTop: 8 }}>
          Phiếu KPI của bạn
        </h2>
      ) : (
        <DashHeader
          title="Kết quả đánh giá của tôi"
          subtitle={[currentUser.HoTen, currentUser.TenChucDanh, donViChinh?.TenDonVi]
            .filter(Boolean)
            .join(" · ")}
          controls={boLoc}
        />
      )}

      {phanCaNhan}
    </div>
  );
};

export default TongQuanCaNhan;
