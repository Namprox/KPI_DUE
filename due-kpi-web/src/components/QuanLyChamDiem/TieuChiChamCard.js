import React, { useEffect, useState } from "react";
import {
  fetchMinhChung,
  fetchNhiemVuCongDong,
  formatDiem,
  formatNgayGio,
  laTieuChiChamTay,
  TRANG_THAI_DONG,
} from "../../utils/phieuApi";
import LichSuChamDong from "./LichSuChamDong";
import { NguonTraVeBadge, TrangThaiDongBadge } from "./TrangThaiBadge";
import {
  duoiFile,
  formatKb,
  iconFile,
  laMinhChungFile,
  LOAI_MINH_CHUNG,
} from "../../utils/minhChungPhieuApi";

/**
 * Một minh chứng. Tệp tải lên (LoaiMinhChung = 1) phải đi qua
 * GET api/minhchung/{id}/tai-ve - endpoint nằm sau [TokenAuthorize] nên không gắn
 * được vào <a href>, việc tải blob do useMinhChungPhieuPreview ở trang cha lo.
 * Liên kết / DOI (loại 2, 3) không có tệp trên đĩa nên mở thẳng DuongDan.
 */
const MinhChungRow = ({ mc, onXem, onTai }) => {
  const nhan = mc.TenHienThi || mc.TenFileGoc || mc.DuongDan;

  if (!laMinhChungFile(mc)) {
    return (
      <div className="cd-mc-row">
        <i
          className="fa-solid fa-link cd-mc-icon"
          style={{ color: "#0ea5e9" }}
        ></i>
        <div className="cd-mc-main">
          <a
            className="cd-mc-name"
            href={mc.DuongDan}
            target="_blank"
            rel="noreferrer"
            title={mc.DuongDan}
          >
            {nhan}
          </a>
          <div className="cd-mc-meta">
            {Number(mc.LoaiMinhChung) === LOAI_MINH_CHUNG.DOI
              ? "DOI / liên kết học thuật"
              : "Liên kết ngoài"}
          </div>
        </div>
        <a
          className="cd-mc-act"
          href={mc.DuongDan}
          target="_blank"
          rel="noreferrer"
          title="Mở liên kết trong tab mới"
        >
          <i className="fa-solid fa-arrow-up-right-from-square"></i> Mở
        </a>
      </div>
    );
  }

  const icon = iconFile(mc);
  const meta = [
    duoiFile(mc) ? duoiFile(mc).toUpperCase() : null,
    mc.KichThuocKb != null ? formatKb(mc.KichThuocKb) : null,
    mc.NgayTaiLen ? formatNgayGio(mc.NgayTaiLen) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="cd-mc-row">
      <i
        className={`${icon.className} cd-mc-icon`}
        style={{ color: icon.color }}
      ></i>
      <div className="cd-mc-main">
        <button
          type="button"
          className="cd-mc-name"
          onClick={() => onXem(mc)}
          title={`Xem trước: ${nhan}`}
        >
          {nhan}
        </button>
        <div className="cd-mc-meta">{meta || "-"}</div>
      </div>
      <button
        type="button"
        className="cd-mc-act"
        onClick={() => onXem(mc)}
        title="Xem trước tệp"
      >
        <i className="fa-solid fa-eye"></i> Xem
      </button>
      <button
        type="button"
        className="cd-mc-act"
        onClick={() => onTai(mc)}
        title="Tải tệp về máy"
      >
        <i className="fa-solid fa-download"></i> Tải về
      </button>
    </div>
  );
};

