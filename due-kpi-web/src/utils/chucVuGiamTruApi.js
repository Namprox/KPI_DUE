import { apiFetch } from './api';

export const GIAM_TRU_CHUC_VU_PATH = '/giam-tru-chuc-vu-theo-nam';
export const LOAI_GIAM_TRU = { TY_LE: 'dinh_muc_phan_tram', GIO: 'gio_chuan_co_dinh' };

// These endpoints share PascalCase envelopes; authorization filters use lowercase message.
export async function requestDanhMuc(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options);
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok || result.Success === false || (result.status && result.status !== 'success')) {
    const error = Object.assign(new Error(result.Message || result.message ||
      (response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : 'Không thể thực hiện thao tác. Vui lòng thử lại.')), { status: response.status });
    throw error;
  }
  return result;
}

/** @returns {Promise<import('./chucVuGiamTruTypes').ChucVuGiamTru[]>} */
export async function fetchGiamTruChucVu(idNam, options) {
  const result = await requestDanhMuc(`chucvu/giam-tru?idNam=${encodeURIComponent(idNam)}`, options);
  return result.Items || [];
}

export async function saveGiamTruChucVu(idChucVu, idNam, payload) {
  const result = await requestDanhMuc(`chucvu/${idChucVu}/giam-tru/${idNam}`, {
    method: 'PUT', body: JSON.stringify(payload),
  });
  return result.Item;
}

export function giamTruPayload(form) {
  const note = (form.GhiChuDieuKien || '').trim();
  if (note.length > 500) throw new Error('Ghi chú điều kiện tối đa 500 ký tự.');
  const payload = { LoaiGiamTru: form.LoaiGiamTru, TyLeDinhMucGiang: null, GioGiamTruNam: null, GhiChuDieuKien: note || null };
  if (form.LoaiGiamTru === LOAI_GIAM_TRU.TY_LE) {
    const percent = form.TyLePhanTram === '' ? null : Number(form.TyLePhanTram);
    if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) throw new Error('Tỷ lệ còn phải thực hiện phải từ 0 đến 100%.');
    payload.TyLeDinhMucGiang = percent === null ? null : percent / 100;
  } else if (form.LoaiGiamTru === LOAI_GIAM_TRU.GIO) {
    const hours = Number(form.GioGiamTruNam);
    if (form.GioGiamTruNam === '' || form.GioGiamTruNam == null || !Number.isFinite(hours) || hours < 0 || hours > 9999.99) throw new Error('Số giờ giảm trừ phải từ 0 đến 9999,99 giờ.');
    payload.GioGiamTruNam = hours;
  } else throw new Error('Vui lòng chọn loại giảm trừ.');
  return payload;
}

export function nguonGiamTru(item) {
  if (!item.DaCauHinh) return 'Chưa cấu hình';
  if (item.LaKeThua) return `Kế thừa từ năm ${item.IdNamNguon}`;
  if (item.SaoChepTuNam != null) return `Chốt khi đóng năm (từ ${item.SaoChepTuNam})`;
  return `Cấu hình riêng năm ${item.IdNam}`;
}

const so = (value) => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
export function hienThiGiamTru(item) {
  if (item.LoaiGiamTru === LOAI_GIAM_TRU.GIO) return item.GioGiamTruNam == null ? '—' : `−${so(item.GioGiamTruNam)} giờ`;
  if (item.LoaiGiamTru === LOAI_GIAM_TRU.TY_LE) return `${so((item.TyLeDinhMucGiang ?? 1) * 100)}% còn phải thực hiện`;
  return item.IdChucVu ? 'Chưa cấu hình' : '—';
}
