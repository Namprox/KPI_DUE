import React, { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/CaNhan/NhiemVuKhoaCuaToi.css";
import "../../css/QuanLyChamDiem/PhanCongNhiemVuKhoa.css";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungNvkRow from "../../components/Common/MinhChungNvkRow";
import NhiemVuKhoaStatus from "../../components/Common/NhiemVuKhoaStatus";
import NhiemVuKhoaFormModal from "../../components/QuanLyChamDiem/NhiemVuKhoaFormModal";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungNvkPreview } from "../../hooks/useMinhChungNvkPreview";
import { useNhiemVuKhoaForm } from "../../hooks/useNhiemVuKhoaForm";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { formatDiem } from "../../utils/phieuApi";
import {
  canKeKhaiNhiemVu,
  canSuaNhiemVu,
  layNhiemVuCuaToi,
  xoaNhiemVu,
  canTaiLaiNhiemVu,
} from "../../utils/nhiemVuKhoaApi";

export default function NhiemVuKhoaCuaToi() {
  const toast = useRef(null);
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { confirmDeleteDialog } = useConfirmDeleteDialog();
  const [duLieu, setDuLieu] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [tab, setTab] = useState("chu-tri");
  const baoLoi = useCallback(
    (detail) =>
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail,
        life: 5000,
      }),
    [],
  );
  const baoThanhCong = (detail) =>
    toast.current?.show({
      severity: "success",
      summary: "Thành công",
      detail,
      life: 5000,
    });
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungNvkPreview(baoLoi);
  const request = useRef(0);
  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;
    const seq = ++request.current;
    setDangTai(true);
    setLoi("");
    try {
      const result = await layNhiemVuCuaToi(selectedNam);
      if (seq === request.current) setDuLieu(result);
    } catch (error) {
      if (seq === request.current) {
        setDuLieu(null);
        setLoi(error.message);
      }
    } finally {
      if (seq === request.current) setDangTai(false);
    }
  }, [selectedNam]);
  useEffect(() => {
    setDuLieu(null);
    if (!dangTaiNam) taiDuLieu();
    return () => {
      request.current += 1;
    };
  }, [dangTaiNam, taiDuLieu]);
  const header = duLieu?.Header;
  const items = duLieu?.Items || [];
  const rows = items.filter((nv) =>
    tab === "chu-tri" ? nv.LaChuTri === true : nv.LaChuTri !== true,
  );
  const { form, moForm, dongForm, dangMo } = useNhiemVuKhoaForm({
    idNam: selectedNam,
    idDonVi: header?.IdDonVi,
    onError: baoLoi,
  });
  const sauKhiLuu = () => {
    dongForm();
    taiDuLieu();
  };
  const xoa = (nv) =>
    confirmDeleteDialog({
      header: "Xoá nhiệm vụ",
      message: `Xoá “${nv.TenNhiemVu}” và toàn bộ phân công của nhiệm vụ này?`,
      accept: async () => {
        try {
          await xoaNhiemVu(nv.IdNhiemVuKhoa);
          baoThanhCong("Đã xoá nhiệm vụ");
          taiDuLieu();
        } catch (error) {
          baoLoi(error.message);
          if (canTaiLaiNhiemVu(error)) taiDuLieu();
        }
      },
    });
  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />
      <div className="page-header">
        <h2 className="nvk-title">Phục vụ cộng đồng và các nhiệm vụ khác</h2>
        <span className="breadcrumb">
          Chủ trì kê khai, Trưởng khoa duyệt từng nhiệm vụ · KPI Nhóm III
        </span>
      </div>
      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={setSelectedNam}
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
          disabled={dangTai || dangTaiNam}
        >
          Làm mới
        </button>
        {canKeKhaiNhiemVu(header) && (
          <button
            className="btn-add-new"
            disabled={dangTai || dangMo}
            onClick={() => moForm()}
          >
            Kê khai nhiệm vụ
          </button>
        )}
      </div>
      {loi ? (
        <div className="cd-empty" role="alert">
          {loi}
        </div>
      ) : !header ? (
        <div className="cd-empty">
          {dangTai ? "Đang tải nhiệm vụ..." : "Chưa có dữ liệu nhiệm vụ."}
        </div>
      ) : (
        <>
          <div className="stat-card-grid">
            <div className="stat-card">
              <div>
                <div className="stat-label">Điểm KPI Nhóm III đã duyệt</div>
                <div className="stat-value">
                  {formatDiem(header.TongDiemQuyDoi, 1)}{" "}
                  <span className="nvk-stat-phu">
                    / {formatDiem(header.TranDiem, 1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Điểm thực tế đã duyệt</div>
                <div className="stat-value">
                  {formatDiem(header.TongDiemThucTe, 1)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Nhiệm vụ đã duyệt</div>
                <div className="stat-value">{header.SoNhiemVu ?? "—"}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Chưa tính vào KPI</div>
                <div className="nvk-pending-points">
                  +{formatDiem(header.TongDiemChoDuyet, 1)} điểm chờ duyệt
                </div>
                <div className="cd-hint">
                  {header.SoChoDuyet ?? "—"} chờ duyệt · {header.SoTraVe ?? "—"}{" "}
                  trả về
                </div>
              </div>
            </div>
          </div>
          <p className="cd-hint">
            Chỉ nhiệm vụ đã duyệt được tính điểm. Sau khi được duyệt, hãy làm
            mới điểm tự động trên phiếu KPI.
          </p>
          <div className="cd-tabs">
            <button
              className={`cd-tab${tab === "chu-tri" ? " cd-tab-active" : ""}`}
              onClick={() => setTab("chu-tri")}
            >
              Tôi chủ trì ({items.filter((nv) => nv.LaChuTri === true).length})
            </button>
            <button
              className={`cd-tab${tab === "phoi-hop" ? " cd-tab-active" : ""}`}
              onClick={() => setTab("phoi-hop")}
            >
              Tôi phối hợp ({items.filter((nv) => nv.LaChuTri !== true).length})
            </button>
          </div>
          <div className="modern-table-card">
            {rows.length === 0 ? (
              <div className="cd-empty">
                Chưa có nhiệm vụ trong danh sách này.
              </div>
            ) : (
              <div className="table-scroll">
                <table className="custom-table nvk-bang">
                  <thead>
                    <tr>
                      <th>Nhiệm vụ</th>
                      <th>Vai trò / điểm</th>
                      <th>Trạng thái</th>
                      <th>Minh chứng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((nv) => (
                      <tr key={nv.IdNhiemVuKhoa}>
                        <td>
                          <div className="nvk-ten-nv">{nv.TenNhiemVu}</div>
                          <div className="nvk-mo-ta">{nv.TenNhom}</div>
                          {nv.MoTa && (
                            <div className="nvk-mo-ta">{nv.MoTa}</div>
                          )}
                          {nv.GhiChu && (
                            <div className="nvk-ghi-chu">{nv.GhiChu}</div>
                          )}
                        </td>
                        <td>
                          {nv.TenVaiTroSnapshot || "—"}
                          <div>
                            {formatDiem(nv.DiemSnapshot, 1)} điểm
                            {Number(nv.TrangThai) !== 2 && (
                              <span className="cd-hint"> · chưa tính</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <NhiemVuKhoaStatus nhiemVu={nv} />
                        </td>
                        <td>
                          {(nv.MinhChung || []).map((mc) => (
                            <MinhChungNvkRow
                              key={mc.IdMinhChungNvk}
                              mc={mc}
                              onXem={openPreview}
                              onTai={downloadMinhChung}
                            />
                          ))}
                          {!nv.MinhChung?.length && "Chưa có tệp"}
                        </td>
                        <td>
                          <div className="nvk-actions">
                            <button
                              className="cd-link-btn"
                              disabled={dangMo || dangTai}
                              onClick={() => moForm(nv.IdNhiemVuKhoa)}
                            >
                              {canSuaNhiemVu(nv)
                                ? "Sửa nhiệm vụ"
                                : "Xem chi tiết"}
                            </button>
                            {canSuaNhiemVu(nv) && (
                              <button
                                className="cd-link-btn nvk-mc-xoa"
                                disabled={dangTai}
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
        </>
      )}
      <NhiemVuKhoaFormModal
        isOpen={!!form}
        nhiemVu={form?.nhiemVu}
        cauHinh={form?.cauHinh}
        giangVien={form?.giangVien}
        idNam={selectedNam}
        idDonVi={form?.idDonVi}
        idNhanVien={user?.IdNhanVien}
        choPhepSua={canKeKhaiNhiemVu(header)}
        onClose={dongForm}
        onSaved={sauKhiLuu}
        onConflict={taiDuLieu}
        onMinhChungChanged={taiDuLieu}
        onError={baoLoi}
        onSuccess={baoThanhCong}
        onXemMinhChung={openPreview}
        onTaiMinhChung={downloadMinhChung}
      />
      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu="pdf"
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
}
