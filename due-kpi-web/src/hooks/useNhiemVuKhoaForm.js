import { useRef, useState } from "react";
import { layCauHinh, layGiangVien, layNhiemVu } from "../utils/nhiemVuKhoaApi";

/** Đọc chi tiết và cờ quyền mới trước khi mở form; huỷ yêu cầu khi đổi phạm vi. */
export function useNhiemVuKhoaForm({ idNam, idDonVi, onError }) {
  const [form, setForm] = useState(null);
  const [dangMo, setDangMo] = useState(false);
  const scope = useRef();
  const currentScope = `${idNam}:${idDonVi}`;
  scope.current = currentScope;
  const request = useRef(0);
  const dongForm = () => {
    request.current += 1;
    setForm(null);
    setDangMo(false);
  };
  const moForm = async (id, donVi = idDonVi) => {
    const seq = ++request.current;
    setDangMo(true);
    try {
      const nhiemVu = id ? await layNhiemVu(id) : null;
      if (id && !nhiemVu) throw new Error("Không tìm thấy nhiệm vụ");
      // Chi tiết đọc chỉ cần snapshot. Picker chỉ cần cho người được sửa.
      const [cauHinh, giangVien] = await Promise.all([
        layCauHinh({ idNam, idDonVi: donVi }),
        !id || nhiemVu?.ChoPhepSua === true
          ? layGiangVien({ idNam, idDonVi: donVi })
          : Promise.resolve(nhiemVu?.PhanCong || []),
      ]);
      if (scope.current === currentScope && seq === request.current)
        setForm({
          nhiemVu,
          cauHinh,
          giangVien,
          idDonVi: donVi,
          scope: currentScope,
        });
    } catch (error) {
      if (scope.current === currentScope && seq === request.current)
        onError(error.message);
    } finally {
      if (seq === request.current) setDangMo(false);
    }
  };
  return {
    form: form?.scope === currentScope ? form : null,
    moForm,
    dongForm,
    dangMo,
  };
}
