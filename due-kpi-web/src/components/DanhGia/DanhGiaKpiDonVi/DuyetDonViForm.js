import React, { useState } from "react";
import { formatDiem, formatNgayGio } from "../../../utils/phieuApi";
import {
  laDongChamTay,
  tinhTienDoDuyetDonVi,
  LOAI_NHOM_DV,
} from "../../../utils/phieuDonViApi";
import { NHAN_CAP_CHAM_KHOA } from "../../../utils/phieuKhoaApi";
import TienDoCham from "../../QuanLyChamDiem/TienDoCham";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../QuanLyChamDiem/TrangThaiBadge";
import TieuChiChamDonViCard from "../TieuChiChamDonViCard";

const TAB = {
  CHO_DUYET: "choDuyet",
  DA_DUYET: "daDuyet",
  TU_DONG: "tuDong",
  TAT_CA: "tatCa",
};

/**
 * Một tiêu chí coi là ĐÃ DUYỆT khi đã có `DiemDuyetDv`, tức đã đi qua
 * PUT diem-duyet-dv - dù bằng "Duyệt giữ nguyên" hay "Chỉnh sửa điểm", hai thao
 * tác ghi cùng một cột.
 *
 * Phiếu đơn vị KHÔNG có trạng thái từng dòng (chi_tiet_danh_gia_don_vi không có
 * cột trang_thai_dong như bên cá nhân), nên sự có mặt của điểm là dấu hiệu duy
 * nhất phân biệt được. Hệ quả: đã duyệt rồi vẫn chấm lại được, dòng chỉ đổi mục
 * chứ không bị khóa.
 */
const daDuyetDong = (ct) =>
  ct?.DiemDuyetDv !== null && ct?.DiemDuyetDv !== undefined;

/**
 * Thân trang cho bước TRƯỞNG ĐƠN VỊ DUYỆT phiếu KPI Khoa (trạng thái 2), dựng
 * theo đúng bố cục màn hình thẩm định hồ sơ giảng viên (ChamDiemPhieu): khối
 * `cd-phieu-header` ở trên, rồi danh sách thẻ `cdm-the`.
 *
 * Song sinh của DuyetPhongForm và cố ý TÁCH RIÊNG chứ không nhận thêm props:
 * mẫu Khoa gom tiêu chí theo HAI TẦNG (Nhóm A cơ bản / B vượt trội → nhóm con →
 * tiêu chí) trong khi mẫu Phòng/TT khai `loai_nhom = NULL` nên chỉ có một tầng.
 * Dựng chung một component thì mỗi lần sửa bố cục một bên phải nhớ cả bên kia.
 * Phần thẻ tiêu chí thì dùng CHUNG (TieuChiChamDonViCard) vì DTO giống hệt nhau.
 *
 * Chỉ phục vụ trạng thái 2. Bốn trạng thái còn lại vẫn do DanhGiaDonViForm (form
 * kê khai `pl2-*`) đảm nhiệm, vì ở đó việc cần làm là GÕ điểm cho cả phiếu chứ
 * không phải duyệt lại từng đề xuất có sẵn.
 *
 * MỘT TAB RIÊNG CHO DÒNG TỰ ĐỘNG: mẫu Khoa có tiêu chí `loai_nguon_diem = 2` do
 * hệ thống tổng hợp từ KPI thành viên. Chúng không nằm trong hàng đợi duyệt (xem
 * tinhTienDoDuyetDonVi) nhưng vẫn phải xem được - dồn chung vào "Chờ duyệt" thì
 * trưởng đơn vị không bao giờ bấm hết được, giấu đi thì mất một phần điểm của
 * phiếu khỏi màn hình.
 *
 * Tổng điểm ở đây luôn là TẠM TÍNH: ba cột `tong_diem_*` chỉ được server ghi ở
 * bước chốt (trạng thái 4→5), nên phiếu đang duyệt luôn trả null.
 */
