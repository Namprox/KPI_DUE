import React, { useState } from "react";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import {
  CAP_CHAM,
  diemGocCuaDong,
  diemHieuLucCuaDong,
  laDongChamTay,
} from "../../utils/phieuDonViApi";
import MinhChungTieuChiBox from "./TieuChi/MinhChungTieuChiBox";

/**
 * Một tiêu chí trên màn hình TRƯỞNG ĐƠN VỊ DUYỆT phiếu KPI đơn vị (trạng thái 2).
 *
 * Dùng chung cho cả hai loại phiếu đơn vị - Khoa (mẫu loại 3) và Phòng/Trung tâm
 * (mẫu loại 4): DTO, ba lớp điểm và hai thao tác duyệt giống hệt nhau, chỉ NHÃN
 * của cấp duyệt là khác nên nhận qua prop `nhanCap`.
 *
 * Bản song song của TieuChiChamCard (luồng cá nhân) và dùng LẠI NGUYÊN bộ lớp
 * `cdm-*` / `cd-mc-*` của QuanLyChamDiem.css để hai màn hình nhìn như một. Sở dĩ
 * tách thành component riêng thay vì nhận thêm props: DTO hai bên không có cột
 * nào chung ngoài tên tiêu chí - cá nhân là DiemTuDanhGia/DiemKhoa + trạng thái
 * dòng, đơn vị là DiemNhap/DiemDuyetDv/DiemTruong và KHÔNG có trạng thái dòng.
 *
 * Hai khối của bản cá nhân cố ý KHÔNG có ở đây, vì dữ liệu không tồn tại chứ
 * không phải quên dựng:
 *
 *  - Badge trạng thái dòng + nút "Trả về": ChiTietDanhGiaDonViDto không có
 *    trang_thai_dong / nguon_tra_ve, và server không có endpoint trả về nào cho
 *    họ phiếu đơn vị. Đường lùi duy nhất là mở lại cả phiếu sau khi đã hoàn tất.
 *  - Khối "Lịch sử chấm điểm": bảng lich_su_cham_diem_don_vi có trong CSDL nhưng
 *    chưa mở qua API (không có GET phieu-don-vi/{id}/lich-su-cham-diem).
 *
 * DUYỆT XONG LÀ CHỐT DÒNG. Dòng đã có `DiemDuyetDv` không còn nút nào, giống hệt
 * dòng đã chốt bên giảng viên. Khác ở chỗ bên đó còn đường mở lại (Trưởng khoa
 * gọi chitiet/{id}/khoa/tra-tham-dinh), còn họ phiếu đơn vị không có endpoint
 * trả về nào - sửa được chỉ khi cấp Trường mở lại CẢ phiếu. Đây là lựa chọn có
 * chủ đích, đừng "sửa" bằng cách thêm lại nút chấm lại.
 *
 * Hai thao tác còn lại đều ghi qua CÙNG một endpoint
 * PUT api/chi-tiet-don-vi/{id}/diem-duyet-dv, chỉ khác giá trị `Diem`:
 *   - "Duyệt giữ nguyên" gửi đúng điểm gốc cấp dưới đề xuất
 *   - "Chỉnh sửa điểm"  mở SuaDiemDonViModal để chọn lại mức
 *
 * DÒNG TỰ ĐỘNG (`loai_nguon_diem = 2`, chỉ mẫu Khoa mới có) không có nút "Duyệt
 * giữ nguyên": điểm do hệ thống tổng hợp từ KPI thành viên, không phải đề xuất
 * của ai để duyệt lại, và nó đã là điểm hiệu lực sẵn rồi. Vẫn giữ "Chỉnh sửa
 * điểm" làm đòn bẩy cho trưởng đơn vị khi con số tổng hợp sai.
 */
