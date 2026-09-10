import React, { useEffect, useMemo, useState } from "react";
import {
  LOAI_THANH_TICH_META,
  formatDiem,
} from "../../utils/keKhaiThanhTichApi";

/**
 * Bỏ dấu để tìm kiếm - gõ "de an" phải ra "đề án".
 *
 * NFD tách được dấu thanh/dấu mũ thành ký tự tổ hợp, nhưng "đ" là một chữ cái
 * riêng chứ không phải "d + dấu" nên NFD không đụng tới; phải thay tay sau khi
 * đã hạ chữ thường.
 */
const boDau = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

/**
 * Tra cứu danh mục thành tích vượt trội (Nhóm II) để thêm dòng kê khai.
 *
 * Cây ở đây chỉ có 2 CẤP và ĐỀU: gốc = tiêu chí (4 nút, mang trần điểm), lá =
 * mức quy đổi (mang điểm). Vì vậy bố cục hai cột rất thẳng: cột trái là 4 tiêu
 * chí, cột phải là các mức của tiêu chí đang chọn - KHÔNG cần đệ quy gom nhóm
 * như danh mục giờ quy đổi (cây 4 cấp, độ sâu không đều).
 *
 * Cột phải cố ý hiện ĐƠN VỊ PHỤ TRÁCH của từng mức. Đó là thứ giải thích được
 * vì sao dòng khen thưởng nằm chờ trong khi các dòng sáng kiến đã duyệt xong -
 * không có nó, luồng duyệt hai tầng nhìn như hệ thống bị treo.
 *
 * @param {boolean}  isOpen
 * @param {object[]} danhMuc  danh sách PHẲNG đã sắp theo thứ tự cây (cả 2 cấp)
 * @param {Function} onClose
 * @param {Function} [onChon] bỏ trống = chỉ tra cứu, mức không bấm được
 */
