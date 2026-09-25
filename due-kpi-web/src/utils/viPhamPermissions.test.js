import { laGiangVien } from './viPhamPermissions';

test('phân loại theo backend, không suy từ chức danh', () => {
  expect(laGiangVien({ IdChucDanh: 100, DonVi: [{ LoaiDoiTuong: 1 }] })).toBe(true);
  expect(laGiangVien({ IdChucDanh: 3, DonVi: [{ LoaiDoiTuong: 2 }] })).toBe(false);
  expect(laGiangVien({ DonVi: [{ LoaiDoiTuong: 2 }, { LoaiDoiTuong: 1 }] })).toBe(true);
});

test('danh bạ chưa có phân loại: giữ ứng viên để backend kiểm tra khi lưu', () => {
  expect(laGiangVien({ IdNhanVien: 8, IdChucDanh: 100 })).toBe(true);
  expect(laGiangVien(null)).toBe(false);
});
