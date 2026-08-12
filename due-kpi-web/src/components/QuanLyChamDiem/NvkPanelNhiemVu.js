import React, { useCallback, useEffect, useState } from "react";
import NhiemVuKhoaFormModal from "./NhiemVuKhoaFormModal";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { formatDiem } from "../../utils/phieuApi";
import {
  layDanhSachNhiemVu,
  layGiangVien,
  layNhiemVu,
  xoaNhiemVu,
} from "../../utils/nhiemVuKhoaApi";

/**
 * Tab "Nhiệm vụ" — danh sách nhiệm vụ của kỳ và form nhập.
 *
 * Bộ lọc (nhóm + từ khoá) do trang cha sở hữu vì chúng nằm trên thanh công cụ
 * chung; panel chỉ nhận giá trị đã áp dụng rồi gọi lại API. Server lo việc lọc,
 * không lọc lại trên dữ liệu đã tải.
 */
const NvkPanelNhiemVu = ({
  idNam,
  idDonVi,
  cauHinh,
  choPhepSua,
  nhomLoc,
  tuKhoa,
  yeuCauForm,
  onYeuCauXong,
  onLamMoiKy,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
  onSuccess,
}) => {
  const { confirmDeleteDialog } = useConfirmDeleteDialog();

  const [danhSach, setDanhSach] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [giangVien, setGiangVien] = useState([]);

  const [formMo, setFormMo] = useState(false);
  const [nhiemVuDangSua, setNhiemVuDangSua] = useState(null);
  const [nhomGoiY, setNhomGoiY] = useState("");

  const sanSang = !!idNam && !!idDonVi;

  const tai = useCallback(async () => {
    if (!sanSang) return;
    setDangTai(true);
    try {
      setDanhSach(
        await layDanhSachNhiemVu({
          idNam,
          idDonVi,
          idNhomNv: nhomLoc || undefined,
          tuKhoa: tuKhoa || undefined,
        }),
      );
    } catch (error) {
      console.error("Lỗi tải danh sách nhiệm vụ:", error);
      onError(error.message);
      setDanhSach([]);
    }
    setDangTai(false);
  }, [sanSang, idNam, idDonVi, nhomLoc, tuKhoa, onError]);

  useEffect(() => {
    tai();
  }, [tai]);

  // Đổi năm hoặc Khoa là đổi hẳn tập giảng viên kèm tổng điểm — bỏ cache cũ,
  // nếu không ô chọn người sẽ hiện điểm của năm trước.
  useEffect(() => {
    setGiangVien([]);
  }, [idNam, idDonVi]);

  /**
   * Danh sách giảng viên kèm tổng điểm — nạp MỘT lần rồi cache.
   * Endpoint đã LEFT JOIN sẵn bảng tổng hợp nên một truy vấn đủ cho cả form;
   * tuyệt đối không gọi cho từng dòng phân công.
   */
  const damBaoGiangVien = useCallback(async () => {
    if (giangVien.length > 0) return;
    try {
      setGiangVien(await layGiangVien({ idNam, idDonVi }));
    } catch (error) {
      console.error("Lỗi tải danh sách giảng viên của Khoa:", error);
      onError(error.message);
    }
  }, [giangVien.length, idNam, idDonVi, onError]);

  const moForm = useCallback(
    async (nhiemVu, idNhomGoiY = "") => {
      await damBaoGiangVien();
      setNhiemVuDangSua(nhiemVu || null);
      setNhomGoiY(idNhomGoiY ? String(idNhomGoiY) : "");
      setFormMo(true);
    },
    [damBaoGiangVien],
  );

  const dongForm = () => {
    setFormMo(false);
    setNhiemVuDangSua(null);
    setNhomGoiY("");
  };

  /** Yêu cầu mở form đến từ tab Phản hồi (bấm vào một vấn đề cụ thể). */
  useEffect(() => {
    if (!yeuCauForm) return;
    let huy = false;

    const chay = async () => {
      try {
        if (yeuCauForm.idNhiemVuKhoa) {
          const cache = danhSach.find(
            (x) => x.IdNhiemVuKhoa === yeuCauForm.idNhiemVuKhoa,
          );
          const nv = cache || (await layNhiemVu(yeuCauForm.idNhiemVuKhoa));
          if (!huy) await moForm(nv);
        } else {
          if (!huy) await moForm(null, yeuCauForm.idNhomNv);
        }
      } catch (error) {
        console.error("Lỗi mở nhiệm vụ từ phản hồi:", error);
        onError(error.message);
      } finally {
        if (!huy) onYeuCauXong();
      }
    };

    chay();
    return () => {
      huy = true;
    };
    // Chỉ chạy khi có yêu cầu mới; danhSach chỉ dùng làm cache tra nhanh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yeuCauForm]);

  const sauKhiLuu = async (item) => {
    if (item) {
      setDanhSach((prev) => {
        const co = prev.some((x) => x.IdNhiemVuKhoa === item.IdNhiemVuKhoa);
        return co
          ? prev.map((x) =>
              x.IdNhiemVuKhoa === item.IdNhiemVuKhoa ? item : x,
            )
          : [item, ...prev];
      });
    }
    dongForm();
    // Tổng điểm của những người vừa được gán đã đổi → bỏ cache giảng viên
    setGiangVien([]);
    onLamMoiKy();
  };

  /**
   * Minh chứng upload/gỡ ngay tại chỗ, không đi qua nút Lưu — nên phải đồng bộ
   * ngược về dòng trong bảng, nếu không cột đếm tệp sẽ lệch khi đóng form.
   */
  const capNhatMinhChungCuaDong = (idNhiemVuKhoa, minhChung) => {
    setDanhSach((prev) =>
      prev.map((x) =>
        x.IdNhiemVuKhoa === idNhiemVuKhoa ? { ...x, MinhChung: minhChung } : x,
      ),
    );
  };

  const xoa = (nv) => {
    confirmDeleteDialog({
      header: "Xoá nhiệm vụ",
      message: `Xoá "${nv.TenNhiemVu}"? Toàn bộ ${nv.SoPhanCong} dòng phân công của nhiệm vụ này cũng bị gỡ theo.`,
      accept: async () => {
        try {
          await xoaNhiemVu(nv.IdNhiemVuKhoa);
          setDanhSach((prev) =>
            prev.filter((x) => x.IdNhiemVuKhoa !== nv.IdNhiemVuKhoa),
          );
          setGiangVien([]);
          onSuccess("Đã xoá nhiệm vụ");
          onLamMoiKy();
        } catch (error) {
          console.error("Lỗi xoá nhiệm vụ:", error);
          onError(error.message);
        }
      },
    });
  };

  const renderBang = () => {
    if (danhSach.length === 0) {
      return (
        <div className="cd-empty">
          <i className="fa-solid fa-clipboard-list"></i>
          <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
            {nhomLoc || tuKhoa
              ? "Không có nhiệm vụ nào khớp bộ lọc"
              : "Kỳ này chưa có nhiệm vụ nào"}
          </h3>
          <p style={{ margin: 0 }}>
            {nhomLoc || tuKhoa
              ? "Thử xoá từ khoá hoặc chọn lại nhóm “Tất cả”."
              : "Bấm “Thêm nhiệm vụ” để nhập nhiệm vụ đầu tiên của Khoa."}
          </p>
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table className="custom-table nvk-ql-bang">
          <thead>
            <tr>
              <th>Nhiệm vụ</th>
              <th style={{ width: "190px" }}>Nhóm</th>
              <th style={{ width: "340px" }}>Phân công</th>
              <th style={{ width: "110px", textAlign: "center" }}>Minh chứng</th>
              <th style={{ width: "110px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {danhSach.map((nv) => (
              <tr key={nv.IdNhiemVuKhoa}>
                <td>
                  <div className="nvk-ql-ten">{nv.TenNhiemVu}</div>
                  {nv.MoTa && <div className="nvk-ql-mo-ta">{nv.MoTa}</div>}
                </td>
                <td>
                  <span className="tag-badge">{nv.TenNhom}</span>
                </td>
                <td>
                  {(nv.PhanCong || []).length === 0 ? (
                    <span className="cd-chip nvk-chip-canh-bao">
                      <i className="fa-solid fa-user-slash"></i> Chưa phân công
                    </span>
                  ) : (
                    <>
                      {/* Vai trò là thông tin chính của cột này (chủ trì / phối
                          hợp chính / phối hợp quyết định điểm), nên bày thành
                          dòng riêng thay vì giấu trong tooltip của chip. */}
                      <div className="nvk-pc-cell">
                        {nv.PhanCong.map((pc) => (
                          <div key={pc.IdPhanCong} className="nvk-pc-item">
                            <span className="nvk-pc-ten">
                              {pc.LaChuTri && (
                                <i className="fa-solid fa-star"></i>
                              )}
                              {pc.HoTen}
                            </span>
                            <span
                              className={`nvk-pc-vai-tro${pc.LaChuTri ? " nvk-vt-chu-tri" : ""}`}
                            >
                              {pc.TenVaiTroSnapshot}
                            </span>
                            <span className="nvk-pc-diem-o">
                              {formatDiem(pc.DiemSnapshot, 1)}đ
                            </span>
                          </div>
                        ))}
                      </div>
                      {!nv.CoChuTri && (
                        <span className="cd-chip nvk-chip-canh-bao">
                          <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                          Chưa có chủ trì
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {(nv.MinhChung || []).length > 0 ? (
                    <span className="nvk-ql-mc-dem">
                      <i className="fa-solid fa-file-pdf"></i>{" "}
                      {nv.MinhChung.length}
                    </span>
                  ) : (
                    <span className="nvk-trong">—</span>
                  )}
                </td>
                <td>
                  <div className="action-group">
                    <div
                      className="icon-wrapper edit-icon"
                      onClick={() => moForm(nv)}
                      title={choPhepSua ? "Sửa nhiệm vụ" : "Xem chi tiết"}
                    >
                      <i
                        className={`fa-solid ${choPhepSua ? "fa-pen-to-square" : "fa-eye"}`}
                      ></i>
                    </div>
                    {choPhepSua && (
                      <div
                        className="icon-wrapper delete-icon"
                        onClick={() => xoa(nv)}
                        title="Xoá nhiệm vụ"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div
        className="modern-table-card"
        style={{
          opacity: dangTai ? 0.55 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        {renderBang()}
      </div>

      <NhiemVuKhoaFormModal
        isOpen={formMo}
        nhiemVu={nhiemVuDangSua}
        nhomGoiY={nhomGoiY}
        cauHinh={cauHinh}
        giangVien={giangVien}
        idNam={idNam}
        idDonVi={idDonVi}
        choPhepSua={choPhepSua}
        onClose={dongForm}
        onSaved={sauKhiLuu}
        onMinhChungChanged={capNhatMinhChungCuaDong}
        onXemMinhChung={onXemMinhChung}
        onTaiMinhChung={onTaiMinhChung}
        onError={onError}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default NvkPanelNhiemVu;