/**
 * Một tiêu chí trên màn hình thẩm định.
 *
 * Mỗi DÒNG có ba kết cục và card này dựng đủ cả ba, thay cho một nút "Lưu điểm"
 * như luồng cũ:
 *   - duyệt giữ nguyên điểm giảng viên  → onDuyet    (không cần lý do)
 *   - sửa điểm                           → onSuaDiem (mở hộp thoại chọn mức)
 *   - trả dòng về cho giảng viên bổ sung → onTraVe    (bắt buộc lý do)
 * Card KHÔNG còn ô nhập điểm: chấm là CHỌN LẠI MỨC trên đúng thang điểm của tiêu
 * chí, việc đó cần cả danh sách mức lẫn mô tả nên làm trong hộp thoại riêng
 * (SuaDiemModal). Ở đây chỉ còn các nút.
 * Ở chế độ Trưởng khoa (`vaiTro="truongKhoa"`) chỉ còn một thao tác: trả dòng
 * ĐÃ CHỐT về cho đơn vị thẩm định làm lại → onTraThamDinh.
 *
 * Điểm quan trọng về dữ liệu: GET api/phieu/{id} đã nhúng sẵn MinhChung[] và
 * NhiemVuCongDong[] trong từng chi tiết, nên chỉ gọi API khi bản ghi thiếu mảng
 * đó (tránh n request thừa). Lịch sử chấm điểm không nằm trong detail và trang
 * cha lấy một lần cho cả phiếu qua GET api/phieu/{id}/lich-su-cham-diem rồi
 * truyền xuống đây - card không tự gọi API lịch sử nữa.
 */
