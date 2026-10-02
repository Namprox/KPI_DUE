import React, { useEffect, useMemo, useState } from "react";
import SearchSelect from "../Common/SearchSelect";
import MinhChungNhiemVuBox from "./MinhChungNhiemVuBox";
import NhiemVuKhoaStatus from "../Common/NhiemVuKhoaStatus";
import { formatDiem } from "../../utils/phieuApi";
import {
  luuNhiemVu,
  themMinhChungNhiemVu,
  canSuaNhiemVu,
  canTaiLaiNhiemVu,
} from "../../utils/nhiemVuKhoaApi";

const MA_CHU_TRI = "CT";

let seqKey = 0;
const dongMoi = () => ({
  key: `row-${++seqKey}`,
  idNhanVien: "",
  idVaiTro: "",
  ghiChu: "",
});

/** Chủ trì tự kê khai; chỉ gửi toàn bộ người phối hợp, điểm do server tính. */
const NhiemVuKhoaFormModal = ({
  isOpen,
  nhiemVu,
  nhomGoiY,
  cauHinh,
  giangVien = [],
  idNam,
  idDonVi,
  choPhepSua: choPhepTao,
  idNhanVien,
  onConflict,
  onClose,
  onSaved,
  onMinhChungChanged,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
  onSuccess,
}) => {
  const laSua = !!nhiemVu?.IdNhiemVuKhoa;
  const choPhepSua = laSua ? canSuaNhiemVu(nhiemVu) : choPhepTao === true;

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
      (nhiemVu?.PhanCong || [])
        .filter((pc) => !pc.LaChuTri && pc.MaVaiTroSnapshot !== MA_CHU_TRI)
        .map((pc) => ({
          key: `pc-${pc.IdPhanCong}`,
          idNhanVien: String(pc.IdNhanVien),
          idVaiTro: String(pc.IdVaiTro),
          ghiChu: pc.GhiChu ?? "",
        })),
    );
    setLoiForm("");
    setDangLuu(false);
  }, [isOpen, nhiemVu, nhomGoiY, idNhanVien]);

  const vaiTroList = useMemo(
    () =>
      (cauHinh?.VaiTro || []).filter((vt) =>
        ["PHC", "PH"].includes(vt.MaVaiTro),
      ),
    [cauHinh],
  );
  const nguoiPhoiHop = useMemo(
    () =>
      giangVien.filter(
        (gv) =>
          String(gv.IdNhanVien) !== String(idNhanVien) &&
          !(nhiemVu?.PhanCong || []).some(
            (pc) =>
              pc.LaChuTri && String(pc.IdNhanVien) === String(gv.IdNhanVien),
          ),
      ),
    [giangVien, idNhanVien, nhiemVu],
  );
  const nhomList = useMemo(() => cauHinh?.Nhom || [], [cauHinh]);

  const vaiTroById = useMemo(() => {
    const map = new Map();
    vaiTroList.forEach((vt) => map.set(String(vt.IdVaiTro), vt));
    return map;
  }, [vaiTroList]);

  const gvById = useMemo(() => {
    const map = new Map();
    nguoiPhoiHop.forEach((gv) => map.set(String(gv.IdNhanVien), gv));
    return map;
  }, [nguoiPhoiHop]);

  const nguoiTrungLap = useMemo(() => {
    const dem = new Map();
    rows.forEach((r) => {
      if (!r.idNhanVien) return;
      dem.set(r.idNhanVien, (dem.get(r.idNhanVien) || 0) + 1);
    });
    return new Set(
      [...dem.entries()].filter(([, n]) => n > 1).map(([id]) => id),
    );
  }, [rows]);

  const capNhatDong = (key, thayDoi) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...thayDoi } : r)),
    );

  const goDong = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  // Minh chứng lưu ngay khi tải lên, không chờ nút Lưu - báo ngược cho bảng ở
  // trang cha để cột đếm tệp không lệch sau khi đóng form.
  const capNhatMinhChung = (danhSach) => {
    setMinhChung(danhSach);
    if (nhiemVu?.IdNhiemVuKhoa) {
      onMinhChungChanged?.(nhiemVu.IdNhiemVuKhoa, danhSach);
    }
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
    if (
      rows.some(
        (r) =>
          String(r.idNhanVien) === String(idNhanVien) ||
          !vaiTroById.has(r.idVaiTro),
      )
    ) {
      return "Chỉ chọn người phối hợp khác bạn với vai trò phối hợp chính hoặc phối hợp";
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
          "",
          cauHinh,
        );
        if (moi) daTai.push(moi);
      } catch (error) {
        console.error("Lỗi tải minh chứng sau khi tạo nhiệm vụ:", error);
        loi.push(cho.file.name);
      }
    }
    return { daTai, loi };
  };

  const luu = async () => {
    if (!choPhepSua) return;
    const loi = kiemTra();
    setLoiForm(loi);
    if (loi) return;

    setDangLuu(true);
    try {
      // Gửi TOÀN BỘ danh sách sau khi sửa: dòng đã gỡ khỏi `rows` chính là dòng
      // server sẽ xoá khi tính diff.
      const envelope = await luuNhiemVu({
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
      const item = envelope.Item;
      let ketQua = item;
      let soTepDaTai = 0;

      if (hangCho.length > 0 && item?.IdNhiemVuKhoa) {
        const { daTai, loi: loiTai } = await taiHangCho(item.IdNhiemVuKhoa);
        setHangCho([]);
        soTepDaTai = daTai.length;
        ketQua = { ...item, MinhChung: [...(item.MinhChung || []), ...daTai] };

        if (loiTai.length > 0) {
          onError(
            `Nhiệm vụ đã lưu nhưng chưa đính kèm được ${loiTai.length} tệp (${loiTai.join(", ")}) - mở lại nhiệm vụ để tải lên.`,
          );
        }
      }

      const nhanTep = soTepDaTai > 0 ? ` kèm ${soTepDaTai} minh chứng` : "";
      onSuccess(
        envelope.Message ||
          (laSua
            ? `Đã lưu nhiệm vụ${nhanTep}`
            : `Đã kê khai nhiệm vụ${nhanTep}`),
      );
      // Response mang PhanCong[] kèm DiemSnapshot server vừa tính - dùng nó để
      // cập nhật state thay vì tự đoán điểm ở FE.
      onSaved(ketQua);
    } catch (error) {
      console.error("Lỗi lưu nhiệm vụ phục vụ cộng đồng:", error);
      setLoiForm(error.message);
      onError(error.message);
      if (canTaiLaiNhiemVu(error)) {
        onClose();
        onConflict?.();
      }
    }
    setDangLuu(false);
  };

  if (!isOpen) return null;

  const nhanVaiTro = (vt) =>
    `${vt.TenVaiTro} - ${formatDiem(vt.DiemQuyDoi, 1)} điểm`;

  const nhanGiangVien = (gv) => `${gv.HoTen} (${gv.MaNhanVien})`;
  const chuTri = nhiemVu?.PhanCong?.find(
    (pc) => pc.LaChuTri || pc.MaVaiTroSnapshot === MA_CHU_TRI,
  );

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
            {laSua
              ? choPhepSua
                ? "Sửa nhiệm vụ"
                : "Chi tiết nhiệm vụ"
              : "Kê khai nhiệm vụ"}
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {laSua && <NhiemVuKhoaStatus nhiemVu={nhiemVu} />}
          <div className="form-grid-2">
            <div className="form-group">
              <label>
                Nhóm nhiệm vụ <span className="text-red">*</span>
              </label>
              <SearchSelect
                ariaLabel="Nhóm nhiệm vụ"
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

          <div className="form-group nvk-form-mo-ta">
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
              <i className="fa-solid fa-users"></i> Người phối hợp (
              {rows.length} người)
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
              Chưa chọn người phối hợp.
            </div>
          ) : (
            <div className="nvk-pc-list">
              {rows.map((row) => {
                const vt = vaiTroById.get(row.idVaiTro);
                const trungNguoi = nguoiTrungLap.has(row.idNhanVien);
                const nguoiDaRaKhoiDanhSach =
                  row.idNhanVien && !gvById.has(row.idNhanVien);
                const phanCongCu = nhiemVu?.PhanCong?.find(
                  (pc) => String(pc.IdNhanVien) === row.idNhanVien,
                );

                return (
                  <div
                    key={row.key}
                    className={`nvk-pc-row${trungNguoi ? " nvk-pc-loi" : ""}`}
                  >
                    <div className="nvk-pc-gv">
                      {choPhepSua ? (
                        <SearchSelect
                          ariaLabel="Người phối hợp"
                          value={row.idNhanVien}
                          onChange={(v) =>
                            capNhatDong(row.key, {
                              idNhanVien: String(v ?? ""),
                            })
                          }
                          options={nguoiPhoiHop.map((gv) => ({
                            value: gv.IdNhanVien,
                            label: nhanGiangVien(gv),
                          }))}
                          placeholder="-- Chọn giảng viên --"
                          searchable
                          searchPlaceholder="Tìm theo tên hoặc mã..."
                          invalid={trungNguoi}
                          disabled={!choPhepSua || dangLuu}
                        />
                      ) : (
                        <span>
                          {phanCongCu?.HoTen || `Nhân viên #${row.idNhanVien}`}
                        </span>
                      )}
                      {choPhepSua && nguoiDaRaKhoiDanhSach && (
                        <div className="cd-hint cd-hint-warn nvk-pc-hint">
                          {phanCongCu?.HoTen || `Nhân viên #${row.idNhanVien}`}{" "}
                          không còn trong danh sách giảng viên của Khoa. Hãy gỡ
                          người này hoặc chọn người khác trước khi lưu.
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
                      {choPhepSua ? (
                        <SearchSelect
                          ariaLabel="Vai trò phối hợp"
                          value={row.idVaiTro}
                          onChange={(v) =>
                            capNhatDong(row.key, { idVaiTro: String(v ?? "") })
                          }
                          options={vaiTroList.map((vaiTro) => ({
                            value: vaiTro.IdVaiTro,
                            label: nhanVaiTro(vaiTro),
                          }))}
                          placeholder="-- Vai trò --"
                          disabled={!choPhepSua || dangLuu}
                        />
                      ) : (
                        <span>{phanCongCu?.TenVaiTroSnapshot || "—"}</span>
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
                      {formatDiem(
                        phanCongCu &&
                          String(phanCongCu.IdVaiTro) === row.idVaiTro
                          ? phanCongCu.DiemSnapshot
                          : vt?.DiemQuyDoi,
                        1,
                      )}
                      đ
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

          <MinhChungNhiemVuBox
            idNhiemVu={nhiemVu?.IdNhiemVuKhoa || null}
            danhSach={minhChung}
            hangCho={hangCho}
            cauHinh={cauHinh}
            choPhepSua={choPhepSua && !dangLuu}
            onConflict={() => {
              onClose();
              onConflict?.();
            }}
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
          <div className="nvk-form-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <div>
              <p>
                Chủ trì:{" "}
                {laSua
                  ? chuTri
                    ? chuTri.HoTen || `Nhân viên #${chuTri.IdNhanVien}`
                    : "Chưa có chủ trì"
                  : "Bạn (người kê khai)"}
                .{!laSua && " Người chủ trì được hệ thống ghi nhận tự động."}
                {choPhepSua && " Nhiệm vụ chỉ có chủ trì vẫn kê khai được."}
              </p>
              <p>
                Quyết định phân công, kế hoạch, biên bản đính kèm là minh chứng
                chung cho mọi giảng viên trong nhiệm vụ.
              </p>
            </div>
          </div>
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
