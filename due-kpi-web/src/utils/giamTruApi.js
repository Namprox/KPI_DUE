import { apiFetch } from "./api";

export const importGiamTru = async ({ file, idNam, capNhatNhanVien }) => {
  const form = new FormData();
  form.append("file", file);
  form.append("idNam", String(idNam));
  form.append("capNhatNhanVien", String(capNhatNhanVien));
  const response = await apiFetch("giam-tru/import", { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.Success !== true) {
    const error = new Error(body.Message || "Không thể upload mẫu giảm trừ. Vui lòng thử lại.");
    error.result = body;
    throw error;
  }
  return body;
};
