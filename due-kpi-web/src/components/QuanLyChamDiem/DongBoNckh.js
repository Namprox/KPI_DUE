import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../Common/SearchSelect";
import { useAuth } from "../../context/AuthContext";
import { canSyncNckh } from "../../utils/roles";
import { dongBoNckh, dongBoGioNckh, dongBoBaiBaoQuocTe } from "../../utils/nckhApi";
import { dongBoSangKien } from "../../utils/sangKienApi";
import { Icon, so } from "./TongQuanUi";
import "../../css/CaNhan/DongBoNckh.css";

const CAC_MUC = [
  {
    ten: "Hồ sơ và thành tích NCKH",
    phamVi: (nam) => `Cập nhật hồ sơ; đồng bộ bài báo, đề tài, sách, kê khai khác, phân loại và tổng hợp năm ${nam}.`,
    chay: dongBoNckh,
    thongKe: [["Hồ sơ", "HoSoCount"], ["Bài báo", "BaiBaoCount"], ["Đề tài", "DeTaiCount"], ["Sách", "SachCount"], ["Kê khai khác", "KeKhaiKhacCount"], ["Tổng hợp", "TongHopCount"]],
  },
  {
    ten: "Giờ NCKH",
    phamVi: () => "Ghi đè toàn bộ dữ liệu giờ NCKH của mọi năm từ hệ thống NCKH.",
    chay: dongBoGioNckh,
    thongKe: [["Số dòng giờ NCKH", "GioNckhCount"]],
  },
  {
    ten: "KPI bài báo quốc tế",
    phamVi: (nam) => `Ghi đè dữ liệu bài báo quốc tế của năm ${nam}.`,
    chay: dongBoBaiBaoQuocTe,
    thongKe: [["Số dòng bài báo quốc tế", "BaiBaoQuocTeCount"]],
  },
  {
    ten: "Sáng kiến và tác giả",
    phamVi: () => "Cập nhật sáng kiến và tác giả của mọi năm; đánh dấu sáng kiến không còn ở nguồn.",
    chay: dongBoSangKien,
    thongKe: [["Sáng kiến", "SoSangKien"], ["Mới", "SoMoi"], ["Đã có", "SoDaCo"], ["Không còn ở nguồn", "SoKhongConONguon"], ["Tác giả", "SoTacGia"]],
  },
];

const NHAN_TRANG_THAI = {
  cho: "Chờ đồng bộ",
  dangChay: "Đang đồng bộ...",
  thanhCong: "Thành công",
  loi: "Thất bại",
  boQua: "Chưa chạy",
};

