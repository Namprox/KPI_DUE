/**
 * Phản hồi sinh viên — lớp ĐỌC cho màn hình cá nhân của giảng viên.
 *
 * Toàn bộ số liệu lấy từ GET /phanhoisinhvien/cua-toi: server tổng hợp sẵn, không
 * phân trang, và suy `ma_can_bo` TỪ TOKEN chứ không nhận qua query. Nhờ vậy màn
 * hình không cần kiểm tra vai trò — ai gọi cũng chỉ thấy dữ liệu của chính mình.
 *
 * ⚠️ Đừng quay lại GET /phanhoisinhvien (dòng thô) cho màn hình này. Endpoint đó
 * nhận `maCanBo` từ query nên xem được dữ liệu của người khác, lại phân trang 200
 * dòng/lần buộc client phải tự cộng trung bình. Nó dành cho màn hình quản trị.
 *
 * Hai quy ước của server mà giao diện phải tôn trọng, nếu không sẽ hiển thị sai:
 *  - `BoLoc` luôn tính trên CẢ NĂM, cố tình bỏ qua kyHoc/maHocPhan — để chọn một
 *    học phần xong dropdown không tự thu lại còn đúng nó.
 *  - `DiemChot` luôn là số CẢ NĂM, không theo bộ lọc. Chỉ được đem so với điểm
 *    tổng khi màn hình cũng đang xem cả năm.
 */

import { apiFetch } from './api';
import { readApiError } from './apiError';

/** Số câu hỏi của phiếu khảo sát (trường CauHoi nhận 1..12). */
export const SO_CAU_HOI = 12;

/** Nhãn kỳ học từ mã 3 chữ số: 261 → "Học kỳ 1". Chữ số cuối 3 là kỳ hè. */
export const tenKyHoc = (kyHoc) => {
  const ky = Number(kyHoc) % 10;
  if (ky === 3) return 'Học kỳ hè';
  if (ky === 1 || ky === 2) return `Học kỳ ${ky}`;
  return `Kỳ ${kyHoc ?? '—'}`;
};

/**
 * Số hoặc null — KHÔNG quy null về 0.
 * 0 là một điểm hợp lệ trên thang 1..5, chỉ null mới nói được "chưa có dữ liệu".
 */
const soHoacNull = (giaTri) => {
  if (giaTri === null || giaTri === undefined) return null;
  const so = Number(giaTri);
  return Number.isFinite(so) ? so : null;
};

const soNguyen = (giaTri) => Number(giaTri) || 0;

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const getJson = async (endpoint, fallback) => {
  const response = await apiFetch(endpoint);
  if (!response.ok) {
    const info = await readApiError(response, fallback);
    const error = new Error(info.message);
    error.status = response.status;
    error.errorCode = info.errorCode;
    return Promise.reject(error);
  }
  return response.json();
};

/** Mảng PhanBo (5 phần tử Muc/SoLuot) → object khóa 1..5, bù 0 cho mức thiếu. */
const chuanHoaPhanBo = (phanBo) => {
  const ket = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (phanBo || []).forEach((muc) => {
    const so = Number(muc?.Muc);
    if (ket[so] !== undefined) ket[so] = soNguyen(muc?.SoLuot);
  });
  return ket;
};

/**
 * Đưa DTO PascalCase về shape camelCase mà màn hình dùng, đồng thời bảo đảm mọi
 * mảng đều tồn tại. Server hứa trả đủ, nhưng chuẩn hóa ở một chỗ rẻ hơn nhiều so
 * với rải `?.` và `|| []` khắp phần render.
 */
const chuanHoa = (data) => ({
  idNam: data?.IdNam ?? null,
  maCanBo: data?.MaCanBo || '',

  tomTat: {
    diemTb: soHoacNull(data?.TomTat?.DiemTrungBinh),
    soLuot: soNguyen(data?.TomTat?.SoLuotTraLoi),
    soSinhVien: soNguyen(data?.TomTat?.SoSinhVien),
    soHocPhan: soNguyen(data?.TomTat?.SoHocPhan),
    phanBo: chuanHoaPhanBo(data?.TomTat?.PhanBo),
  },

  theoHocPhan: (data?.TheoHocPhan || []).map((hp) => ({
    maHocPhan: hp?.MaHocPhan || '',
    khoaQuanLy: hp?.KhoaQuanLyHp || '',
    diemTb: soHoacNull(hp?.DiemTrungBinh),
    soLuot: soNguyen(hp?.SoLuotTraLoi),
    soSinhVien: soNguyen(hp?.SoSinhVien),
  })),

  theoCauHoi: (data?.TheoCauHoi || []).map((ch) => ({
    cauHoi: soNguyen(ch?.CauHoi),
    diemTb: soHoacNull(ch?.DiemTrungBinh),
    soLuot: soNguyen(ch?.SoLuotTraLoi),
  })),

  theoKyHoc: (data?.TheoKyHoc || []).map((ky) => ({
    kyHoc: soNguyen(ky?.KyHoc),
    diemTb: soHoacNull(ky?.DiemTrungBinh),
    soLuot: soNguyen(ky?.SoLuotTraLoi),
    soSinhVien: soNguyen(ky?.SoSinhVien),
  })),

  boLoc: {
    kyHoc: (data?.BoLoc?.KyHoc || []).map(Number).filter(Number.isFinite),
    hocPhan: (data?.BoLoc?.HocPhan || []).filter(Boolean).map(String),
  },

  // null khi năm chưa chốt hoặc mã cán bộ không khớp lúc chốt — đó là trạng thái
  // bình thường, màn hình chỉ ẩn khối điểm chốt chứ không báo lỗi.
  diemChot: data?.DiemChot
    ? {
        diemTb: soHoacNull(data.DiemChot.DiemTrungBinh),
        soLuot: soNguyen(data.DiemChot.SoLuotDanhGia),
        ngayChot: data.DiemChot.NgayChot || null,
        nguoiChot: data.DiemChot.NguoiChotHoTen || '',
      }
    : null,
});

/**
 * Kết quả khảo sát của chính người đang đăng nhập.
 *
 * @param {{idNam: number|string, kyHoc?: number|string, maHocPhan?: string}} params
 *   kyHoc/maHocPhan để trống = xem cả năm. Lọc do SERVER làm, nên đổi bộ lọc là
 *   phải gọi lại — đừng lọc lại trên dữ liệu đã trả về.
 */
export const fetchPhanHoiCuaToi = async ({ idNam, kyHoc, maHocPhan } = {}) => {
  if (!idNam) return null;
  const data = await getJson(
    `phanhoisinhvien/cua-toi${buildQuery({ idNam, kyHoc, maHocPhan })}`,
    'Không tải được phản hồi sinh viên',
  );
  return chuanHoa(data);
};

/**
 * Màu theo mức điểm 1..5, dùng chung cho thanh và nhãn.
 * Ngưỡng bám thang Likert: ≥4 tốt, ≥3 trung bình, dưới 3 cần lưu ý.
 */
export const mauTheoDiem = (diem) => {
  if (diem == null) return { nen: '#e2e8f0', chu: '#64748b' };
  if (diem >= 4) return { nen: '#10b981', chu: '#047857' };
  if (diem >= 3) return { nen: '#f59e0b', chu: '#b45309' };
  return { nen: '#ef4444', chu: '#b91c1c' };
};

/** Phần trăm chiều rộng thanh cho điểm trên thang 1..5. */
export const phanTramDiem = (diem) => {
  if (diem == null) return 0;
  return Math.max(0, Math.min(100, (diem / 5) * 100));
};
