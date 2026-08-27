import React, { useCallback, useEffect, useState } from "react";
import MinhChungNvkRow from "../Common/MinhChungNvkRow";
import { formatNgayGio } from "../../utils/phieuApi";
import {
  layDanhSachPhanHoi,
  LOAI_PHAN_HOI,
  TEN_LOAI_PHAN_HOI,
  TRANG_THAI_PHAN_HOI,
  xuLyPhanHoi,
} from "../../utils/nhiemVuKhoaApi";

const BO_LOC = [
  { key: "", nhan: "Tất cả" },
  { key: String(TRANG_THAI_PHAN_HOI.CHO_XU_LY), nhan: "Chờ xử lý" },
  { key: String(TRANG_THAI_PHAN_HOI.DA_XU_LY), nhan: "Đã xử lý" },
];

/**
 * Một phản hồi kèm khung xử lý của Khoa.
 *
 * Điều hướng theo loại phản hồi - đây là điểm khiến màn hình này có ích thay vì
 * chỉ là danh sách đọc:
 *  - loại 1 (sai vai trò) luôn trỏ tới một nhiệm vụ ⇒ mở thẳng form sửa;
 *  - loại 2 (thiếu nhiệm vụ) không trỏ tới nhiệm vụ nào, chỉ có nhóm gợi ý ⇒
 *    mở form tạo mới đã điền sẵn nhóm đó.
 */
