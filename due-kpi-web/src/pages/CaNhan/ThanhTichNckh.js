import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/CaNhan/ThanhTichNckh.css";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import SearchSelect from "../../components/Common/SearchSelect";
import { formatDiem, formatNgay, formatNgayGio } from "../../utils/phieuApi";
import {
  NHOM_MOC_NCKH,
  demMocDat,
  fetchBaiBao,
  fetchChiTietNckh,
  fetchDeTai,
  fetchKeKhaiKhac,
  fetchSach,
  kieuTrangThai,
} from "../../utils/nckhApi";

const TABS = [
  { key: "baiBao", nhan: "Bài báo", icon: "fa-solid fa-file-lines" },
  { key: "deTai", nhan: "Đề tài / dự án", icon: "fa-solid fa-diagram-project" },
  { key: "sach", nhan: "Sách", icon: "fa-solid fa-book" },
  { key: "keKhai", nhan: "Kê khai khác", icon: "fa-solid fa-list-check" },
];

const RONG = { items: [], tongSo: 0 };

const DU_LIEU_RONG = {
  chuaLienKet: false,
  hoSo: null,
  tongHop: null,
  baiBao: RONG,
  deTai: RONG,
  sach: RONG,
  keKhai: RONG,
};

const LOP_BADGE = {
  duyet: "pill-green",
  cho: "pill-amber",
  tuChoi: "pill-red",
  khac: "pill-gray",
};

const NHAN_BAN_GHI = {
  baiBao: "bài báo",
  deTai: "đề tài / dự án",
  sach: "sách",
  keKhai: "kê khai",
};

const Gach = () => <span className="nckh-trong">-</span>;

const hoacGach = (value) => (value == null || value === "" ? <Gach /> : value);

const BadgeTrangThai = ({ trangThai }) => {
  if (!trangThai) return <Gach />;
  const kieu = kieuTrangThai(trangThai);
  return <span className={`status-pill ${LOP_BADGE[kieu]}`}>{trangThai}</span>;
};

