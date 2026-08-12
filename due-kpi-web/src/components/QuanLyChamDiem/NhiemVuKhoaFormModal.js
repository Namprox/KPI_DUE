import React, { useEffect, useMemo, useState } from "react";
import SearchSelect from "../Common/SearchSelect";
import MinhChungNhiemVuBox from "./MinhChungNhiemVuBox";
import { formatDiem } from "../../utils/phieuApi";
import {
  luuNhiemVu,
  themMinhChungNhiemVu,
  vuotTran,
} from "../../utils/nhiemVuKhoaApi";

const MA_CHU_TRI = "CT";

let seqKey = 0;
const dongMoi = () => ({
  key: `row-${++seqKey}`,
  idNhanVien: "",
  idVaiTro: "",
  ghiChu: "",
});

/**
 * Form tạo / sửa nhiệm vụ phục vụ cộng đồng của Khoa.
 *
 * **MỘT form, MỘT lần lưu.** Nhiệm vụ và toàn bộ danh sách phân công đi trong
 * một request duy nhất — không có endpoint riêng để thêm/xoá từng dòng phân
 * công. Khi sửa, hàm lưu gửi lên TOÀN BỘ danh sách sau khi sửa và server tự tính
 * diff (gỡ / đổi vai trò / thêm), nên "xoá một người khỏi nhiệm vụ" ở đây đơn
 * giản là bấm nút gỡ dòng rồi Lưu.
 *
 * Điểm KHÔNG được gửi lên: server tự tra mức từ danh mục vai trò rồi ghi cứng
 * vào bản ghi. Cột "Điểm dự kiến" trong bảng chỉ để người nhập ước lượng, và
 * state sau khi lưu luôn lấy từ response chứ không tự suy.
 *
 * Hai ràng buộc được chặn ngay tại form vì server sẽ trả lỗi và KHÔNG lưu gì:
 *  - mỗi nhiệm vụ tối đa MỘT chủ trì (422 TRUNG_CHU_TRI);
 *  - một người chỉ xuất hiện một lần trong cùng nhiệm vụ (UNIQUE uq_pcnvk).
 *
 * Ngược lại, hai tình huống sau CỐ Ý không chặn:
 *  - nhiệm vụ chưa có chủ trì vẫn lưu được (Khoa nhập dở), chỉ chặn khi chốt kỳ;
 *  - giảng viên vượt trần điểm chỉ cảnh báo mềm — chặn là SAI nghiệp vụ.
 *
 * Minh chứng vẫn đi bằng endpoint riêng cần `IdNhiemVuKhoa`, nhưng khi TẠO MỚI
 * form không bắt người nhập lưu rồi mở lại: file được xếp hàng chờ, lưu xong thì
 * form tự tải lên bằng id vừa nhận. Upload lỗi KHÔNG huỷ nhiệm vụ đã tạo — cùng
 * quy ước "đính kèm thất bại chỉ cảnh báo nhẹ" với luồng gửi phản hồi.
 */