const TieuChiChamCard = ({
  chiTiet,
  stt,
  lichSu = [],
  dangTaiLichSu = false,
  vaiTro = "thamDinh",
  // Dòng bị server chỉ đích danh trong missingItems của 422 CHUA_CHOT_HET - tô đỏ
  // để người chốt thấy ngay phải đợi tiêu chí nào, thay vì chỉ đọc một dòng báo lỗi.
  noiBat = false,
  choPhepNhap,
  choPhepTraThamDinh = false,
  lyDoKhoa,
  dangLuu,
  onSuaDiem,
  onDuyet,
  onTraVe,
  onTraThamDinh,
  onXemMinhChung,
  onTaiMinhChung,
}) => {
  const chamTay = laTieuChiChamTay(chiTiet);
  const trangThaiDong = Number(chiTiet.TrangThaiDong);
  const daChot = trangThaiDong === TRANG_THAI_DONG.DA_CHOT;
  const laTruongKhoa = vaiTro === "truongKhoa";

  const [daThuGon, setDaThuGon] = useState(false);

  const [minhChung, setMinhChung] = useState(
    Array.isArray(chiTiet.MinhChung) ? chiTiet.MinhChung : null,
  );
  const [nhiemVu, setNhiemVu] = useState(
    Array.isArray(chiTiet.NhiemVuCongDong) ? chiTiet.NhiemVuCongDong : null,
  );
  const [dangTaiPhu, setDangTaiPhu] = useState(false);

  // Sau mỗi lần lưu, phiếu được tải lại → nạp lại phần dữ liệu kèm theo còn thiếu
  // của bản ghi mới.
  useEffect(() => {
    const mcNhung = Array.isArray(chiTiet.MinhChung) ? chiTiet.MinhChung : null;
    const nvNhung = Array.isArray(chiTiet.NhiemVuCongDong)
      ? chiTiet.NhiemVuCongDong
      : null;
    setMinhChung(mcNhung);
    setNhiemVu(nvNhung);

    const canTaiMinhChung = mcNhung === null;
    const canTaiNhiemVu = nvNhung === null;
    if (!canTaiMinhChung && !canTaiNhiemVu) return undefined;

    let huy = false;
    setDangTaiPhu(true);
    Promise.allSettled([
      canTaiMinhChung
        ? fetchMinhChung(chiTiet.IdChiTiet)
        : Promise.resolve(mcNhung),
      canTaiNhiemVu
        ? fetchNhiemVuCongDong(chiTiet.IdChiTiet)
        : Promise.resolve(nvNhung),
    ]).then((ketQua) => {
      if (huy) return;
      // Một endpoint lỗi (403/404) không được làm hỏng cả panel - coi như rỗng.
      setMinhChung(ketQua[0].status === "fulfilled" ? ketQua[0].value : []);
      setNhiemVu(ketQua[1].status === "fulfilled" ? ketQua[1].value : []);
      setDangTaiPhu(false);
    });

    return () => {
      huy = true;
    };
  }, [chiTiet]);

  // Tiêu chí tự động không đi qua ai chấm nên DiemKhoa/DiemTuDanhGia thường trống;
  // điểm thật nằm ở DiemChinhThuc do hệ thống ghi.
  const diemTuDong =
    chiTiet.DiemChinhThuc ?? chiTiet.DiemKhoa ?? chiTiet.DiemTuDanhGia;

  // Khối kèm theo chỉ dựng cho phần thực sự có dữ liệu và mặc định mở sẵn -
  // tiêu chí trống thì không cần một hàng "không có gì" để người chấm bấm vào.
  const coMinhChung = (minhChung?.length ?? 0) > 0;
  const coNhiemVu = (nhiemVu?.length ?? 0) > 0;
  const coLichSu = (lichSu?.length ?? 0) > 0;
  const soLuotCham = (lichSu || []).reduce(
    (tong, nhom) => tong + (nhom.Entries?.length || 0),
    0,
  );
  const coDuLieuPhu = coMinhChung || coNhiemVu || coLichSu;
  const moRong = !daThuGon;

  const nhanKhoiPhu = [
    coMinhChung ? `minh chứng (${minhChung.length})` : null,
    coNhiemVu ? `nhiệm vụ cộng đồng (${nhiemVu.length})` : null,
    coLichSu ? `lịch sử chấm (${soLuotCham})` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Ba khối phụ giống hệt nhau ở cả hai kiểu thẻ, chỉ khác lớp CSS của hộp -
  // dựng một lần rồi truyền lớp vào để khỏi chép đôi.
  const khoiTuDanhGia = (lopHop, lopTieuDe) =>
    (chiTiet.MoTaHoanThanh || chiTiet.NhanXetTuDanhGia) && (
      <div className={lopHop}>
        <div className={lopTieuDe}>Giảng viên tự đánh giá</div>
        {chiTiet.MoTaHoanThanh && (
          <p className="cd-tdg-mota">{chiTiet.MoTaHoanThanh}</p>
        )}
        {chiTiet.NhanXetTuDanhGia && (
          <p className="cd-tdg-nhan-xet">
            <i className="fa-solid fa-quote-left"></i>
            {chiTiet.NhanXetTuDanhGia}
          </p>
        )}
      </div>
    );

  const khoiDuLieuPhu = (lopHop, lopTieuDe) => (
    <>
      {coMinhChung && (
        <div className={lopHop}>
          <div className={lopTieuDe}>Minh chứng ({minhChung.length})</div>
          <div>
            {minhChung.map((mc) => (
              <MinhChungRow
                key={mc.IdMinhChung}
                mc={mc}
                onXem={onXemMinhChung}
                onTai={onTaiMinhChung}
              />
            ))}
          </div>
        </div>
      )}

      {coNhiemVu && (
        <div className={lopHop}>
          <div className={lopTieuDe}>Nhiệm vụ cộng đồng ({nhiemVu.length})</div>
          <table className="custom-table" style={{ fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={{ padding: "8px 10px" }}>Nhiệm vụ</th>
                <th style={{ padding: "8px 10px" }}>Nhóm</th>
                <th style={{ padding: "8px 10px" }}>Vai trò</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>
                  Điểm
                </th>
              </tr>
            </thead>
            <tbody>
              {nhiemVu.map((nv) => (
                <tr key={nv.IdNhiemVu}>
                  <td style={{ padding: "8px 10px" }}>{nv.TenNhiemVu}</td>
                  <td style={{ padding: "8px 10px" }}>{nv.TenNhom || "-"}</td>
                  <td style={{ padding: "8px 10px" }}>{nv.TenVaiTro || "-"}</td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {formatDiem(nv.DiemSnapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {coLichSu && (
        <div className={lopHop}>
          <div className={lopTieuDe}>Lịch sử chấm điểm ({soLuotCham})</div>
          <LichSuChamDong lichSu={lichSu} chiTiet={chiTiet} />
        </div>
      )}
    </>
  );

  const nutMoRong = (lopNut) =>
    coDuLieuPhu && (
      <button
        type="button"
        className={lopNut}
        onClick={() => setDaThuGon((truoc) => !truoc)}
      >
        <i
          className={`fa-solid ${moRong ? "fa-chevron-up" : "fa-chevron-down"}`}
        ></i>
        {moRong ? "Thu gọn" : `Xem ${nhanKhoiPhu}`}
      </button>
    );

  const dangTai = (dangTaiPhu || dangTaiLichSu) && (
    <div className="cd-dang-tai-phu">
      <i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu kèm
      theo...
    </div>
  );

  // Yêu cầu đang mở của dòng. Cặp NguonTraVe + LyDoTraVe được server xóa khi
  // dòng được nộp lại hoặc chấm lại, nên còn giá trị nghĩa là việc chưa xong.
  const khoiYeuCau = chiTiet.NguonTraVe != null && (
    <div className="cd-yeu-cau-bo-sung">
      <div className="cd-yc-head">
        <NguonTraVeBadge nguonTraVe={chiTiet.NguonTraVe} />
        {chiTiet.NgayTraVe && (
          <span className="cd-yc-meta">{formatNgayGio(chiTiet.NgayTraVe)}</span>
        )}
      </div>
      <p className="cd-yc-lydo">{chiTiet.LyDoTraVe || "Không ghi lý do."}</p>
      {chiTiet.TenDonViThamDinh && (
        <div className="cd-yc-meta">
          Đơn vị thẩm định: {chiTiet.TenDonViThamDinh}
        </div>
      )}
    </div>
  );

  return (
    <div
      id={`tieu-chi-${chiTiet.IdChiTiet}`}
      className={`cdm-the${noiBat ? " cdm-the-thieu" : ""}`}
    >
      <div className="cdm-main">
        <div className="cdm-dau">
          <p className="cdm-ten">
            {stt}. {chiTiet.TenTieuChi || `Tiêu chí #${chiTiet.IdTieuChi}`}
          </p>
          <div className="cdm-diem-nhom">
            {chamTay ? (
              <>
                <div className="cdm-diem-o">
                  <div className="cdm-diem-nhan">GV tự chấm</div>
                  <div
                    className={`cdm-diem-gt${chiTiet.DiemTuDanhGia == null ? " cdm-diem-trong" : ""}`}
                  >
                    {formatDiem(chiTiet.DiemTuDanhGia)}
                  </div>
                </div>
                <div className="cdm-diem-o">
                  <div className="cdm-diem-nhan">Đơn vị chấm</div>
                  <div
                    className={`cdm-diem-gt${
                      chiTiet.DiemKhoa == null
                        ? " cdm-diem-trong"
                        : daChot
                          ? " cdm-diem-chot"
                          : ""
                    }`}
                  >
                    {formatDiem(chiTiet.DiemKhoa)}
                  </div>
                </div>
                {chiTiet.DiemChinhThuc != null && (
                  <div className="cdm-diem-o">
                    <div className="cdm-diem-nhan">Chính thức</div>
                    <div className="cdm-diem-gt cdm-diem-chinh-thuc">
                      {formatDiem(chiTiet.DiemChinhThuc)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="cdm-diem-o">
                <div className="cdm-diem-nhan">Hệ thống tính</div>
                <div className="cdm-diem-gt cdm-diem-he-thong">
                  {formatDiem(diemTuDong)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="cdm-tags">
          {chamTay && <TrangThaiDongBadge trangThaiDong={trangThaiDong} />}
          <span className="cdm-pill">
            Tối đa {formatDiem(chiTiet.DiemToiDa)}
          </span>
          <span className="cdm-pill">
            {chamTay ? (
              <>
                <i className="fa-solid fa-pen-to-square"></i> Chấm thủ công
              </>
            ) : (
              <>
                <i className="fa-solid fa-robot"></i> Điểm tự động
              </>
            )}
          </span>
          {chiTiet.SoLanTraVe > 0 && (
            <span
              className="cdm-pill cdm-pill-canh-bao"
              title="Số lần tiêu chí này bị trả về, tính dồn qua mọi vòng"
            >
              <i className="fa-solid fa-rotate-left"></i> Đã trả về{" "}
              {chiTiet.SoLanTraVe} lần
            </span>
          )}
          {chiTiet.LaTruongHopDacBiet && (
            <span
              className="cdm-pill cdm-pill-dac-biet"
              title={chiTiet.LyDoDacBiet || ""}
            >
              <i className="fa-solid fa-star"></i> Trường hợp đặc biệt
            </span>
          )}
        </div>

        {khoiYeuCau}

        {khoiTuDanhGia("cdm-hop", "cdm-hop-tieu-de")}

        {dangTai}

        {nutMoRong("cdm-toggle")}

        {coDuLieuPhu && moRong && (
          <div className="cdm-khoi-phu">
            {khoiDuLieuPhu("cdm-hop", "cdm-hop-tieu-de")}
          </div>
        )}
      </div>

      {chamTay ? (
        <div className="cdm-ben">
          <div className="cdm-ben-tieu-de">
            {choPhepNhap ? "Thẩm định tiêu chí" : "Điểm đơn vị (chỉ đọc)"}
          </div>

          <div className="cdm-ben-diem">
            <span className="cdm-ben-diem-nhan">Điểm đơn vị</span>
            <span className="cdm-ben-diem-gt">
              {chiTiet.DiemKhoa != null ? (
                <b className="cdm-ben-diem-so">
                  {formatDiem(chiTiet.DiemKhoa)}
                </b>
              ) : (
                <span className="cdm-pill">Chưa chấm</span>
              )}
              <span>/ {formatDiem(chiTiet.DiemToiDa)}</span>
            </span>
          </div>

          {chiTiet.NhanXetKhoa && (
            <div className="cdm-nhan-xet">
              <i className="fa-solid fa-quote-left"></i> {chiTiet.NhanXetKhoa}
            </div>
          )}

          {choPhepNhap && (
            <>
              {/* Duyệt giữ nguyên là lối đi thường gặp nhất và không đòi lý do -
                  để trước để người thẩm định khỏi phải mở hộp thoại chọn lại
                  đúng mức giảng viên đã chọn. */}
              <button
                type="button"
                className="cdm-btn cdm-btn-chinh"
                disabled={dangLuu}
                onClick={() => onDuyet(chiTiet, { nhanXet: null })}
                title="Chốt tiêu chí ở đúng mức điểm giảng viên tự kê khai"
              >
                <i className="fa-solid fa-check"></i> Duyệt giữ nguyên{" "}
                {formatDiem(chiTiet.DiemTuDanhGia)}
              </button>
              <button
                type="button"
                className="cdm-btn cdm-btn-phu"
                disabled={dangLuu}
                onClick={() => onSuaDiem(chiTiet)}
                title="Mở bảng thang điểm để chọn lại mức cho tiêu chí này"
              >
                <i className="fa-solid fa-pen"></i> Chỉnh sửa điểm
              </button>
              <button
                type="button"
                className="cdm-btn cdm-btn-canh-bao"
                disabled={dangLuu}
                onClick={() => onTraVe(chiTiet)}
                title="Trả tiêu chí về cho giảng viên bổ sung; các tiêu chí khác giữ nguyên tiến độ"
              >
                <i className="fa-solid fa-rotate-left"></i> Trả về giảng viên
              </button>
            </>
          )}

          {!choPhepNhap && (
            <div className="cdm-ghi-chu cdm-ghi-chu-khoa">
              <i className="fa-solid fa-lock"></i> {lyDoKhoa}
            </div>
          )}

          {laTruongKhoa && choPhepTraThamDinh && (
            <button
              type="button"
              className="cdm-btn cdm-btn-canh-bao"
              disabled={dangLuu}
              onClick={() => onTraThamDinh(chiTiet)}
              title="Trả tiêu chí về cho đơn vị đã thẩm định chấm lại"
            >
              <i className="fa-solid fa-rotate-left"></i> Trả về đơn vị thẩm
              định
            </button>
          )}

          {dangLuu && (
            <div className="cdm-ghi-chu">
              <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
            </div>
          )}

          {chiTiet.NgayDgKhoa && (
            <div className="cdm-ghi-chu">
              Thẩm định lúc {formatNgayGio(chiTiet.NgayDgKhoa)}
            </div>
          )}
        </div>
      ) : (
        <div className="cdm-ben cdm-ben-tu-dong">
          <div className="cdm-ben-tieu-de">Điểm hệ thống tính</div>

          <div className="cdm-tu-dong-diem">
            <span
              className={`cdm-tu-dong-so${diemTuDong == null ? " cdm-tu-dong-trong" : ""}`}
            >
              {diemTuDong != null ? formatDiem(diemTuDong) : "Chưa tính"}
            </span>
            <span className="cdm-tu-dong-max">
              / {formatDiem(chiTiet.DiemToiDa)}
            </span>
          </div>

          <div className="cdm-tu-dong-chu-thich">
            <i className="fa-solid fa-robot"></i> Hệ thống tự tính từ dữ liệu đã
            ghi nhận.
          </div>
        </div>
      )}
    </div>
  );
};

export default TieuChiChamCard;