const DuyetDonViForm = ({
  phieu,
  chiTietList = [],
  sections = [],
  tieuChiMap = new Map(),
  choPhepNhap = false,
  readOnly = false,
  lyDoKhoa = "",
  idDangLuu = null,
  cauHinhMc,
  tamTinh,
  onDuyetDong,
  onSuaDiemDong,
  onXemMinhChung,
  onTaiMinhChung,
}) => {
  const tienDo = tinhTienDoDuyetDonVi(chiTietList);
  const [tab, setTab] = useState(readOnly ? TAB.TAT_CA : TAB.CHO_DUYET);

  const chamTay = chiTietList.filter((ct) => laDongChamTay(ct));
  const demTuDong = chiTietList.length - chamTay.length;
  const demChoDuyet = chamTay.filter((ct) => !daDuyetDong(ct)).length;
  const demDaDuyet = chamTay.length - demChoDuyet;

  const hopTab = (ct) => {
    const tuDong = !laDongChamTay(ct);
    if (tab === TAB.CHO_DUYET) return !tuDong && !daDuyetDong(ct);
    if (tab === TAB.DA_DUYET) return !tuDong && daDuyetDong(ct);
    if (tab === TAB.TU_DONG) return tuDong;
    return true;
  };

  // Số thứ tự chạy liên tục qua các mục và BÁM THEO VỊ TRÍ TRONG CẢ PHIẾU, không
  // đánh lại theo danh sách đang lọc: người duyệt gọi nhau theo "tiêu chí số
  // mấy", con số đó không được đổi khi chuyển tab.
  const sttTheoDong = new Map();
  chiTietList.forEach((ct, i) => sttTheoDong.set(ct.IdChiTietDv, i + 1));

  // Mục nào lọc xong không còn dòng thì bỏ hẳn tiêu đề, thay vì để lại một đầu
  // mục trống không có gì bên dưới - áp cho cả hai tầng nhóm.
  const sectionsHienThi = sections
    .map((section) => ({
      ...section,
      nhomConList: (section.nhomConList || [])
        .map((nhomCon) => ({
          ...nhomCon,
          dong: (nhomCon.dong || []).filter(hopTab),
        }))
        .filter((nhomCon) => nhomCon.dong.length > 0),
    }))
    .filter((section) => section.nhomConList.length > 0);

  const cacTab = [
    {
      khoa: TAB.CHO_DUYET,
      nhan: "Chờ duyệt",
      icon: "fa-hourglass-half",
      dem: demChoDuyet,
      canhBao: true,
    },
    {
      khoa: TAB.DA_DUYET,
      nhan: "Đã duyệt",
      icon: "fa-circle-check",
      dem: demDaDuyet,
    },
    ...(demTuDong > 0
      ? [
          {
            khoa: TAB.TU_DONG,
            nhan: "Hệ thống tự chấm",
            icon: "fa-robot",
            dem: demTuDong,
          },
        ]
      : []),
    {
      khoa: TAB.TAT_CA,
      nhan: "Tất cả",
      icon: "fa-list",
      dem: chiTietList.length,
    },
  ];

  return (
    <>
      <div className="cd-phieu-header">
        <div className="cd-phieu-top">
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              {phieu.TenDonVi || `Đơn vị #${phieu.IdDonVi}`}
            </div>
            <div
              style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}
            >
              {phieu.TenMau ? `${phieu.TenMau} · ` : ""}Năm học {phieu.IdNam} ·
              Lần đánh giá {phieu.LanDanhGia}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <TrangThaiDonViBadge trangThai={phieu.TrangThai} />
            <TienDoCham
              xong={tienDo.xong}
              tong={tienDo.tong}
              nhan="Tiến độ duyệt"
              ghiChu={
                demTuDong > 0
                  ? `Không tính ${demTuDong} tiêu chí hệ thống tự chấm`
                  : undefined
              }
            />
          </div>
        </div>

        <div className="cd-meta-grid">
          <div>
            <div className="cd-meta-label">Tổng điểm tạm tính</div>
            <div className="cd-meta-value">
              {tamTinh ? `${formatDiem(tamTinh.tichLuy)} điểm` : "-"}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Điểm cơ bản / vượt trội</div>
            <div className="cd-meta-value">
              {tamTinh
                ? `${formatDiem(tamTinh.coBan)} / ${formatDiem(tamTinh.vuotTroi)}`
                : "-"}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Xếp loại</div>
            <div className="cd-meta-value">
              <XepLoaiBadge xepLoai={phieu.XepLoai} />
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Ngày gửi</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayGui)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Cập nhật gần nhất</div>
            <div className="cd-meta-value">
              {formatNgayGio(phieu.NgayCapNhat)}
            </div>
          </div>
        </div>

        <div className="cd-hint">
          <i className="fa-solid fa-circle-info"></i> Hệ thống chỉ lưu tổng điểm
          vào phiếu khi cấp Trường chốt. Số “tạm tính” do trình duyệt cộng từ
          điểm đang có hiệu lực của từng tiêu chí.
        </div>

        {/* Luồng đơn vị không có thao tác trả phiếu về cho thư ký - nói thẳng ra
            đây để trưởng đơn vị khỏi đi tìm một cái nút không tồn tại. */}
        {choPhepNhap && (
          <div className="cd-hint cd-hint-warn">
            <i className="fa-solid fa-triangle-exclamation"></i> Không có thao
            tác trả phiếu về cho thư ký. Điểm nào chưa đúng thì bạn chấm lại ngay
            tại tiêu chí đó - điểm của bạn thắng điểm thư ký khi tính tổng.
          </div>
        )}

        {phieu.LyDoMoLai && (
          <div className="cd-box" style={{ marginTop: "16px" }}>
            <div className="cd-box-title">Lý do phiếu được mở lại</div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              {phieu.LyDoMoLai}
            </div>
          </div>
        )}

        {phieu.NhanXetDv && (
          <div className="cd-box" style={{ marginTop: "10px" }}>
            <div className="cd-box-title">Nhận xét của Trưởng đơn vị</div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              {phieu.NhanXetDv}
            </div>
          </div>
        )}
      </div>

      <p className="sub-title" style={{ margin: "16px 0 12px 0" }}>
        CHI TIẾT TIÊU CHÍ ({chiTietList.length})
      </p>

      <div className="cd-tabs">
        {cacTab.map((t) => (
          <button
            key={t.khoa}
            type="button"
            className={`cd-tab${tab === t.khoa ? " cd-tab-active" : ""}`}
            onClick={() => setTab(t.khoa)}
          >
            <i className={`fa-solid ${t.icon}`}></i> {t.nhan}
            <span
              className={`cd-tab-dem${
                t.canhBao && t.dem > 0 ? " cd-tab-dem-canh-bao" : ""
              }`}
            >
              {t.dem}
            </span>
          </button>
        ))}
      </div>

      {sectionsHienThi.length === 0 ? (
        <div className="cd-empty">
          {tab === TAB.CHO_DUYET ? (
            <>
              <i
                className="fa-solid fa-circle-check"
                style={{ color: "#10b981" }}
              ></i>
              Không còn tiêu chí trong mục này.
            </>
          ) : (
            <>
              <i className="fa-solid fa-inbox"></i>
              Chưa có tiêu chí nào trong mục này.
            </>
          )}
        </div>
      ) : (
        sectionsHienThi.map((section, sIndex) => (
          <div key={section.loaiNhom || sIndex} style={{ marginBottom: "18px" }}>
            <p className="sub-title" style={{ marginBottom: "10px" }}>
              <i
                className={`fa-solid ${
                  Number(section.loaiNhom) === LOAI_NHOM_DV.VUOT_TROI
                    ? "fa-award"
                    : "fa-list-check"
                }`}
              ></i>{" "}
              {section.tenNhom}
            </p>

            {section.nhomConList.map((nhomCon, gIndex) => (
              <div key={nhomCon.ten || gIndex}>
                {!nhomCon.isDirect && (
                  <p
                    className="sub-title"
                    style={{ fontSize: "14px", marginBottom: "10px" }}
                  >
                    {nhomCon.ten}
                  </p>
                )}
                {nhomCon.dong.map((ct) => (
                  <TieuChiChamDonViCard
                    key={ct.IdChiTietDv}
                    chiTiet={ct}
                    stt={sttTheoDong.get(ct.IdChiTietDv)}
                    moTa={tieuChiMap?.get(Number(ct.IdTieuChi))?.moTa ?? ct.MoTa}
                    nhanCap={NHAN_CAP_CHAM_KHOA}
                    choPhepNhap={choPhepNhap && Number(phieu.TrangThai) === 2 && ct.DuocChamDuyetDv === true}
                    lyDoKhoa={readOnly ? lyDoKhoa : "Bạn không được giao chấm tiêu chí này."}
                    dangLuu={idDangLuu !== null}
                    cauHinhMc={cauHinhMc}
                    onDuyet={onDuyetDong}
                    onSuaDiem={onSuaDiemDong}
                    onXemMinhChung={onXemMinhChung}
                    onTaiMinhChung={onTaiMinhChung}
                  />
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
};

export default DuyetDonViForm;