const DanhMucThanhTichModal = ({
  isOpen,
  danhMuc = [],
  onClose,
  onChon,
}) => {
  const [tuKhoa, setTuKhoa] = useState("");
  const [gocChon, setGocChon] = useState(null);

  // Đóng bằng phím Esc cho khớp thói quen của các modal khác trong hệ thống
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setTuKhoa("");
  }, [isOpen]);

  /**
   * Tách gốc / lá. Nút có cha KHÔNG nằm trong danh sách vẫn được coi là lá của
   * "nhóm khác": khi lọc theo trạng thái mà cha bị loại, thà hiện mức ở nhóm
   * chung còn hơn nuốt mất nó.
   */
  const { gocList, laTheoGoc } = useMemo(() => {
    const coMat = new Set(danhMuc.map((m) => m.IdMuc));
    const roots = danhMuc.filter((m) => m.IdCha == null);
    const map = new Map();

    danhMuc.forEach((m) => {
      if (!m.LaLa) return;
      const chaId = m.IdCha != null && coMat.has(m.IdCha) ? m.IdCha : null;
      if (!map.has(chaId)) map.set(chaId, []);
      map.get(chaId).push(m);
    });

    return { gocList: roots, laTheoGoc: map };
  }, [danhMuc]);

  const dangTim = tuKhoa.trim().length > 0;

  // Mặc định mở tiêu chí đầu tiên - màn hình trống bên phải trông như lỗi tải.
  const gocDangXem = useMemo(() => {
    if (gocList.length === 0) return null;
    return gocList.find((g) => g.IdMuc === gocChon) || gocList[0];
  }, [gocList, gocChon]);

  /** Kết quả bên phải: khi tìm thì gộp toàn bộ danh mục, kèm tên tiêu chí. */
  const nhomHienThi = useMemo(() => {
    if (dangTim) {
      const q = boDau(tuKhoa);
      const khop = (m) =>
        boDau(m.TenMuc).includes(q) ||
        boDau(m.MaMuc).includes(q) ||
        boDau(m.GhiChu).includes(q);

      return gocList
        .map((g) => ({
          key: `g-${g.IdMuc}`,
          title: g.TenMuc,
          items: (laTheoGoc.get(g.IdMuc) || []).filter(khop),
        }))
        .concat(
          laTheoGoc.has(null)
            ? [
                {
                  key: "g-khac",
                  title: "Mức chưa rõ tiêu chí",
                  items: laTheoGoc.get(null).filter(khop),
                },
              ]
            : [],
        )
        .filter((g) => g.items.length > 0);
    }

    if (!gocDangXem) return [];
    const items = laTheoGoc.get(gocDangXem.IdMuc) || [];
    return items.length > 0 ? [{ key: "hien-tai", title: null, items }] : [];
  }, [dangTim, tuKhoa, gocList, laTheoGoc, gocDangXem]);

  const soKetQua = useMemo(
    () => nhomHienThi.reduce((n, g) => n + g.items.length, 0),
    [nhomHienThi],
  );

  const soLa = useMemo(() => danhMuc.filter((m) => m.LaLa).length, [danhMuc]);

  if (!isOpen) return null;

  const metaGoc = gocDangXem
    ? LOAI_THANH_TICH_META[gocDangXem.LoaiThanhTich]
    : null;

  const tieuDePhai = dangTim
    ? `Kết quả tìm kiếm cho “${tuKhoa.trim()}”`
    : gocDangXem
      ? gocDangXem.TenMuc
      : "-";

  const phuDePhai = dangTim
    ? "Đang tìm trong toàn bộ danh mục - chọn tiêu chí bên trái để xem lại theo mục."
    : gocDangXem
      ? `Trần ${gocDangXem.TranDiem != null ? formatDiem(gocDangXem.TranDiem) : "—"} điểm cho cả tiêu chí này trong một năm.`
      : "Danh mục chưa có mức nào đang hoạt động.";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box kkt-dm-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kkt-dm-head">
          <div className="kkt-dm-head-text">
            <div className="kkt-dm-head-title">
              Danh mục thành tích vượt trội
            </div>
            <div className="kkt-dm-head-sub">
              Nhóm II · {gocList.length} tiêu chí, {soLa} mức kê khai được
            </div>
          </div>

          <div className="kkt-dm-head-act">
            <div className="kkt-dm-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tìm mức thành tích…"
              />
              {dangTim && (
                <button
                  type="button"
                  className="kkt-dm-search-xoa"
                  onClick={() => setTuKhoa("")}
                  title="Xoá từ khoá"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
            <button
              type="button"
              className="kkt-dm-close"
              onClick={onClose}
              title="Đóng"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="kkt-dm-body">
          {/* Cột trái = đúng 4 tiêu chí. Cây 2 cấp nên gốc CHÍNH LÀ nhóm, không
              cần thêm một tầng tiêu đề nữa. */}
          <div className="kkt-dm-nav">
            {gocList.length === 0 ? (
              <div className="kkt-dm-nav-trong">Danh mục đang trống</div>
            ) : (
              gocList.map((g) => {
                const meta = LOAI_THANH_TICH_META[g.LoaiThanhTich];
                const dangChon = !dangTim && gocDangXem?.IdMuc === g.IdMuc;
                return (
                  <button
                    key={g.IdMuc}
                    type="button"
                    className={`kkt-dm-nav-dong${dangChon ? " kkt-dm-nav-chon" : ""}`}
                    onClick={() => {
                      setGocChon(g.IdMuc);
                      setTuKhoa("");
                    }}
                  >
                    <span className="kkt-dm-nav-so">
                      <i
                        className={`fa-solid ${meta?.icon || "fa-circle"}`}
                        style={{ color: meta?.color }}
                      ></i>
                    </span>
                    <span className="kkt-dm-nav-ten">
                      {g.TenMuc}
                      {g.TranDiem != null && (
                        <span
                          style={{
                            display: "block",
                            fontSize: "11.5px",
                            color: "#94a3b8",
                            fontWeight: 500,
                          }}
                        >
                          Trần {formatDiem(g.TranDiem)} điểm
                        </span>
                      )}
                    </span>
                    <span className="kkt-dm-nav-dem">
                      {(laTheoGoc.get(g.IdMuc) || []).length}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="kkt-dm-pane">
            <div className="kkt-dm-pane-head">
              <div className="kkt-dm-pane-title">
                {metaGoc && !dangTim && (
                  <i
                    className={`fa-solid ${metaGoc.icon}`}
                    style={{ marginRight: "8px", color: metaGoc.color }}
                  ></i>
                )}
                {tieuDePhai}
              </div>
              <div className="kkt-dm-pane-sub">{phuDePhai}</div>
            </div>

            <div className="kkt-dm-pane-body">
              {nhomHienThi.length === 0 ? (
                <div className="kkt-dm-trong">
                  Không tìm thấy mức thành tích phù hợp.
                </div>
              ) : (
                nhomHienThi.map((g) => (
                  <div key={g.key} className="kkt-dm-nhom">
                    {g.title && <div className="kkt-dm-nhom-ten">{g.title}</div>}
                    {g.items.map((m, i) => (
                      <button
                        key={m.IdMuc}
                        type="button"
                        className="kkt-dm-item"
                        onClick={() => onChon?.(m)}
                        disabled={!onChon}
                        title={m.GhiChu || undefined}
                      >
                        <span className="kkt-dm-item-so">{i + 1}.</span>
                        <span className="kkt-dm-item-ten">
                          {m.TenMuc}
                          <span className="kkt-dm-item-meta">
                            <i className="fa-solid fa-user-check"></i> Duyệt bởi:{" "}
                            {m.TenDonVi || "Đơn vị quản lý trực tiếp"}
                            {m.YeuCauMinhChung && (
                              <>
                                {" · "}
                                <i
                                  className="fa-solid fa-file-pdf"
                                  style={{ color: "#dc2626" }}
                                ></i>{" "}
                                bắt buộc minh chứng
                              </>
                            )}
                            {!m.ChoPhepSoLuong && <> · mỗi lần một dòng</>}
                          </span>
                        </span>
                        <span className="kkt-dm-chip">
                          <span className="kkt-dm-chip-val">
                            {formatDiem(m.DiemQuyDoi)}
                          </span>
                          <span className="kkt-dm-chip-unit">
                            điểm{m.ChoPhepSoLuong ? " / đơn vị" : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="kkt-dm-foot">
          <div className="kkt-dm-foot-text">
            {dangTim
              ? `Tìm thấy ${soKetQua} mức`
              : onChon
                ? "Bấm vào một mức để thêm dòng kê khai"
                : `Đang xem ${soLa} mức kê khai được`}
          </div>
          <button type="button" className="btn-submit" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DanhMucThanhTichModal;
