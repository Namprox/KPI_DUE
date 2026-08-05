import { useEffect, useState } from 'react';
import { fetchAllNhanVien } from '../utils/nhanVienApi';

/**
 * Tra cứu họ tên / mã / đơn vị của nhân viên theo IdNhanVien.
 *
 * LÝ DO TỒN TẠI: PhieuDanhGiaChiTietDto chỉ trả IdNhanVien và IdDonVi, KHÔNG có
 * HoTen / MaNhanVien / TenDonVi. Mọi màn hình liệt kê phiếu đều phải tự ghép tên
 * từ danh bạ nhân viên, nếu không bảng sẽ chỉ hiện dãy số.
 *
 * Danh bạ đổi rất chậm nên nạp một lần rồi dùng lại cho cả phiên: cache ở cấp
 * module để chuyển qua lại giữa các trang không gọi lại ~10 request phân trang.
 */

let cachedPromise = null;

/** Xóa cache khi dữ liệu nhân viên vừa bị sửa (trang quản lý người dùng gọi). */
export const invalidateNhanVienIndex = () => {
  cachedPromise = null;
};

const loadIndex = () => {
  if (!cachedPromise) {
    cachedPromise = fetchAllNhanVien({ trangThai: null })
      .then((list) => {
        const map = new Map();
        list.forEach((nv) => {
          if (nv?.IdNhanVien != null) map.set(Number(nv.IdNhanVien), nv);
        });
        return map;
      })
      .catch((error) => {
        console.error('Không nạp được danh bạ nhân viên:', error);
        cachedPromise = null; // cho phép thử lại ở lần dùng sau
        return new Map();
      });
  }
  return cachedPromise;
};

export const useNhanVienIndex = () => {
  const [index, setIndex] = useState(() => new Map());
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    let huy = false;
    loadIndex().then((map) => {
      if (huy) return;
      setIndex(map);
      setDangTai(false);
    });
    return () => {
      huy = true;
    };
  }, []);

  return { nhanVienIndex: index, dangTaiNhanVien: dangTai };
};

/** Thông tin hiển thị của một phiếu, có fallback khi chưa tra được tên. */
export const thongTinNhanVien = (index, idNhanVien) => {
  const nv = index?.get(Number(idNhanVien));
  return {
    hoTen: nv?.HoTen || `Nhân viên #${idNhanVien}`,
    maNhanVien: nv?.MaNhanVien || '',
    tenDonVi: nv?.TenDonVi || '',
    tenChucDanh: nv?.TenChucDanh || '',
    tenChucVu: nv?.TenChucVu || '',
    coTen: !!nv,
  };
};

/** Chữ cái đầu của tên để dựng avatar tròn (đồng bộ với các bảng sẵn có). */
export const chuCaiDau = (hoTen) => {
  if (!hoTen) return '?';
  const parts = String(hoTen).trim().split(/\s+/);
  return parts[parts.length - 1].charAt(0).toUpperCase();
};
