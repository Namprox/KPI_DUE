import { useCallback, useEffect, useState } from "react";
import { fetchDanhSachChuaLapPhieu, tinhChuaTuCham } from "../utils/chuaLapPhieu";
import { fetchPhieuListDayDu } from "../utils/phieuApi";

/**
 * Những người trong phạm vi đơn vị chưa tự chấm KPI xong.
 *
 * Báo cáo backend xác định người chưa lập và quyền đọc danh sách. idDonViLoc
 * thu hẹp về đúng đơn vị được chọn, khớp bộ lọc danh sách phiếu.
 *
 * Trả về hai rổ riêng: `chuaLapPhieu` (không có dòng phiếu nào) và `phieuNhap`
 * (đã lưu nhưng chưa nộp). Màn hình nào cần gộp thì dùng `tatCa`.
 */
export const useChuaTuCham = ({
  idNam,
  idDonViGoc,
  idDonViLoc,
  bat = true,
} = {}) => {
  const [ketQua, setKetQua] = useState({
    chuaLapPhieu: [],
    phieuNhap: [],
    tatCa: [],
  });
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");

  const idDonVi = idDonViLoc || idDonViGoc;

  const tai = useCallback(async () => {
    if (!bat || !idNam) {
      setKetQua({ chuaLapPhieu: [], phieuNhap: [], tatCa: [] });
      return;
    }
    setDangTai(true);
    setLoi("");
    try {
      const [chuaLapList, phieuList] = await Promise.all([
        fetchDanhSachChuaLapPhieu({ idNam, idDonVi, idDonViLoc }),
        // KHÔNG lọc trạng thái / khoảng ngày ở đây dù màn hình gọi có lọc: chỉ cần
        // một phiếu bị bộ lọc gạt ra là chủ phiếu đó bị kết luận nhầm "chưa lập".
        fetchPhieuListDayDu({ idNam, idDonVi: idDonViLoc || undefined }),
      ]);
      setKetQua(tinhChuaTuCham({ chuaLapList, phieuList }));
    } catch (error) {
      console.error("Không đối chiếu được danh sách chưa tự chấm:", error);
      setLoi(
        error?.message || "Không đối chiếu được danh sách người chưa tự chấm",
      );
      setKetQua({ chuaLapPhieu: [], phieuNhap: [], tatCa: [] });
    } finally {
      setDangTai(false);
    }
  }, [bat, idNam, idDonVi, idDonViLoc]);

  useEffect(() => {
    tai();
  }, [tai]);

  return { ...ketQua, dangTai, loi, taiLai: tai };
};

export default useChuaTuCham;