const BangBaiBao = ({ items }) => (
  <table className="custom-table" style={{ minWidth: "1080px" }}>
    <thead>
      <tr>
        <th style={{ width: "56px", textAlign: "center" }}>STT</th>
        <th>BÀI BÁO</th>
        <th style={{ width: "220px" }}>DANH MỤC</th>
        <th style={{ width: "80px", textAlign: "center" }}>HẠNG</th>
        <th style={{ width: "90px", textAlign: "center" }}>ĐIỂM TC</th>
        <th style={{ width: "110px", textAlign: "center" }}>NGÀY XB</th>
        <th style={{ width: "80px", textAlign: "center" }}>SỐ TG</th>
        <th style={{ width: "150px" }}>TRẠNG THÁI</th>
      </tr>
    </thead>
    <tbody>
      {items.map((bb, index) => (
        <tr key={`${bb.MaNguoiDungNckh}-${bb.MaBaiBaoNguon}`}>
          <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
          <td style={{ textAlign: "justify" }}>
            <div className="nckh-tieu-de-cong-trinh">{hoacGach(bb.TieuDe)}</div>
            {(bb.TenTapChi || bb.IssnIsbn) && (
              <div className="nckh-phu-de">
                {[bb.TenTapChi, bb.IssnIsbn].filter(Boolean).join(" · ")}
              </div>
            )}
          </td>
          <td style={{ color: "#1d4ed8" }}>
            {hoacGach(bb.DanhMucTapChi || bb.LoaiTapChi)}
          </td>
          <td style={{ textAlign: "center" }}>{hoacGach(bb.XepHangQ)}</td>
          <td style={{ textAlign: "center", fontWeight: 600 }}>
            {formatDiem(bb.DiemTapChi, 2)}
          </td>
          <td style={{ textAlign: "center" }}>{formatNgay(bb.NgayXuatBan)}</td>
          <td style={{ textAlign: "center" }}>{hoacGach(bb.TongSoTacGia)}</td>
          <td>
            <BadgeTrangThai trangThai={bb.TrangThai} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const BangDeTai = ({ items }) => (
  <table className="custom-table" style={{ minWidth: "980px" }}>
    <thead>
      <tr>
        <th style={{ width: "56px", textAlign: "center" }}>STT</th>
        <th>ĐỀ TÀI / DỰ ÁN</th>
        <th style={{ width: "230px" }}>CẤP ĐỀ TÀI</th>
        <th style={{ width: "120px", textAlign: "center" }}>BẮT ĐẦU</th>
        <th style={{ width: "120px", textAlign: "center" }}>KẾT THÚC</th>
        <th style={{ width: "150px" }}>TRẠNG THÁI</th>
      </tr>
    </thead>
    <tbody>
      {items.map((dt, index) => (
        <tr key={`${dt.MaNguoiDungNckh}-${dt.MaDeTaiNguon}`}>
          <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
          <td style={{ textAlign: "justify" }}>
            <div className="nckh-tieu-de-cong-trinh">{hoacGach(dt.TieuDe)}</div>
            {dt.MaDeTai && <div className="nckh-phu-de">Mã: {dt.MaDeTai}</div>}
          </td>
          <td style={{ color: "#475569", fontWeight: 600 }}>
            {hoacGach(dt.CapDeTai)}
          </td>
          <td style={{ textAlign: "center" }}>{formatNgay(dt.NgayBatDau)}</td>
          <td style={{ textAlign: "center" }}>{formatNgay(dt.NgayKetThuc)}</td>
          <td>
            <BadgeTrangThai trangThai={dt.TrangThai} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const BangSach = ({ items }) => (
  <table className="custom-table" style={{ minWidth: "1020px" }}>
    <thead>
      <tr>
        <th style={{ width: "56px", textAlign: "center" }}>STT</th>
        <th>SÁCH / GIÁO TRÌNH</th>
        <th style={{ width: "180px" }}>LOẠI SÁCH</th>
        <th style={{ width: "220px" }}>NHÀ XUẤT BẢN</th>
        <th style={{ width: "110px", textAlign: "center" }}>NGÀY XB</th>
        <th style={{ width: "80px", textAlign: "center" }}>SỐ TG</th>
        <th style={{ width: "150px" }}>TRẠNG THÁI</th>
      </tr>
    </thead>
    <tbody>
      {items.map((s, index) => (
        <tr key={`${s.MaNguoiDungNckh}-${s.MaSachNguon}`}>
          <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
          <td style={{ textAlign: "justify" }}>
            <div className="nckh-tieu-de-cong-trinh">{hoacGach(s.TieuDe)}</div>
            {s.Isbn && <div className="nckh-phu-de">ISBN: {s.Isbn}</div>}
          </td>
          <td style={{ color: "#475569", fontWeight: 600 }}>
            {hoacGach(s.LoaiSach)}
          </td>
          <td style={{ color: "#475569" }}>
            <div>{hoacGach(s.NhaXuatBan)}</div>
            {s.NoiXuatBan && <div className="nckh-phu-de">{s.NoiXuatBan}</div>}
          </td>
          <td style={{ textAlign: "center" }}>{formatNgay(s.NgayXuatBan)}</td>
          <td style={{ textAlign: "center" }}>{hoacGach(s.TongSoTacGia)}</td>
          <td>
            <BadgeTrangThai trangThai={s.TrangThai} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const BangKeKhai = ({ items }) => (
  <table className="custom-table" style={{ minWidth: "900px" }}>
    <thead>
      <tr>
        <th style={{ width: "56px", textAlign: "center" }}>STT</th>
        <th>NỘI DUNG KÊ KHAI</th>
        <th style={{ width: "130px", textAlign: "center" }}>NGÀY ÁP DỤNG</th>
        <th style={{ width: "100px", textAlign: "center" }}>SỐ LƯỢNG</th>
        <th style={{ width: "110px", textAlign: "center" }}>SỐ THÀNH VIÊN</th>
        <th style={{ width: "150px" }}>TRẠNG THÁI</th>
      </tr>
    </thead>
    <tbody>
      {items.map((kk, index) => (
        <tr key={`${kk.MaNguoiDungNckh}-${kk.MaKeKhaiNguon}`}>
          <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
          <td style={{ textAlign: "justify" }}>
            <div className="nckh-tieu-de-cong-trinh">
              {hoacGach(kk.TenNoiDung)}
            </div>
          </td>
          <td style={{ textAlign: "center" }}>{formatNgay(kk.NgayApDung)}</td>
          <td style={{ textAlign: "center" }}>{hoacGach(kk.SoLuong)}</td>
          <td style={{ textAlign: "center" }}>{hoacGach(kk.SoThanhVien)}</td>
          <td>
            <BadgeTrangThai trangThai={kk.TrangThai} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const BANG_THEO_TAB = {
  baiBao: BangBaiBao,
  deTai: BangDeTai,
  sach: BangSach,
  keKhai: BangKeKhai,
};

const TIEU_DE_TRONG = {
  baiBao: "Chưa có bài báo",
  deTai: "Chưa có đề tài / dự án",
  sach: "Chưa có sách",
  keKhai: "Chưa có kê khai khác",
};

/**
 * Thành tích NCKH của CHÍNH người đăng nhập, theo từng năm đánh giá.
 *
 * Trang chỉ đọc: dữ liệu được kéo về từ hệ thống NCKH của trường, hệ KPI không
 * cho sửa. Phần "mốc ghi nhận" lấy thẳng snapshot `TongHop` của năm - đúng bộ cờ
 * mà engine dùng để chấm các tiêu chí NCKH tự động, nên người dùng đối chiếu
 * được vì sao phiếu của mình ra điểm như vậy.
 *
 * Khác các trang cá nhân còn lại, endpoint /api/nckh/* nhận id_nhan_vien qua
 * query chứ không tự suy từ token, nên phải truyền id của người đang đăng nhập.
 */
const ThanhTichNckh = () => {
  const { user } = useAuth();
  const idNhanVien = user?.IdNhanVien;
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [duLieu, setDuLieu] = useState(DU_LIEU_RONG);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");
  const [tab, setTab] = useState("baiBao");

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam || !idNhanVien) return;

    setIsLoading(true);
    setLoi("");
    try {
      const thamSo = { idNhanVien, idNam: selectedNam };
      const [chiTiet, baiBao, deTai, sach, keKhai] = await Promise.all([
        fetchChiTietNckh(thamSo),
        fetchBaiBao(thamSo),
        fetchDeTai(thamSo),
        fetchSach(thamSo),
        fetchKeKhaiKhac(thamSo),
      ]);

      setDuLieu({
        chuaLienKet: chiTiet == null || chiTiet.HoSo == null,
        hoSo: chiTiet?.HoSo || null,
        tongHop: chiTiet?.TongHop || null,
        baiBao,
        deTai,
        sach,
        keKhai,
      });
    } catch (error) {
      console.error("Lỗi tải dữ liệu NCKH:", error);
      setDuLieu(DU_LIEU_RONG);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [idNhanVien, selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const soMocDat = useMemo(() => demMocDat(duLieu.tongHop), [duLieu.tongHop]);

  const tongSoCongTrinh =
    duLieu.baiBao.tongSo +
    duLieu.deTai.tongSo +
    duLieu.sach.tongSo +
    duLieu.keKhai.tongSo;

  // Lần tải đầu mới dựng khung chờ; đổi năm thì giữ nội dung cũ và làm mờ, để
  // trang không nháy trắng sau mỗi lần chọn.
  const dangTaiLanDau =
    (isLoading || dangTaiNam) &&
    tongSoCongTrinh === 0 &&
    !duLieu.tongHop &&
    !loi;

  const Bang = BANG_THEO_TAB[tab];
  const duLieuTab = duLieu[tab];

  const demTheoTab = {
    baiBao: duLieu.baiBao.tongSo,
    deTai: duLieu.deTai.tongSo,
    sach: duLieu.sach.tongSo,
    keKhai: duLieu.keKhai.tongSo,
  };

  if (!idNhanVien) {
    return (
      <div className="page-container nckh-page">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-user-slash"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không xác định được hồ sơ nhân viên
            </h3>
            <p style={{ margin: 0 }}>
              Tài khoản đang đăng nhập chưa gắn với hồ sơ nhân viên nên không
              tra được dữ liệu NCKH. Vui lòng liên hệ quản trị hệ thống.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container nckh-page">
      <div className="page-header">
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Thành tích NCKH
        </h2>
        <span className="breadcrumb">
          Công trình nghiên cứu khoa học đồng bộ từ hệ thống NCKH và các mốc
          được ghi nhận cho tiêu chí KPI
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={taiDuLieu}
          disabled={isLoading || dangTaiNam}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {dangTaiLanDau ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải dữ liệu NCKH...
          </div>
        </div>
      ) : loi ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được dữ liệu
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        </div>
      ) : duLieu.chuaLienKet ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-link-slash"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Chưa liên kết với hệ thống NCKH
            </h3>
            <p style={{ margin: 0 }}>
              Tài khoản của bạn chưa khớp được sang hệ thống NCKH (ghép theo
              email), hoặc năm {selectedNam} chưa được đồng bộ. Khi chưa liên
              kết, các tiêu chí NCKH tự động sẽ ra 0 điểm - hãy báo quản trị KPI
              kiểm tra email trên hai hệ thống.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            opacity: isLoading ? 0.55 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <div className="stat-card-grid">
            <div className="stat-card">
              <div className="stat-icon-box stat-icon-blue">
                <i className="fa-solid fa-file-lines"></i>
              </div>
              <div>
                <div className="stat-label">Bài báo</div>
                <div className="stat-value">{duLieu.baiBao.tongSo}</div>
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  công bố trong năm {selectedNam}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-purple">
                <i className="fa-solid fa-diagram-project"></i>
              </div>
              <div>
                <div className="stat-label">Đề tài / dự án</div>
                <div className="stat-value">{duLieu.deTai.tongSo}</div>
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  có thời gian thực hiện trong năm
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-green">
                <i className="fa-solid fa-book"></i>
              </div>
              <div>
                <div className="stat-label">Sách</div>
                <div className="stat-value">{duLieu.sach.tongSo}</div>
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  xuất bản trong năm {selectedNam}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-amber">
                <i className="fa-solid fa-list-check"></i>
              </div>
              <div>
                <div className="stat-label">Kê khai khác</div>
                <div className="stat-value">{duLieu.keKhai.tongSo}</div>
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  hướng dẫn SV, chuyển giao, sở hữu trí tuệ…
                </div>
              </div>
            </div>
          </div>

          <p className="sub-title" style={{ marginBottom: "10px" }}>
            GHI NHẬN CHO TIÊU CHÍ KPI NĂM {selectedNam}
          </p>

          <div className="modern-table-card nckh-moc-box">
            <div className="nckh-ghi-chu">
              <i className="fa-solid fa-circle-info"></i>
              <div>
                Đây là các mốc thành tích hệ thống tự kết luận từ dữ liệu NCKH
                đã đồng bộ và dùng để chấm các tiêu chí NCKH tự động.
                {duLieu.tongHop?.ThoiGianDongBo && (
                  <>
                    {" "}
                    Đồng bộ lần cuối:{" "}
                    <b>{formatNgayGio(duLieu.tongHop.ThoiGianDongBo)}</b>.
                  </>
                )}
              </div>
            </div>

            <div>
              {NHOM_MOC_NCKH.map((nhom) => (
                <div className="nckh-moc-nhom" key={nhom.tenNhom}>
                  <div className="nckh-moc-ten">{nhom.tenNhom}</div>
                  <div
                    className={`nckh-moc-grid${nhom.soCot === 2 ? " nckh-moc-grid-2" : ""}`}
                  >
                    {nhom.danhSach.map((moc) => {
                      const dat = !!duLieu.tongHop?.[moc.key];
                      return (
                        <div
                          key={moc.key}
                          className={`nckh-moc${dat ? " nckh-moc-dat" : ""}`}
                        >
                          <i
                            className={
                              dat
                                ? "fa-solid fa-circle-check"
                                : "fa-solid fa-circle-minus"
                            }
                          ></i>
                          {moc.nhan}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {soMocDat === 0 && (
              <div className="nckh-canh-bao">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>
                  Năm {selectedNam} chưa có NCKH nào được ghi nhận đạt điều kiện
                  của những mốc trên.
                </div>
              </div>
            )}
          </div>

          <div className="cd-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`cd-tab${tab === t.key ? " cd-tab-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <i className={t.icon}></i>
                {t.nhan}
                <span className="cd-tab-dem">{demTheoTab[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="modern-table-card">
            {duLieuTab.items.length === 0 ? (
              <div className="cd-empty">
                <i className="fa-regular fa-folder-open"></i>
                <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                  {TIEU_DE_TRONG[tab]}
                </h3>
                <p style={{ margin: 0 }}>
                  Năm {selectedNam} chưa có dữ liệu được đồng bộ về từ hệ thống
                  NCKH.
                </p>
              </div>
            ) : (
              <>
                <div className="table-scroll">
                  <Bang items={duLieuTab.items} />
                </div>
                <div className="table-foot">
                  <span>
                    {duLieuTab.items.length} {NHAN_BAN_GHI[tab]}
                  </span>
                  {duLieuTab.tongSo > duLieuTab.items.length && (
                    <span>
                      Tổng cộng <strong>{duLieuTab.tongSo}</strong>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {duLieuTab.tongSo > duLieuTab.items.length && (
            <div className="cd-hint">
              <i className="fa-solid fa-circle-info"></i> Đang hiển thị{" "}
              {duLieuTab.items.length} / {duLieuTab.tongSo} bản ghi đầu tiên.
            </div>
          )}

          <div className="nckh-ghi-chu" style={{ marginTop: "16px" }}>
            <i className="fa-solid fa-circle-info"></i>
            <div>
              Dữ liệu chỉ đọc, được đồng bộ từ hệ thống NCKH theo từng năm. Nếu
              thiếu hoặc sai công trình, hãy cập nhật trên website NCKH rồi báo
              quản trị KPI đồng bộ lại năm {selectedNam}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThanhTichNckh;