const NhiemVuKhoaFormModal = ({
  isOpen,
  nhiemVu,
  nhomGoiY,
  cauHinh,
  giangVien = [],
  idNam,
  idDonVi,
  choPhepSua,
  onClose,
  onSaved,
  onMinhChungChanged,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
  onSuccess,
}) => {
  const laSua = !!nhiemVu?.IdNhiemVuKhoa;

  const [idNhomNv, setIdNhomNv] = useState("");
  const [tenNhiemVu, setTenNhiemVu] = useState("");
  const [moTa, setMoTa] = useState("");
  const [rows, setRows] = useState([]);
  const [minhChung, setMinhChung] = useState([]);
  const [hangCho, setHangCho] = useState([]);
  const [dangLuu, setDangLuu] = useState(false);
  const [loiForm, setLoiForm] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // Tạo mới từ một phản hồi "thiếu nhiệm vụ": điền sẵn nhóm giảng viên gợi ý
    setIdNhomNv(
      nhiemVu?.IdNhomNv != null
        ? String(nhiemVu.IdNhomNv)
        : nhomGoiY
          ? String(nhomGoiY)
          : "",
    );
    setTenNhiemVu(nhiemVu?.TenNhiemVu ?? "");
    setMoTa(nhiemVu?.MoTa ?? "");
    setMinhChung(nhiemVu?.MinhChung || []);
    setHangCho([]);
    setRows(
      (nhiemVu?.PhanCong || []).map((pc) => ({
        key: `pc-${pc.IdPhanCong}`,
        idNhanVien: String(pc.IdNhanVien),
        idVaiTro: String(pc.IdVaiTro),
        ghiChu: pc.GhiChu ?? "",
      })),
    );
    setLoiForm("");
    setDangLuu(false);
  }, [isOpen, nhiemVu, nhomGoiY]);

  const vaiTroList = useMemo(() => cauHinh?.VaiTro || [], [cauHinh]);
  const nhomList = useMemo(() => cauHinh?.Nhom || [], [cauHinh]);

  const vaiTroById = useMemo(() => {
    const map = new Map();
    vaiTroList.forEach((vt) => map.set(String(vt.IdVaiTro), vt));
    return map;
  }, [vaiTroList]);

  const gvById = useMemo(() => {
    const map = new Map();
    giangVien.forEach((gv) => map.set(String(gv.IdNhanVien), gv));
    return map;
  }, [giangVien]);

  /**
   * Điểm người này ĐANG có trong chính nhiệm vụ đang sửa.
   * Phải trừ đi trước khi cộng điểm vai trò mới, nếu không tổng dự kiến sẽ đếm
   * hai lần cho người vốn đã nằm trong nhiệm vụ.
   */
  const diemGocTrongNhiemVu = useMemo(() => {
    const map = new Map();
    (nhiemVu?.PhanCong || []).forEach((pc) =>
      map.set(String(pc.IdNhanVien), Number(pc.DiemSnapshot) || 0),
    );
    return map;
  }, [nhiemVu]);

  const tranDiem = cauHinh?.TranDiem;

  const soChuTri = rows.filter(
    (r) => vaiTroById.get(r.idVaiTro)?.MaVaiTro === MA_CHU_TRI,
  ).length;

  const nguoiTrungLap = useMemo(() => {
    const dem = new Map();
    rows.forEach((r) => {
      if (!r.idNhanVien) return;
      dem.set(r.idNhanVien, (dem.get(r.idNhanVien) || 0) + 1);
    });
    return new Set([...dem.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [rows]);

  const capNhatDong = (key, thayDoi) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...thayDoi } : r)),
    );

  const goDong = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  // Minh chứng lưu ngay khi tải lên, không chờ nút Lưu — báo ngược cho bảng ở
  // trang cha để cột đếm tệp không lệch sau khi đóng form.
  const capNhatMinhChung = (danhSach) => {
    setMinhChung(danhSach);
    if (nhiemVu?.IdNhiemVuKhoa) {
      onMinhChungChanged?.(nhiemVu.IdNhiemVuKhoa, danhSach);
    }
  };

  /** Tổng điểm của một người SAU khi lưu form này (ước lượng để cảnh báo trần). */
  const tinhDuKien = (row) => {
    const gv = gvById.get(row.idNhanVien);
    if (!gv) return null;
    const diemMoi = Number(vaiTroById.get(row.idVaiTro)?.DiemQuyDoi) || 0;
    const diemCu = diemGocTrongNhiemVu.get(row.idNhanVien) || 0;
    return (Number(gv.TongDiemThucTe) || 0) - diemCu + diemMoi;
  };

  const kiemTra = () => {
    if (!tenNhiemVu.trim()) return "Chưa nhập tên nhiệm vụ";
    if (!idNhomNv) return "Chưa chọn nhóm nhiệm vụ";
    if (rows.some((r) => !r.idNhanVien || !r.idVaiTro)) {
      return "Có dòng phân công chưa chọn đủ giảng viên và vai trò";
    }
    if (nguoiTrungLap.size > 0) {
      return "Một giảng viên chỉ được xuất hiện một lần trong cùng nhiệm vụ";
    }
    if (soChuTri > 1) {
      return "Mỗi nhiệm vụ chỉ được có một chủ trì — hãy đổi vai trò của những người còn lại";
    }
    return "";
  };

  /**
   * Tải nốt hàng chờ bằng id vừa nhận. Chạy TUẦN TỰ cho khỏi dồn nhiều upload
   * cùng lúc, và nuốt lỗi từng tệp: nhiệm vụ đã tạo xong rồi, một tệp hỏng
   * không được phép biến cả thao tác thành "thất bại".
   *
   * @returns {Promise<{daTai: object[], loi: string[]}>}
   */
  const taiHangCho = async (idNhiemVu) => {
    const daTai = [];
    const loi = [];

    for (const cho of hangCho) {
      try {
        const moi = await themMinhChungNhiemVu(
          idNhiemVu,
          cho.file,
          cho.tenHienThi,
          cauHinh,
        );
        if (moi) daTai.push(moi);
      } catch (error) {
        console.error("Lỗi tải minh chứng sau khi tạo nhiệm vụ:", error);
        loi.push(cho.tenHienThi || cho.file.name);
      }
    }
    return { daTai, loi };
  };

  const luu = async () => {
    const loi = kiemTra();
    setLoiForm(loi);
    if (loi) return;

    setDangLuu(true);
    try {
      // Gửi TOÀN BỘ danh sách sau khi sửa: dòng đã gỡ khỏi `rows` chính là dòng
      // server sẽ xoá khi tính diff.
      const item = await luuNhiemVu({
        id: nhiemVu?.IdNhiemVuKhoa,
        idNam,
        idDonVi,
        idNhomNv,
        tenNhiemVu,
        moTa,
        phanCong: rows.map((r) => ({
          IdNhanVien: r.idNhanVien,
          IdVaiTro: r.idVaiTro,
          GhiChu: r.ghiChu,
        })),
      });
      let ketQua = item;
      let soTepDaTai = 0;

      if (hangCho.length > 0 && item?.IdNhiemVuKhoa) {
        const { daTai, loi: loiTai } = await taiHangCho(item.IdNhiemVuKhoa);
        setHangCho([]);
        soTepDaTai = daTai.length;
        ketQua = { ...item, MinhChung: [...(item.MinhChung || []), ...daTai] };

        if (loiTai.length > 0) {
          onError(
            `Nhiệm vụ đã lưu nhưng chưa đính kèm được ${loiTai.length} tệp (${loiTai.join(", ")}) — mở lại nhiệm vụ để tải lên.`,
          );
        }
      }

      const nhanTep = soTepDaTai > 0 ? ` kèm ${soTepDaTai} minh chứng` : "";
      onSuccess(
        laSua ? `Đã lưu nhiệm vụ${nhanTep}` : `Đã tạo nhiệm vụ${nhanTep}`,
      );
      // Response mang PhanCong[] kèm DiemSnapshot server vừa tính — dùng nó để
      // cập nhật state thay vì tự đoán điểm ở FE.
      onSaved(ketQua);
    } catch (error) {
      console.error("Lỗi lưu nhiệm vụ phục vụ cộng đồng:", error);
      setLoiForm(error.message);
      onError(error.message);
    }
    setDangLuu(false);
  };

  if (!isOpen) return null;

  const nhanVaiTro = (vt) =>
    `${vt.TenVaiTro} — ${formatDiem(vt.DiemQuyDoi, 1)} điểm`;

  const nhanGiangVien = (gv) => {
    const canhBao = vuotTran(gv.TongDiemThucTe, tranDiem) ? " ⚠" : "";
    return `${gv.HoTen} (${gv.MaNhanVien}) — ${formatDiem(gv.TongDiemThucTe, 1)}đ / ${gv.SoNhiemVu} nhiệm vụ${canhBao}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box form-modal-box nvk-form-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i
              className="fa-solid fa-clipboard-list"
              style={{ marginRight: "8px" }}
            ></i>
            {laSua ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ"}
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label>
                Nhóm nhiệm vụ <span className="text-red">*</span>
              </label>
              <SearchSelect
                value={idNhomNv}
                onChange={(v) => setIdNhomNv(v)}
                options={nhomList.map((n) => ({
                  value: n.IdNhomNv,
                  label: n.TenNhom,
                }))}
                placeholder="-- Chọn nhóm --"
                searchable
                disabled={!choPhepSua || dangLuu}
              />
            </div>

            <div className="form-group">
              <label>
                Tên nhiệm vụ <span className="text-red">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={tenNhiemVu}
                maxLength={500}
                onChange={(e) => setTenNhiemVu(e.target.value)}
                placeholder="Ví dụ: Kiểm định chương trình đào tạo ngành Luật"
                disabled={!choPhepSua || dangLuu}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label>Mô tả</label>
            <textarea
              className="form-input cd-textarea"
              rows={2}
              value={moTa}
              maxLength={1000}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="Đợt, phạm vi, ghi chú thêm (không bắt buộc)"
              disabled={!choPhepSua || dangLuu}
            />
          </div>

          <div className="nvk-pc-head">
            <div className="cd-box-title" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-users"></i> Phân công ({rows.length}{" "}
              người)
            </div>
            {choPhepSua && (
              <button
                type="button"
                className="cd-link-btn"
                onClick={() => setRows((prev) => [...prev, dongMoi()])}
                disabled={dangLuu}
              >
                <i className="fa-solid fa-plus"></i> Thêm người
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="cd-hint nvk-pc-trong">
              Chưa gán ai. Nhiệm vụ không có người vẫn lưu được — nhưng sẽ chặn
              khi chốt kỳ.
            </div>
          ) : (
            <div className="nvk-pc-list">
              {rows.map((row) => {
                const vt = vaiTroById.get(row.idVaiTro);
                const laChuTri = vt?.MaVaiTro === MA_CHU_TRI;
                const duKien = tinhDuKien(row);
                const canhBaoTran = duKien != null && vuotTran(duKien, tranDiem);
                const trungNguoi = nguoiTrungLap.has(row.idNhanVien);

                return (
                  <div
                    key={row.key}
                    className={`nvk-pc-row${trungNguoi ? " nvk-pc-loi" : ""}`}
                  >
                    <div className="nvk-pc-gv">
                      <SearchSelect
                        value={row.idNhanVien}
                        onChange={(v) => capNhatDong(row.key, { idNhanVien: v })}
                        options={giangVien.map((gv) => ({
                          value: gv.IdNhanVien,
                          label: nhanGiangVien(gv),
                        }))}
                        placeholder="-- Chọn giảng viên --"
                        searchable
                        searchPlaceholder="Tìm theo tên hoặc mã..."
                        invalid={trungNguoi}
                        disabled={!choPhepSua || dangLuu}
                      />
                      {canhBaoTran && (
                        <div className="cd-hint cd-hint-warn nvk-pc-hint">
                          <i className="fa-solid fa-circle-exclamation"></i> Tổng
                          dự kiến {formatDiem(duKien, 1)}đ vượt trần{" "}
                          {formatDiem(tranDiem, 1)}đ — sẽ được quy đổi về{" "}
                          {formatDiem(tranDiem, 1)}đ khi báo cáo.
                        </div>
                      )}
                      {trungNguoi && (
                        <div className="cd-hint cd-hint-error nvk-pc-hint">
                          <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                          Giảng viên này đã có trong nhiệm vụ.
                        </div>
                      )}
                    </div>

                    <div className="nvk-pc-vt">
                      <SearchSelect
                        value={row.idVaiTro}
                        onChange={(v) => capNhatDong(row.key, { idVaiTro: v })}
                        options={vaiTroList.map((vaiTro) => ({
                          value: vaiTro.IdVaiTro,
                          label: nhanVaiTro(vaiTro),
                        }))}
                        placeholder="-- Vai trò --"
                        invalid={laChuTri && soChuTri > 1}
                        disabled={!choPhepSua || dangLuu}
                      />
                      {laChuTri && soChuTri > 1 && (
                        <div className="cd-hint cd-hint-error nvk-pc-hint">
                          <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                          Đang có {soChuTri} chủ trì.
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      className="form-input nvk-pc-gc"
                      value={row.ghiChu}
                      maxLength={500}
                      onChange={(e) =>
                        capNhatDong(row.key, { ghiChu: e.target.value })
                      }
                      placeholder="Ghi chú"
                      disabled={!choPhepSua || dangLuu}
                    />

                    <div className="nvk-pc-diem">
                      {vt ? `${formatDiem(vt.DiemQuyDoi, 1)}đ` : "—"}
                    </div>

                    {choPhepSua && (
                      <button
                        type="button"
                        className="nvk-pc-go"
                        onClick={() => goDong(row.key)}
                        disabled={dangLuu}
                        title="Gỡ người này khỏi nhiệm vụ"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {rows.length > 0 && soChuTri === 0 && (
            <div className="cd-hint cd-hint-warn nvk-pc-hint">
              <i className="fa-solid fa-circle-exclamation"></i> Nhiệm vụ chưa có
              chủ trì. Vẫn lưu được, nhưng phải bổ sung trước khi chốt kỳ.
            </div>
          )}

          <MinhChungNhiemVuBox
            idNhiemVu={nhiemVu?.IdNhiemVuKhoa || null}
            danhSach={minhChung}
            hangCho={hangCho}
            cauHinh={cauHinh}
            choPhepSua={choPhepSua}
            onChange={capNhatMinhChung}
            onHangChoChange={setHangCho}
            onXem={onXemMinhChung}
            onTai={onTaiMinhChung}
            onError={onError}
            onSuccess={onSuccess}
          />

          {loiForm && (
            <div className="cd-hint cd-hint-error" style={{ fontSize: "13px" }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {loiForm}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times"></i> Đóng
          </button>
          {choPhepSua && (
            <button
              type="button"
              className="btn-submit"
              onClick={luu}
              disabled={dangLuu}
            >
              <i
                className={`fa-solid ${dangLuu ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
              ></i>{" "}
              Lưu nhiệm vụ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NhiemVuKhoaFormModal;