export default function DongBoNckh({ idNam, namList, dangTaiNam }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [nam, setNam] = useState("");
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const locked = useRef(false);
  const owner = useRef(null);
  const currentUser = useRef(user);
  currentUser.current = user;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  if (!canSyncNckh(user)) return null;

  const validYear = namList.some((item) => String(item.IdNam) === String(nam));
  const openDialog = () => {
    if (locked.current) return;
    owner.current = user;
    setNam(String(idNam || ""));
    setResults([]);
    setOpen(true);
  };
  const closeDialog = () => { if (!locked.current) setOpen(false); };
  const synchronize = async () => {
    if (locked.current || !validYear || results.length > 0 || !canSyncNckh(user)) return;
    const actor = user;
    const stillCurrent = () => mounted.current && currentUser.current === actor;
    locked.current = true;
    setRunning(true);
    const updated = CAC_MUC.map(() => ({ status: "cho" }));
    setResults([...updated]);
    try {
      for (let index = 0; index < CAC_MUC.length; index += 1) {
        if (!stillCurrent()) break;
        updated[index] = { status: "dangChay" };
        setResults([...updated]);
        try {
          const data = await CAC_MUC[index].chay(nam);
          updated[index] = { status: "thanhCong", data };
        } catch (error) {
          updated[index] = { status: "loi", message: error.message || "Không kết nối được máy chủ." };
          // Mất quyền: dừng các yêu cầu ghi tiếp theo, giữ kết quả đã hoàn tất.
          if (error.status === 401 || error.status === 403) {
            for (let remaining = index + 1; remaining < CAC_MUC.length; remaining += 1) {
              updated[remaining] = { status: "boQua" };
            }
            if (stillCurrent()) setResults([...updated]);
            break;
          }
        }
        if (!stillCurrent()) break;
        setResults([...updated]);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setRunning(false);
    }
  };

  const successCount = results.filter((result) => result.status === "thanhCong").length;
  const finished = results.length > 0 && !running;

  return <>
    <button type="button" className="db-btn nckh-sync-trigger" onClick={openDialog} disabled={dangTaiNam || !idNam || namList.length === 0 || running}>
      <Icon ten="lamMoi" className={running ? "db-spin" : undefined} />
      {running ? "Đang đồng bộ NCKH..." : "Đồng bộ dữ liệu NCKH"}
    </button>
    {open && owner.current === user && <Dialog visible modal header="Xác nhận đồng bộ dữ liệu NCKH" onHide={closeDialog}
      closable={!running} closeOnEscape={!running} draggable={false} className="nckh-sync-dialog" maskClassName="nckh-sync-mask"
      style={{ width: "680px" }} breakpoints={{ "720px": "95vw" }}
      footer={<>
        <button type="button" className="btn-cancel" disabled={running} onClick={closeDialog}>{finished ? "Đóng" : "Hủy"}</button>
        {!finished && <button type="button" className="btn-submit" disabled={running || !validYear} onClick={synchronize}>
          {running ? "Đang đồng bộ..." : "Xác nhận đồng bộ"}
        </button>}
      </>}>
      <div className="nckh-sync-content">
        <label className="nckh-sync-year">Năm đánh giá
          <SearchSelect ariaLabel="Năm đồng bộ NCKH" value={nam} onChange={setNam} disabled={running || results.length > 0}
            options={namList.map((item) => ({ value: String(item.IdNam), label: String(item.IdNam) }))} />
        </label>
        <p>Đồng bộ 4 nhóm dữ liệu từ hệ thống NCKH vào KPI. Năm đã chọn chỉ áp dụng cho thành tích NCKH và KPI bài báo quốc tế.</p>
        <p className="nckh-sync-warning"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Giờ NCKH ghi đè dữ liệu của mọi năm; sáng kiến cũng được cập nhật cho mọi năm.</p>
        <ol className="nckh-sync-list">
          {CAC_MUC.map((item, index) => {
            const result = results[index];
            return <li key={item.ten}>
              <div className="nckh-sync-item-title"><strong>{item.ten}</strong>
                {result && <span className={`nckh-sync-status is-${result.status}`}>{NHAN_TRANG_THAI[result.status]}</span>}
              </div>
              <p>{item.phamVi(nam || "đã chọn")}</p>
              {result?.data && <p className="nckh-sync-counts">{item.thongKe.filter(([, key]) => result.data[key] != null)
                .map(([label, key]) => `${label}: ${so(result.data[key])}`).join(" · ")}</p>}
              {result?.message && <p role="alert" className="nckh-sync-error">{result.message}</p>}
            </li>;
          })}
        </ol>
        {running && <p role="status">Đang đồng bộ lần lượt từng nhóm dữ liệu. Vui lòng chờ kết quả.</p>}
        {finished && <p role={successCount === 4 ? "status" : "alert"} className={successCount === 4 ? "" : "nckh-sync-error"}>
          {successCount === 4 ? "Đồng bộ thành công cả 4 nhóm dữ liệu." : `Đã đồng bộ thành công ${successCount}/4 nhóm dữ liệu. Xem kết quả từng mục ở trên.`}
        </p>}
        <p className="nckh-sync-note">Đồng bộ không tự chấm lại phiếu đã nộp.</p>
      </div>
    </Dialog>}
  </>;
}
