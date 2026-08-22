import React, { useEffect, useMemo, useState } from "react";
import { formatGio } from "../../utils/keKhaiGioQuyDoiApi";

const CHU_SO_LA_MA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const CHU_CAI = "abcdefghijklmnopqrstuvwxyz";

/**
 * Bỏ dấu để tìm kiếm — gõ "de an" phải ra "đề án".
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

/** Số thứ tự gốc trong quyết định; thiếu thì mới tự đánh theo vị trí. */
const soThuTu = (cv, i, mac) => {
  const goc = String(cv.SoThuTu ?? "").trim();
  if (goc) return goc.endsWith(".") ? goc : `${goc}.`;
  return `${mac ?? i + 1}.`;
};

/**
 * Tách hệ số thành hai mảnh để hiện dạng "10 · giờ / học viên".
 *
 * Đọc đúng công thức của module: giờ = SoLuong × HeSoQuyDoi / SoLuongMau, nên
 * mẫu số > 1 phải nằm cạnh đơn vị tính ("1 giờ / 10 bài") chứ không được rút gọn
 * — rút gọn là đổi ý nghĩa của con số trong quyết định.
 */
const tachHeSo = (cv) => {
  const mau = Number(cv.SoLuongMau) || 1;
  const donVi = cv.DonViTinh || "đơn vị";
  return {
    val: cv.HeSoQuyDoi != null ? formatGio(cv.HeSoQuyDoi, 3) : "—",
    unit: mau > 1 ? `${mau} ${donVi}` : donVi,
  };
};

/**
 * Tra cứu danh mục đầu việc quy đổi theo PHỤ LỤC II.
 *
 * Ô chọn trong bảng kê khai chỉ hiện các LÁ trên một dòng phẳng, đủ để gõ nhanh
 * nhưng mất ngữ cảnh "đầu việc này nằm ở mục nào của quyết định". Modal này bù
 * lại bằng bố cục hai cột: cột trái là các nhánh của quyết định, cột phải là đầu
 * việc của nhánh đang chọn kèm hệ số quy đổi.
 *
 * Cây tối đa 4 cấp và **độ sâu KHÔNG đều** — lá nằm ở cấp 2, 3 hoặc 4 — nên cột
 * phải không thể giả định "luôn có một tầng nhóm con". Quy tắc dựng:
 *
 *  - cột trái = các con của mục cấp 1 (mỗi mục cấp 1 là một tiêu đề nhóm);
 *  - cột phải = duyệt con của nhánh đang chọn theo ĐÚNG thứ tự văn bản: nút gộp
 *    thành một nhóm có tiêu đề, còn lá đi thẳng vào nhóm không tiêu đề liền kề.
 *
 * Nhờ vậy một nhánh chỉ có lá, một nhánh có tầng con, hay cả hai xen kẽ đều hiện
 * đúng mà không phải đặc biệt hoá từng trường hợp.
 *
 * Đang tìm kiếm thì cột phải gộp kết quả của TOÀN BỘ danh mục (tiêu đề nhóm ghi
 * kèm đường dẫn để biết đang ở mục nào) và cột trái bỏ tô nhánh đang chọn — vì
 * lúc đó nội dung bên phải không còn thuộc về một nhánh nào nữa.
 *
 * @param {boolean}  isOpen
 * @param {object[]} danhMuc  danh sách PHẲNG đã sắp theo thứ tự cây (mọi cấp)
 * @param {Function} onClose
 * @param {Function} [onChon] bỏ trống = chỉ tra cứu, đầu việc không bấm được
 */