const PhanHoiItem = ({
  ph,
  choPhepSua,
  onMoNhiemVu,
  onTaoNhiemVu,
  onXuLy,
  onXem,
  onTai,
}) => {
  const daXuLy = Number(ph.TrangThai) === TRANG_THAI_PHAN_HOI.DA_XU_LY;
  const laSaiVaiTro = Number(ph.LoaiPhanHoi) === LOAI_PHAN_HOI.SAI_VAI_TRO;

  const [moGhiChu, setMoGhiChu] = useState(false);
  const [ghiChu, setGhiChu] = useState("");
  const [dangGui, setDangGui] = useState(false);

  const gui = async (moLai) => {
    setDangGui(true);
    await onXuLy(ph, { ghiChuXuLy: ghiChu, moLai });
    setDangGui(false);
    setMoGhiChu(false);
    setGhiChu("");
  };

  return (
    <div className={`nvk-ph-card${daXuLy ? "" : " nvk-ph-cho"}`}>
      <div className="nvk-ph-head">
        <span className={`tag-badge${laSaiVaiTro ? "" : " nvk-tag-tim"}`}>
          {TEN_LOAI_PHAN_HOI[ph.LoaiPhanHoi] || "Phản hồi"}
        </span>
        <span
          className={`cd-status-badge${daXuLy ? " nvk-badge-xong" : " nvk-badge-cho"}`}
        >
          <i
            className={`fa-solid ${daXuLy ? "fa-circle-check" : "fa-hourglass-half"}`}
          ></i>{" "}
          {daXuLy ? "Đã xử lý" : "Chờ xử lý"}
        </span>
        <span className="nvk-ph-nguoi">
          <i className="fa-solid fa-user"></i> {ph.HoTen}
          {ph.MaNhanVien ? ` (${ph.MaNhanVien})` : ""}
        </span>
        <span className="nvk-ph-ngay">{formatNgayGio(ph.NgayTao)}</span>
      </div>

      <div className="nvk-ph-noi-dung">{ph.NoiDung}</div>

      <div className="nvk-ph-dieu-huong">
        {laSaiVaiTro && ph.IdNhiemVuKhoa ? (
          <button
            type="button"
            className="cd-link-btn"
            onClick={() => onMoNhiemVu(ph.IdNhiemVuKhoa)}
          >
            <i className="fa-solid fa-pen-to-square"></i> Mở nhiệm vụ:{" "}
            {ph.TenNhiemVu}
          </button>
        ) : ph.IdNhomNv ? (
          <button
            type="button"
            className="cd-link-btn"
            onClick={() => onTaoNhiemVu(ph.IdNhomNv)}
            disabled={!choPhepSua}
          >
            <i className="fa-solid fa-plus"></i> Tạo nhiệm vụ trong nhóm:{" "}
            {ph.TenNhom}
          </button>
        ) : (
          <span className="nvk-trong">Không gắn với nhóm nào</span>
        )}
      </div>

      {(ph.MinhChung || []).length > 0 && (
        <div className="nvk-ph-mc">
          {ph.MinhChung.map((mc) => (
            <MinhChungNvkRow
              key={mc.IdMinhChungNvk}
              mc={mc}
              onXem={onXem}
              onTai={onTai}
            />
          ))}
        </div>
      )}

      {daXuLy && (
        <div className="nvk-ph-xu-ly">
          <b>Đã xử lý</b>
          {ph.TenNguoiXuLy ? ` - ${ph.TenNguoiXuLy}` : ""}
          {ph.NgayXuLy ? `, ${formatNgayGio(ph.NgayXuLy)}` : ""}
          {ph.GhiChuXuLy ? `: ${ph.GhiChuXuLy}` : "."}
        </div>
      )}

      {choPhepSua && (
        <div className="nvk-ph-thao-tac">
          {daXuLy ? (
            <button
              type="button"
              className="btn-cancel"
              onClick={() => gui(true)}
              disabled={dangGui}
            >
              <i className="fa-solid fa-rotate-left"></i> Mở lại
            </button>
          ) : moGhiChu ? (
            <>
              <input
                type="text"
                className="form-input nvk-ph-ghi-chu"
                value={ghiChu}
                maxLength={1000}
                placeholder="Đã xử lý thế nào? (tuỳ chọn)"
                onChange={(e) => setGhiChu(e.target.value)}
                disabled={dangGui}
              />
              <button
                type="button"
                className="btn-submit"
                onClick={() => gui(false)}
                disabled={dangGui}
              >
                <i
                  className={`fa-solid ${dangGui ? "fa-spinner fa-spin" : "fa-check"}`}
                ></i>{" "}
                Xác nhận
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setMoGhiChu(false)}
                disabled={dangGui}
              >
                Huỷ
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-submit"
              onClick={() => setMoGhiChu(true)}
            >
              <i className="fa-solid fa-check"></i> Đánh dấu đã xử lý
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Tab "Phản hồi" - Khoa xem và xử lý phản hồi của giảng viên.
 *
 * Phản hồi còn ở trạng thái CHỜ XỬ LÝ là một trong ba điều kiện CHẶN chốt kỳ,
 * nên mỗi lần xử lý xong phải làm mới tổng quan kỳ để badge đếm ngoài tab và
 * màn hình kiểm tra chốt khớp lại.
 */
const NvkPanelPhanHoi = ({
  idNam,
  idDonVi,
  choPhepSua,
  onMoNhiemVu,
  onTaoNhiemVu,
  onLamMoiKy,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
  onSuccess,
}) => {
  const [danhSach, setDanhSach] = useState([]);
  const [trangThai, setTrangThai] = useState("");
  const [dangTai, setDangTai] = useState(true);

  const tai = useCallback(async () => {
    if (!idNam || !idDonVi) return;
    setDangTai(true);
    try {
      setDanhSach(
        await layDanhSachPhanHoi({
          idNam,
          idDonVi,
          trangThai: trangThai || undefined,
        }),
      );
    } catch (error) {
      console.error("Lỗi tải danh sách phản hồi:", error);
      onError(error.message);
      setDanhSach([]);
    }
    setDangTai(false);
  }, [idNam, idDonVi, trangThai, onError]);

  useEffect(() => {
    tai();
  }, [tai]);

  const xuLy = async (ph, { ghiChuXuLy, moLai }) => {
    try {
      const item = await xuLyPhanHoi(ph.IdPhanHoi, { ghiChuXuLy, moLai });
      if (item) {
        setDanhSach((prev) =>
          prev.map((x) => (x.IdPhanHoi === item.IdPhanHoi ? item : x)),
        );
      }
      onSuccess(moLai ? "Đã mở lại phản hồi" : "Đã đánh dấu xử lý");
      onLamMoiKy();
      // Đang lọc theo trạng thái thì dòng vừa đổi không còn thuộc bộ lọc nữa
      if (trangThai) tai();
    } catch (error) {
      console.error("Lỗi xử lý phản hồi:", error);
      onError(error.message);
    }
  };

  return (
    <div
      style={{ opacity: dangTai ? 0.55 : 1, transition: "opacity 0.15s ease" }}
    >
      <div className="nvk-ph-loc">
        {BO_LOC.map((bl) => (
          <button
            key={bl.key}
            type="button"
            className={`cd-tab${trangThai === bl.key ? " cd-tab-active" : ""}`}
            onClick={() => setTrangThai(bl.key)}
          >
            {bl.nhan}
          </button>
        ))}
      </div>

      {danhSach.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-comments"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              {trangThai
                ? "Không có phản hồi nào ở trạng thái này"
                : "Chưa có phản hồi nào"}
            </h3>
            <p style={{ margin: 0 }}>
              Giảng viên gửi phản hồi khi thấy sai vai trò hoặc thiếu nhiệm vụ.
              Hết hạn mà không ai lên tiếng thì hiểu là đồng ý với phân công.
            </p>
          </div>
        </div>
      ) : (
        <div className="nvk-ph-list">
          {danhSach.map((ph) => (
            <PhanHoiItem
              key={ph.IdPhanHoi}
              ph={ph}
              choPhepSua={choPhepSua}
              onMoNhiemVu={onMoNhiemVu}
              onTaoNhiemVu={onTaoNhiemVu}
              onXuLy={xuLy}
              onXem={onXemMinhChung}
              onTai={onTaiMinhChung}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NvkPanelPhanHoi;
