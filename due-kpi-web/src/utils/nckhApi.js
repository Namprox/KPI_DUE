/**
 * Dữ liệu NCKH đồng bộ từ hệ thống nghiên cứu khoa học — lớp đọc dùng chung.
 *
 * Toàn bộ endpoint /api/nckh/* là CHỈ ĐỌC: dữ liệu do sp_nckh_dong_bo kéo về
 * theo năm và ánh xạ sang nhân viên KPI qua email (nhan_vien.science_user_id).
 * Vì vậy màn hình cá nhân không có thao tác sửa/xóa, chỉ chọn năm và xem.
 *
 * Hai loại số liệu KHÔNG được trộn lẫn:
 *  - Bảng chi tiết (bài báo / đề tài / sách / kê khai khác) mặc định là TÍCH LŨY
 *    TOÀN THỜI GIAN; phải truyền id_nam mới cắt về đúng khoảng của năm đánh giá.
 *  - `TongHop` là snapshot 11 cờ boolean ĐÃ TÍNH SẴN THEO NĂM — đây mới là thứ
 *    engine dùng để chấm các tiêu chí NCKH tự động, nên đừng tự suy lại cờ từ
 *    bảng chi tiết ở client: quy tắc (Q1/Q2, cấp đề tài, vai trò trong sách)
 *    nằm ở server và có thể đổi mà không đổi shape dữ liệu.
 */

import { apiFetch } from './api';
import { readApiError } from './apiError';

/**
 * Các endpoint danh sách đều phân trang (mặc định 20/trang). Một giảng viên
 * trong MỘT năm không thể có tới ngần này công trình, nên lấy một trang rộng là
 * đủ cho màn hình cá nhân và tránh phải dựng bộ phân trang cho bảng vài dòng.
 */
export const KICH_THUOC_TRANG = 200;

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') qs.append(key, value);
  });
  const chuoi = qs.toString();
  return chuoi ? `?${chuoi}` : '';
};

const nemLoi = async (response, fallback) => {
  const info = await readApiError(response, fallback);
  const error = new Error(info.message);
  error.status = response.status;
  return error;
};

/**
 * Hồ sơ + tổng hợp năm của một giảng viên.
 *
 * Trả `null` khi server đáp 404: theo tài liệu, đó là "chưa liên kết NCKH hoặc
 * chưa đồng bộ" — một trạng thái nghiệp vụ bình thường, không phải lỗi tải
 * trang, nên bên gọi hiển thị lời nhắc thay vì báo đỏ.
 *
 * @param {{idNhanVien: number|string, idNam?: number|string}} params
 */
export const fetchChiTietNckh = async ({ idNhanVien, idNam }) => {
  const response = await apiFetch(
    `nckh/giang-vien/${idNhanVien}${buildQuery({ id_nam: idNam })}`,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw await nemLoi(response, 'Không tải được tổng hợp NCKH');
  }

  return response.json();
};

const taiDanhSach = async (duongDan, moTa, { idNhanVien, idNam }) => {
  const response = await apiFetch(
    `nckh/${duongDan}${buildQuery({
      id_nhan_vien: idNhanVien,
      id_nam: idNam,
      page: 1,
      page_size: KICH_THUOC_TRANG,
    })}`,
  );

  if (!response.ok) {
    throw await nemLoi(response, `Không tải được danh sách ${moTa}`);
  }

  const result = await response.json();
  const items = result.Items || [];
  // TotalCount là số bản ghi THẬT của bộ lọc; items có thể bị cắt bởi page_size.
  return { items, tongSo: result.TotalCount ?? items.length };
};

export const fetchBaiBao = (params) => taiDanhSach('bai-bao', 'bài báo', params);
export const fetchDeTai = (params) => taiDanhSach('de-tai', 'đề tài / dự án', params);
export const fetchSach = (params) => taiDanhSach('sach', 'sách', params);
export const fetchKeKhaiKhac = (params) =>
  taiDanhSach('ke-khai-khac', 'kê khai khác', params);

/**
 * 11 cờ của `nckh_tong_hop`, gom theo đúng nhóm tiêu chí KPI để người xem hiểu
 * mốc nào thuộc phần nào của phiếu. Thứ tự trong nhóm đi từ mốc "nặng" xuống
 * mốc "nhẹ" — trùng thứ tự cột trong bảng tổng hợp của quản trị.
 *
 * `soCot` là số cột MẶC ĐỊNH của lưới chip (màn hình hẹp vẫn co lại theo media
 * query): nhóm sách 6 mốc chia 3 cột thành 2 dòng cân đối, nhóm công bố chỉ 2
 * mốc nên để 2 cột cho chip đủ rộng, khỏi xuống dòng giữa chừng.
 */
export const NHOM_MOC_NCKH = [
  {
    tenNhom: 'Công bố khoa học',
    soCot: 2,
    danhSach: [
      { key: 'CoBaiWosScopusQ1Q2', nhan: 'Bài báo WoS/Scopus thuộc Q1/Q2' },
      { key: 'CoBaiWosScopus', nhan: 'Bài báo WoS/Scopus' },
    ],
  },
  {
    tenNhom: 'Sách & giáo trình',
    soCot: 3,
    danhSach: [
      { key: 'ChuBienSachChuyenKhao', nhan: 'Chủ biên sách chuyên khảo' },
      { key: 'ThanhVienSachChuyenKhao', nhan: 'Thành viên sách chuyên khảo' },
      { key: 'ChuBienSachThamKhao', nhan: 'Chủ biên sách tham khảo' },
      { key: 'ThanhVienSachThamKhao', nhan: 'Thành viên sách tham khảo' },
      { key: 'ChuBienSachGiaoTrinh', nhan: 'Chủ biên giáo trình' },
      { key: 'ThanhVienSachGiaoTrinh', nhan: 'Thành viên giáo trình' },
    ],
  },
  {
    tenNhom: 'Đề tài / dự án',
    soCot: 3,
    danhSach: [
      { key: 'ChuNhiemDeTaiNhaNuoc', nhan: 'Chủ nhiệm đề tài cấp Nhà nước' },
      { key: 'ChuNhiemDeTaiBoTinh', nhan: 'Chủ nhiệm đề tài cấp Bộ/Tỉnh' },
      { key: 'DeTaiCapCoSo', nhan: 'Đề tài cấp cơ sở (Tỉnh/Trường)' },
    ],
  },
];

/** Số mốc đã đạt trong snapshot năm — 0 nghĩa là chưa cờ nào bật. */
export const demMocDat = (tongHop) =>
  NHOM_MOC_NCKH.reduce(
    (tong, nhom) => tong + nhom.danhSach.filter((moc) => !!tongHop?.[moc.key]).length,
    0,
  );

/**
 * Trạng thái do hệ NCKH trả về là chuỗi tự do (không phải enum), nên chỉ dò từ
 * khóa để chọn màu; chữ hiển thị luôn giữ nguyên bản gốc.
 */
export const kieuTrangThai = (trangThai) => {
  const text = String(trangThai || '').toLowerCase();
  if (!text) return 'khac';
  if (text.includes('từ chối') || text.includes('không duyệt')) return 'tuChoi';
  if (text.includes('chờ') || text.includes('chưa')) return 'cho';
  if (text.includes('duyệt') || text.includes('hoàn thành')) return 'duyet';
  return 'khac';
};
