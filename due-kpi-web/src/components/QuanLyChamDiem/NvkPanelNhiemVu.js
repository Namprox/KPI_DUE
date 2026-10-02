import React, { useCallback, useEffect, useRef, useState } from "react";
import NhiemVuKhoaFormModal from "./NhiemVuKhoaFormModal";
import NhiemVuKhoaStatus from "../Common/NhiemVuKhoaStatus";
import MinhChungNvkRow from "../Common/MinhChungNvkRow";
import { useAuth } from "../../context/AuthContext";
import { useNhiemVuKhoaForm } from "../../hooks/useNhiemVuKhoaForm";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import {
  canKeKhaiNhiemVu,
  canSuaNhiemVu,
  canXetNhiemVu,
  canXoaNhiemVu,
  canTaiLaiNhiemVu,
  layDanhSachNhiemVu,
  xetNhiemVu,
  xoaNhiemVu,
} from "../../utils/nhiemVuKhoaApi";

export default function NvkPanelNhiemVu({
  idNam,
  idDonVi,
  ky,
  nhomLoc,
  tuKhoa,
  trangThai,
  revision,
  yeuCauForm,
  onYeuCauXong,
  onLamMoiKy,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
  onSuccess,
}) {
  const { user } = useAuth();
  const { confirmDeleteDialog } = useConfirmDeleteDialog();
  const [danhSach, setDanhSach] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXet, setDangXet] = useState(false);
  const [yeuCauXet, setYeuCauXet] = useState(null);
  const [lyDo, setLyDo] = useState("");
  const [loiLyDo, setLoiLyDo] = useState("");
  const request = useRef(0);
  const { form, moForm, dongForm, dangMo } = useNhiemVuKhoaForm({
    idNam,
    idDonVi,
    onError,
  });
  const tai = useCallback(async () => {
    const seq = ++request.current;
    setDangTai(true);
    try {
      const items = await layDanhSachNhiemVu({
        idNam,
        idDonVi,
        idNhomNv: nhomLoc,
        tuKhoa,
        trangThai,
      });
      if (seq === request.current) setDanhSach(items);
    } catch (error) {
      if (seq === request.current) {
        setDanhSach([]);
        onError(error.message);
      }
    } finally {
      if (seq === request.current) setDangTai(false);
    }
  }, [idNam, idDonVi, nhomLoc, tuKhoa, trangThai, onError]);
  useEffect(() => {
    tai();
    return () => {
      request.current += 1;
    };
  }, [tai, revision]);
  useEffect(() => {
    dongForm();
    setYeuCauXet(null);
  }, [idNam, idDonVi]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!yeuCauForm) return;
    if (canKeKhaiNhiemVu(ky)) moForm();
    onYeuCauXong();
  }, [yeuCauForm]); // eslint-disable-line react-hooks/exhaustive-deps
  const lamMoi = () => {
    tai();
    onLamMoiKy();
  };
  const sauKhiLuu = () => {
    dongForm();
    lamMoi();
  };
  const xoa = (nv) =>
    confirmDeleteDialog({
      header: "Xoá nhiệm vụ",
      message: `Xoá “${nv.TenNhiemVu}” và toàn bộ phân công của nhiệm vụ này?`,
      accept: async () => {
        try {
          await xoaNhiemVu(nv.IdNhiemVuKhoa);
          onSuccess("Đã xoá nhiệm vụ");
          lamMoi();
        } catch (error) {
          onError(error.message);
          if (canTaiLaiNhiemVu(error)) lamMoi();
        }
      },
    });
  const xet = async (nv, trangThaiMoi) => {
    if (trangThaiMoi === 3 && !lyDo.trim()) {
      setLoiLyDo("Vui lòng nhập lý do");
      return;
    }
    setDangXet(true);
    try {
      await xetNhiemVu(nv.IdNhiemVuKhoa, { trangThai: trangThaiMoi, lyDo });
      setYeuCauXet(null);
      setLyDo("");
      onSuccess(
        trangThaiMoi === 2
          ? "Đã duyệt nhiệm vụ. Nhắc giảng viên làm mới điểm tự động trên phiếu KPI."
          : "Đã trả nhiệm vụ về cho chủ trì chỉnh sửa",
      );
      lamMoi();
    } catch (error) {
      onError(error.message);
      if (canTaiLaiNhiemVu(error)) {
        setYeuCauXet(null);
        lamMoi();
      }
    } finally {
      setDangXet(false);
    }
  };
  const moLyDo = (nv) => {
    setYeuCauXet(nv);
    setLyDo("");
    setLoiLyDo("");
  };
  const busy = dangTai || dangXet || dangMo;
  return (
    <>
      <p className="cd-hint">
        Chỉ nhiệm vụ đã duyệt được tính điểm. Sau khi duyệt hoặc mở lại, giảng
        viên cần làm mới điểm tự động trên phiếu KPI.
      </p>
      <div className="modern-table-card">
        {dangTai ? (
          <div className="cd-empty">Đang tải nhiệm vụ...</div>
        ) : danhSach.length === 0 ? (
          <div className="cd-empty">Không có nhiệm vụ khớp bộ lọc.</div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table nvk-ql-bang">
              <thead>
                <tr>
                  <th>Nhiệm vụ / trạng thái</th>
                  <th>Phân công</th>
                  <th>Minh chứng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {danhSach.map((nv) => (
                  <tr key={nv.IdNhiemVuKhoa}>
                    <td>
                      <div className="nvk-ql-ten">{nv.TenNhiemVu}</div>
                      <div className="nvk-ql-mo-ta">{nv.TenNhom}</div>
                      {nv.MoTa && <div className="nvk-ql-mo-ta">{nv.MoTa}</div>}
                      <NhiemVuKhoaStatus nhiemVu={nv} />
                      {nv.TenNguoiTao && (
                        <div className="cd-hint">Kê khai: {nv.TenNguoiTao}</div>
                      )}
                      {(nv.TenNguoiDuyet || nv.NgayDuyet) && (
                        <div className="cd-hint">
                          Xét gần nhất: {nv.TenNguoiDuyet || "—"}
                          {nv.NgayDuyet
                            ? ` · ${formatNgayGio(nv.NgayDuyet)}`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="nvk-pc-cell">
                        {(nv.PhanCong || []).map((pc) => (
                          <div key={pc.IdPhanCong} className="nvk-pc-item">
                            <span className="nvk-pc-ten">{pc.HoTen}</span>
                            <span
                              className={`nvk-pc-vai-tro ${pc.LaChuTri ? "nvk-vt-ct" : "nvk-vt-ph"}`}
                            >
                              {pc.TenVaiTroSnapshot}
                            </span>
                            <span>{formatDiem(pc.DiemSnapshot, 1)}đ</span>
                          </div>
                        ))}
                      </div>
                      {!nv.CoChuTri && (
                        <span className="status-pill pill-amber">
                          Chưa có chủ trì
                        </span>
                      )}
                    </td>
                    <td>
                      {(nv.MinhChung || []).map((mc) => (
                        <MinhChungNvkRow
                          key={mc.IdMinhChungNvk}
                          mc={mc}
                          onXem={onXemMinhChung}
                          onTai={onTaiMinhChung}
                        />
                      ))}
                      {!nv.MinhChung?.length && "Chưa có tệp"}
                    </td>
                    <td>
                      <div className="nvk-actions">
                        <button
                          className="cd-link-btn"
                          disabled={busy}
                          onClick={() => moForm(nv.IdNhiemVuKhoa)}
                        >
                          {canSuaNhiemVu(nv) ? "Sửa nhiệm vụ" : "Xem chi tiết"}
                        </button>
                        {canXetNhiemVu(nv) && (
                          <>
                            {[1, 3].includes(Number(nv.TrangThai)) && (
                              <button
                                className="btn-submit"
                                disabled={busy}
                                onClick={() => xet(nv, 2)}
                              >
                                Duyệt
                              </button>
                            )}
                            {[1, 2].includes(Number(nv.TrangThai)) && (
                              <button
                                className="btn-cancel"
                                disabled={busy}
                                onClick={() => moLyDo(nv)}
                              >
                                {Number(nv.TrangThai) === 2
                                  ? "Mở lại"
                                  : "Trả về"}
                              </button>
                            )}
                          </>
                        )}
                        {canXoaNhiemVu(nv, ky) && (
                          <button
                            className="cd-link-btn nvk-mc-xoa"
                            disabled={busy}
                            onClick={() => xoa(nv)}
                          >
                            Xoá
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NhiemVuKhoaFormModal
        isOpen={!!form}
        nhiemVu={form?.nhiemVu}
        cauHinh={form?.cauHinh}
        giangVien={form?.giangVien}
        idNam={idNam}
        idDonVi={idDonVi}
        idNhanVien={user?.IdNhanVien}
        choPhepSua={canKeKhaiNhiemVu(ky)}
        onClose={dongForm}
        onSaved={sauKhiLuu}
        onConflict={lamMoi}
        onMinhChungChanged={lamMoi}
        onError={onError}
        onSuccess={onSuccess}
        onXemMinhChung={onXemMinhChung}
        onTaiMinhChung={onTaiMinhChung}
      />
      {yeuCauXet && (
        <div className="modal-overlay">
          <div
            className="modal-box form-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nvk-xet-title"
          >
            <div className="modal-header">
              <h3 id="nvk-xet-title">
                {Number(yeuCauXet.TrangThai) === 2
                  ? "Mở lại nhiệm vụ"
                  : "Trả về nhiệm vụ"}
              </h3>
            </div>
            <div className="modal-body">
              <p>{yeuCauXet.TenNhiemVu}</p>
              <label htmlFor="nvk-ly-do">Lý do (bắt buộc)</label>
              <textarea
                id="nvk-ly-do"
                autoFocus
                className="form-input"
                rows={3}
                maxLength={1000}
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                disabled={dangXet}
              />
              {loiLyDo && (
                <p role="alert" className="cd-hint cd-hint-error">
                  {loiLyDo}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                disabled={dangXet}
                onClick={() => setYeuCauXet(null)}
              >
                Huỷ
              </button>
              <button
                className="btn-submit"
                disabled={dangXet}
                onClick={() => xet(yeuCauXet, 3)}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