const TieuChiChamDonViCard = ({
  chiTiet,
  stt,
  moTa,
  /** Nhãn của ba lớp điểm - NHAN_CAP_CHAM_KHOA hoặc NHAN_CAP_CHAM (Phòng). */
  nhanCap,
  choPhepNhap = false,
  lyDoKhoa = "",
  dangLuu = false,
  cauHinhMc,
  onDuyet,
  onSuaDiem,
  onXemMinhChung,
  onTaiMinhChung,
}) => {
  const [daThuGon, setDaThuGon] = useState(false);

  const minhChung = Array.isArray(chiTiet.MinhChung) ? chiTiet.MinhChung : [];
  const coMinhChung = minhChung.length > 0;
  const moRong = !daThuGon;

  const diemHieuLuc = diemHieuLucCuaDong(chiTiet);
  const tuDong = !laDongChamTay(chiTiet);
  /** Con số cấp dưới đề xuất: thư ký gõ với dòng chấm tay, hệ thống tổng hợp với dòng tự động. */
  const diemGoc = diemGocCuaDong(chiTiet);
  const daDuyet =
    chiTiet.DiemDuyetDv !== null && chiTiet.DiemDuyetDv !== undefined;

  // Duyệt xong rồi thì người duyệt cần biết mình đã GIỮ NGUYÊN hay ĐÃ SỬA - đó
  // là thứ phân biệt hai kết cục, chứ không phải riêng con số cuối cùng.
  const lechThuKy =
    daDuyet &&
    diemGoc != null &&
    Number(chiTiet.DiemDuyetDv) !== Number(diemGoc);

  // Ba lớp điểm bày theo đúng thứ tự chấm. Lớp đang thắng được tô như điểm đã
  // chốt để người duyệt thấy ngay con số nào sẽ vào tổng.
  const oDiem = [
    { cap: CAP_CHAM.NHAP, nhan: tuDong ? "Hệ thống tính" : nhanCap[CAP_CHAM.NHAP], giaTri: diemGoc },
    { cap: CAP_CHAM.DUYET_DV, nhan: nhanCap[CAP_CHAM.DUYET_DV], giaTri: chiTiet.DiemDuyetDv },
  ];

  const laHieuLuc = (giaTri) =>
    giaTri != null && giaTri !== "" && Number(giaTri) === Number(diemHieuLuc);

  return (
    <div
      id={`tieu-chi-dv-${chiTiet.IdChiTietDv}`}
      className={`cdm-the${daDuyet || tuDong ? " phong-the-da-duyet" : ""}`}
    >
      <div className="cdm-main">
        <div className="cdm-dau">
          <div className="cdm-tieu-chi">
            <p className="cdm-ten">
              {stt}. {chiTiet.TenTieuChi || `Tiêu chí #${chiTiet.IdTieuChi}`}
            </p>
            {moTa ? <div className="cdm-mo-ta-tieu-chi">{moTa}</div> : null}
          </div>
          <div className="cdm-diem-nhom">
            {oDiem.map(({ cap, nhan, giaTri }) => (
              <div className="cdm-diem-o" key={cap}>
                <div className="cdm-diem-nhan">{nhan}</div>
                <div
                  className={`cdm-diem-gt${
                    giaTri == null
                      ? " cdm-diem-trong"
                      : laHieuLuc(giaTri)
                        ? " cdm-diem-chot"
                        : ""
                  }`}
                >
                  {formatDiem(giaTri)}
                </div>
              </div>
            ))}
            {chiTiet.DiemChinhThuc != null && (
              <div className="cdm-diem-o">
                <div className="cdm-diem-nhan">Chính thức</div>
                <div className="cdm-diem-gt cdm-diem-chinh-thuc">
                  {formatDiem(chiTiet.DiemChinhThuc)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="cdm-tags">
          {/* Thay cho TrangThaiDongBadge của luồng cá nhân: phiếu đơn vị không
              có cột trang_thai_dong, "đã duyệt" chỉ suy ra từ việc dòng đã có
              điểm ở lớp Trưởng phòng. */}
          {tuDong ? (
            <span className="cdm-pill">
              <i className="fa-solid fa-robot"></i> Hệ thống tự tổng hợp
            </span>
          ) : (
            <span
              className={`cdm-pill ${
                daDuyet ? "phong-pill-da-duyet" : "phong-pill-cho-duyet"
              }`}
            >
              <i
                className={`fa-solid ${daDuyet ? "fa-circle-check" : "fa-hourglass-half"}`}
              ></i>{" "}
              {daDuyet ? "Đã duyệt" : "Chờ duyệt"}
            </span>
          )}
          <span className="cdm-pill">
            Tối đa {formatDiem(chiTiet.DiemToiDa)}
          </span>
          <span className="cdm-pill">
            <i
              className={`fa-solid ${tuDong ? "fa-gauge-high" : "fa-pen-to-square"}`}
            ></i>{" "}
            {tuDong ? "Tổng hợp từ KPI thành viên" : "Chấm thủ công"}
          </span>
          {/* Nhắc nhở thôi: sp_phieu_dv_submit không kiểm cờ này nên tiêu chí
              trống minh chứng vẫn duyệt được. */}
          {chiTiet.BatBuocMinhChung ? (
            <span
              className={`cdm-pill${coMinhChung ? "" : " cdm-pill-canh-bao"}`}
              title="Tiêu chí này nên có minh chứng kèm theo"
            >
              <i className="fa-solid fa-paperclip"></i> Cần minh chứng
            </span>
          ) : null}
        </div>

        {chiTiet.NhanXetNhap && (
          <div className="cdm-hop">
            <div className="cdm-hop-tieu-de">Thư ký đơn vị diễn giải</div>
            <p className="cd-tdg-nhan-xet">
              <i className="fa-solid fa-quote-left"></i>
              {chiTiet.NhanXetNhap}
            </p>
          </div>
        )}

        {coMinhChung && (
          <button
            type="button"
            className="cdm-toggle"
            onClick={() => setDaThuGon((truoc) => !truoc)}
          >
            <i
              className={`fa-solid ${moRong ? "fa-chevron-up" : "fa-chevron-down"}`}
            ></i>
            {moRong ? "Thu gọn" : `Xem minh chứng (${minhChung.length})`}
          </button>
        )}

        {coMinhChung && moRong && (
          <div className="cdm-khoi-phu">
            <div className="cdm-hop">
              <div className="cdm-hop-tieu-de">
                Minh chứng ({minhChung.length})
              </div>
              {/* choPhepSua = false: quyền thêm/gỡ chỉ thuộc về thư ký ở trạng
                  thái 1, mà thẻ này chỉ dựng cho trạng thái 2. */}
              <MinhChungTieuChiBox
                idChiTiet={chiTiet.IdChiTietDv}
                danhSach={minhChung}
                choPhepSua={false}
                batBuoc={!!chiTiet.BatBuocMinhChung}
                cauHinh={cauHinhMc}
                onXem={onXemMinhChung}
                onTai={onTaiMinhChung}
              />
            </div>
          </div>
        )}
      </div>

      <div className="cdm-ben">
        <div className="cdm-ben-tieu-de">
          {daDuyet
            ? "Đã duyệt"
            : tuDong
              ? "Điểm tự động"
              : choPhepNhap
                ? "Duyệt tiêu chí"
                : `Điểm ${nhanCap[CAP_CHAM.DUYET_DV]} (chỉ đọc)`}
        </div>

        <div className="cdm-ben-diem">
          <span className="cdm-ben-diem-nhan">
            {tuDong && !daDuyet
              ? "Điểm tổng hợp"
              : `Điểm ${nhanCap[CAP_CHAM.DUYET_DV]}`}
          </span>
          <span className="cdm-ben-diem-gt">
            {chiTiet.DiemDuyetDv != null ? (
              <b className="cdm-ben-diem-so">
                {formatDiem(chiTiet.DiemDuyetDv)}
              </b>
            ) : tuDong ? (
              <b className="cdm-ben-diem-so">{formatDiem(diemGoc)}</b>
            ) : (
              <span className="cdm-pill">Chưa chấm</span>
            )}
            <span>/ {formatDiem(chiTiet.DiemToiDa)}</span>
          </span>
        </div>

        {chiTiet.NhanXetDuyetDv && (
          <div className="cdm-nhan-xet">
            <i className="fa-solid fa-quote-left"></i> {chiTiet.NhanXetDuyetDv}
          </div>
        )}

        {/* Kết luận thay cho cặp nút: dòng đã xong không được bày y hệt dòng
            còn phải làm. Bên giảng viên, dòng đã chốt cũng rụng hết nút và chỉ
            còn một dòng ghi chú - ở đây giữ đúng tinh thần đó. */}
        {daDuyet && (
          <div className="phong-ket-luan">
            <i className="fa-solid fa-circle-check"></i>
            <span>
              {lechThuKy ? (
                <>
                  Đã điều chỉnh mức {tuDong ? "hệ thống tổng hợp" : "thư ký đề xuất"} từ{" "}
                  <b>{formatDiem(diemGoc)}</b> thành{" "}
                  <b>{formatDiem(chiTiet.DiemDuyetDv)}</b>.
                </>
              ) : (
                <>
                  Đã duyệt, giữ nguyên mức{" "}
                  {tuDong ? "hệ thống tổng hợp" : "thư ký đề xuất"}.
                </>
              )}
            </span>
          </div>
        )}

        {/* Duyệt xong là CHỐT: dòng đã có DiemDuyetDv không còn nút nào, chỉ
            còn câu kết luận ở trên. */}
        {tuDong && !daDuyet && (
          <div className="cdm-ghi-chu">
            <i className="fa-solid fa-robot"></i> Hệ thống tính từ KPI của thành
            viên đơn vị - đã tính vào tổng, không cần duyệt.
          </div>
        )}

        {choPhepNhap && !daDuyet && (
          <>
            {/* Giữ nguyên mức thư ký là lối đi thường gặp nhất - để trước để
                người duyệt khỏi phải mở hộp thoại chọn lại đúng mức đó. Dòng tự
                động không có bước này, xem khối chú thích ở đầu file. */}
            {!tuDong && (
              <button
                type="button"
                className="cdm-btn cdm-btn-chinh"
                disabled={dangLuu || diemGoc == null}
                onClick={() => onDuyet(chiTiet)}
                title={
                  diemGoc == null
                    ? "Thư ký chưa nhập điểm cho tiêu chí này"
                    : "Ghi nhận đúng mức điểm thư ký đơn vị đã đề xuất"
                }
              >
                <i className="fa-solid fa-check"></i> Duyệt giữ nguyên{" "}
                {formatDiem(diemGoc)}
              </button>
            )}
            <button
              type="button"
              className="cdm-btn cdm-btn-phu"
              disabled={dangLuu}
              onClick={() => onSuaDiem(chiTiet)}
              title="Mở bảng thang điểm để chọn lại mức cho tiêu chí này"
            >
              <i className="fa-solid fa-pen"></i> Chỉnh sửa điểm
            </button>
          </>
        )}

        {!choPhepNhap && lyDoKhoa && (
          <div className="cdm-ghi-chu cdm-ghi-chu-khoa">
            <i className="fa-solid fa-lock"></i> {lyDoKhoa}
          </div>
        )}

        {dangLuu && (
          <div className="cdm-ghi-chu">
            <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
          </div>
        )}

        {chiTiet.NgayDuyetDv && (
          <div className="cdm-ghi-chu">
            Duyệt lúc {formatNgayGio(chiTiet.NgayDuyetDv)}
          </div>
        )}
      </div>
    </div>
  );
};

export default TieuChiChamDonViCard;
