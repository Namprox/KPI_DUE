import { useEffect, useMemo, useState } from "react";
import { fetchDiemTuDongPhieu } from "../utils/phieuTuDongApi";
import { ghepDiemTuDongPhieu } from "../utils/diemTuDongPhieu";

export const useDiemTuDongPhieu = (phieu) => {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!phieu?.IdPhieu) { setResult(null); return undefined; }
    setResult({ phieu, loading: true });
    fetchDiemTuDongPhieu(phieu.IdPhieu, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ phieu, data }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ phieu, error }); });
    return () => controller.abort();
  }, [phieu]);

  // Không để phản hồi của phiếu/năm/đơn vị trước hiển thị trên phiếu mới.
  const current = result?.phieu === phieu ? result : null;
  const data = current?.data;
  const theoTieuChi = useMemo(() => {
    const rows = phieu?.ChiTiet || phieu?.chiTiet || [];
    const ids = new Set(rows.map((row) => String(row.IdChiTiet)));
    const sources = Object.fromEntries((data?.Items || [])
      .filter((row) => ids.has(String(row.IdChiTiet)))
      .map((row) => [row.IdTieuChi, row]));
    return ghepDiemTuDongPhieu(sources, rows);
  }, [data, phieu]);
  const theoChiTiet = useMemo(() => Object.fromEntries(
    Object.values(theoTieuChi).filter((row) => row.IdChiTiet != null)
      .map((row) => [row.IdChiTiet, row]),
  ), [theoTieuChi]);
  return { data, error: current?.error, loading: !!phieu && (!current || !!current.loading), theoTieuChi, theoChiTiet };
};
