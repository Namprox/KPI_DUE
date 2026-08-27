import { useCallback, useEffect, useState } from "react";
import { fetchNhanVienPhaiNopKpi, tinhChuaTuCham } from "../utils/chuaLapPhieu";
import { fetchPhieuListDayDu } from "../utils/phieuApi";

/**
 * Những người trong phạm vi đơn vị chưa tự chấm KPI xong.
 *
 * Hai tham số đơn vị KHÔNG thay thế được cho nhau:
 *  - `idDonViGoc` là đơn vị của người đăng nhập. Nó quyết định phạm vi mặc định:
 *    GET /phieu ở cấp Khoa tự trả đơn vị mình + đơn vị con, nên danh bạ đối chiếu
 *    cũng phải lấy cả cây (baoGomDonViCon), nếu không người ở Bộ môn sẽ bị coi là
 *    "chưa lập phiếu" oan.
 *  - `idDonViLoc` là đơn vị người dùng chọn trên thanh lọc. Bộ lọc idDonVi của
 *    GET /phieu khớp CHÍNH XÁC một đơn vị, nên khi có nó thì danh bạ cũng phải
 *    thu về đúng đơn vị đó - lấy kèm đơn vị con sẽ lệch hai đầu.
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
    if (!bat || !idNam || !idDonVi) {
      setKetQua({ chuaLapPhieu: [], phieuNhap: [], tatCa: [] });
      return;
    }
    setDangTai(true);
    setLoi("");
    try {
      const [nhanVienList, phieuList] = await Promise.all([
        fetchNhanVienPhaiNopKpi({ idDonVi, baoGomDonViCon: !idDonViLoc }),
        // KHÔNG lọc trạng thái / khoảng ngày ở đây dù màn hình gọi có lọc: chỉ cần
        // một phiếu bị bộ lọc gạt ra là chủ phiếu đó bị kết luận nhầm "chưa lập".
        fetchPhieuListDayDu({ idNam, idDonVi: idDonViLoc || undefined }),
      ]);
      setKetQua(tinhChuaTuCham({ nhanVienList, phieuList }));
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
