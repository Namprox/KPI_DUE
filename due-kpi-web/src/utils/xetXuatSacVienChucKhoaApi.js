import { apiFetch } from "./api";
import { readApiError } from "./apiError";

const readResponse = async (response) => {
  if (!response.ok) {
    const info = await readApiError(response, "Không thực hiện được xét xuất sắc cấp Trường.");
    throw Object.assign(new Error(info.rawMessage || info.message), {
      status: response.status,
      errorCode: info.errorCode,
      hoSoChuaDuyet: info.hoSoChuaDuyet,
      hoSoKhongHopLe: info.hoSoKhongHopLe,
    });
  }
  return response.json();
};

export const fetchXetXuatSacVienChucKhoa = async (idNam) =>
  readResponse(await apiFetch(`xet-xuat-sac-vien-chuc-khoa?${new URLSearchParams({ idNam })}`));

export const chotXetXuatSacVienChucKhoa = async ({ idNam, idPhieuList, ghiChu, rowVersion }) => {
  // Không mặc định thành []: thiếu danh sách không được làm mất lựa chọn cũ.
  if (!Array.isArray(idPhieuList)) throw new Error("Phải cung cấp đầy đủ danh sách được chọn.");
  return readResponse(await apiFetch("xet-xuat-sac-vien-chuc-khoa/chot", {
    method: "POST",
    body: JSON.stringify({
      IdNam: Number(idNam),
      IdPhieuList: idPhieuList,
      ...(ghiChu ? { GhiChu: ghiChu } : {}),
      ...(rowVersion ? { RowVersion: rowVersion } : {}),
    }),
  }));
};