const DanhMucCongViecModal = ({ isOpen, danhMuc = [], onClose, onChon }) => {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nhanhChon, setNhanhChon] = useState(null);

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
   * Chỉ mục cha → con, giữ nguyên thứ tự của danh sách phẳng (server đã sắp theo
   * cây). Nút có cha KHÔNG nằm trong danh sách được coi là gốc: khi lọc theo
   * trạng thái mà cha bị loại, thà hiện đầu việc ở cấp cao hơn còn hơn nuốt mất.
   */
  const { goc, conCua } = useMemo(() => {
    const coMat = new Set(danhMuc.map((cv) => cv.IdCongViec));
    const map = new Map();
    const roots = [];

    danhMuc.forEach((cv) => {
      if (cv.IdCha == null || !coMat.has(cv.IdCha)) {
        roots.push(cv);
        return;
      }
      if (!map.has(cv.IdCha)) map.set(cv.IdCha, []);
      map.get(cv.IdCha).push(cv);
    });

    return { goc: roots, conCua: map };
  }, [danhMuc]);

  /** Toàn bộ lá của một nhánh, kể cả lá nằm sâu ở cấp 4. */
  const laCua = useMemo(() => {
    const cache = new Map();
    const duyet = (node) => {
      if (cache.has(node.IdCongViec)) return cache.get(node.IdCongViec);
      const ketQua = node.LaLa
        ? [node]
        : (conCua.get(node.IdCongViec) || []).flatMap(duyet);
      cache.set(node.IdCongViec, ketQua);
      return ketQua;
    };
    return duyet;
  }, [conCua]);

  /** Cột trái: mỗi mục cấp 1 là một tiêu đề, các con của nó là dòng bấm được. */
  const nhanhTheoMuc = useMemo(
    () =>
      goc.map((muc, i) => ({
        id: muc.IdCongViec,
        num: soThuTu(muc, i, CHU_SO_LA_MA[i]),
        title: muc.TenCongViec,
        nhanh: (conCua.get(muc.IdCongViec) || []).map((n, j) => ({
          node: n,
          id: n.IdCongViec,
          num: soThuTu(n, j),
          title: n.TenCongViec,
          muc,
        })),
      })),
    [goc, conCua],
  );

  const moiNhanh = useMemo(
    () => nhanhTheoMuc.flatMap((m) => m.nhanh),
    [nhanhTheoMuc],
  );

  const dangTim = tuKhoa.trim().length > 0;

  const khop = useMemo(() => {
    if (!dangTim) return null;
    const q = boDau(tuKhoa.trim());
    return (cv) =>
      [
        cv.TenCongViec,
        cv.MaCongViec,
        cv.DonViTinh,
        cv.GhiChuQuyDoi,
        cv.DuongDanTen,
      ].some((f) => boDau(f).includes(q));
  }, [dangTim, tuKhoa]);

  /** Số đầu việc của từng nhánh — đang tìm thì đếm theo kết quả lọc. */
  const demCua = useMemo(() => {
    const map = new Map();
    moiNhanh.forEach((n) => {
      const la = laCua(n.node);
      map.set(n.id, khop ? la.filter(khop).length : la.length);
    });
    return map;
  }, [moiNhanh, laCua, khop]);

  const nhanhHienThi = useMemo(
    () =>
      nhanhTheoMuc
        .map((m) => ({
          ...m,
          nhanh: m.nhanh.filter((n) => (demCua.get(n.id) || 0) > 0),
        }))
        .filter((m) => m.nhanh.length > 0),
    [nhanhTheoMuc, demCua],
  );

  /**
   * Nhánh đang xem. Bám theo lựa chọn của người dùng, nhưng tự rơi về nhánh đầu
   * tiên khi chưa chọn gì hoặc khi nhánh đã chọn không còn trong danh mục.
   */
  const nhanhDangXem = useMemo(() => {
    const theoId = moiNhanh.find((n) => n.id === nhanhChon);
    return theoId || moiNhanh[0] || null;
  }, [moiNhanh, nhanhChon]);

  /**
   * Cột phải. Duyệt con theo đúng thứ tự văn bản; lá liên tiếp gom vào một nhóm
   * không tiêu đề, nút gộp mở nhóm mới có tiêu đề.
   */
  const nhomHienThi = useMemo(() => {
    const dungNhom = (node, tienTo) => {
      if (node.LaLa) {
        return [{ key: `la-${node.IdCongViec}`, title: null, items: [node] }];
      }

      const nhom = [];
      (conCua.get(node.IdCongViec) || []).forEach((con, i) => {
        if (con.LaLa) {
          const cuoi = nhom[nhom.length - 1];
          if (cuoi && cuoi.title === null) cuoi.items.push(con);
          else
            nhom.push({
              key: `truc-tiep-${con.IdCongViec}`,
              title: null,
              items: [con],
            });
          return;
        }
        nhom.push({
          key: `nhom-${con.IdCongViec}`,
          title: `${tienTo ? `${tienTo} · ` : ""}${soThuTu(con, i)} ${con.TenCongViec}`,
          items: laCua(con),
        });
      });
      return nhom;
    };

    if (!khop) {
      return nhanhDangXem ? dungNhom(nhanhDangXem.node, "") : [];
    }

    return moiNhanh
      .flatMap((n) =>
        dungNhom(n.node, `${n.muc.TenCongViec} · ${n.title}`).map((g) => ({
          ...g,
          key: `tim-${n.id}-${g.key}`,
          title: g.title || `${n.muc.TenCongViec} · ${n.title}`,
          items: g.items.filter(khop),
        })),
      )
      .filter((g) => g.items.length > 0);
  }, [khop, nhanhDangXem, moiNhanh, conCua, laCua]);

  const soLa = useMemo(
    () => danhMuc.filter((cv) => cv.LaLa).length,
    [danhMuc],
  );

  const soKetQua = useMemo(
    () => nhomHienThi.reduce((n, g) => n + g.items.length, 0),
    [nhomHienThi],
  );

  if (!isOpen) return null;

  const tieuDePhai = dangTim
    ? `Kết quả tìm kiếm cho “${tuKhoa.trim()}”`
    : nhanhDangXem
      ? `${nhanhDangXem.num} ${nhanhDangXem.title}`
      : "—";

  const phuDePhai = dangTim
    ? "Đang tìm trong toàn bộ danh mục — chọn nhánh bên trái để xem lại theo mục."
    : nhanhDangXem
      ? `${nhanhDangXem.muc.TenCongViec} — nhập số lượng theo đơn vị tính, hệ thống tự quy ra giờ.`
      : "Danh mục chưa có đầu việc nào đang hoạt động.";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box kkq-dm-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kkq-dm-head">
          <div className="kkq-dm-head-text">
            <div className="kkq-dm-head-title">
              Danh mục đầu việc quy đổi
            </div>
            <div className="kkq-dm-head-sub">
              Phụ lục II · {danhMuc.length} dòng, {soLa} đầu việc kê khai được
            </div>
          </div>

          <div className="kkq-dm-head-act">
            <div className="kkq-dm-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tìm đầu việc…"
              />
              {dangTim && (
                <button
                  type="button"
                  className="kkq-dm-search-xoa"
                  onClick={() => setTuKhoa("")}
                  title="Xoá từ khoá"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
            <button
              type="button"
              className="kkq-dm-close"
              onClick={onClose}
              title="Đóng"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="kkq-dm-body">
          <div className="kkq-dm-nav">
            {nhanhHienThi.length === 0 ? (
              <div className="kkq-dm-nav-trong">Không có nhánh nào khớp</div>
            ) : (
              nhanhHienThi.map((muc) => (
                <div key={muc.id} className="kkq-dm-nav-muc">
                  <div className="kkq-dm-nav-muc-ten">
                    {muc.num} {muc.title}
                  </div>
                  {muc.nhanh.map((n) => {
                    const dangChon = !dangTim && nhanhDangXem?.id === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`kkq-dm-nav-dong${dangChon ? " kkq-dm-nav-chon" : ""}`}
                        onClick={() => {
                          setNhanhChon(n.id);
                          setTuKhoa("");
                        }}
                      >
                        <span className="kkq-dm-nav-so">{n.num}</span>
                        <span className="kkq-dm-nav-ten">{n.title}</span>
                        <span className="kkq-dm-nav-dem">
                          {demCua.get(n.id) || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="kkq-dm-pane">
            <div className="kkq-dm-pane-head">
              <div className="kkq-dm-pane-title">{tieuDePhai}</div>
              <div className="kkq-dm-pane-sub">{phuDePhai}</div>
            </div>

            <div className="kkq-dm-pane-body">
              {nhomHienThi.length === 0 ? (
                <div className="kkq-dm-trong">
                  Không tìm thấy đầu việc phù hợp.
                </div>
              ) : (
                nhomHienThi.map((g) => (
                  <div key={g.key} className="kkq-dm-nhom">
                    {g.title && (
                      <div className="kkq-dm-nhom-ten">{g.title}</div>
                    )}
                    {g.items.map((cv, i) => {
                      const heSo = tachHeSo(cv);
                      return (
                        <button
                          key={cv.IdCongViec}
                          type="button"
                          className="kkq-dm-item"
                          onClick={() => onChon?.(cv)}
                          disabled={!onChon}
                          title={
                            cv.GhiChuQuyDoi
                              ? `Quyết định ghi: ${cv.GhiChuQuyDoi}`
                              : undefined
                          }
                        >
                          <span className="kkq-dm-item-so">
                            {soThuTu(cv, i, CHU_CAI[i] || i + 1)}
                          </span>
                          <span className="kkq-dm-item-ten">
                            {cv.TenCongViec}
                          </span>
                          <span className="kkq-dm-chip">
                            <span className="kkq-dm-chip-val">
                              {heSo.val}
                            </span>
                            <span className="kkq-dm-chip-unit">
                              giờ / {heSo.unit}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="kkq-dm-foot">
          <div className="kkq-dm-foot-text">
            {dangTim
              ? `Tìm thấy ${soKetQua} đầu việc`
              : onChon
                ? "Bấm vào một đầu việc để thêm dòng kê khai"
                : `Đang xem ${soLa} đầu việc kê khai được`}
          </div>
          <button type="button" className="btn-submit" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DanhMucCongViecModal;
