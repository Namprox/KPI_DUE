import { canAccessPath, visibleGroups } from './menuConfig';
import { canManagePhanHoiSinhVien } from '../utils/roles';
import { canSuaXoaViPham, canGhiNhanLoai } from '../utils/viPhamPermissions';
import { duocChamTieuChi, locTieuChiHienThi } from '../utils/phieuChamPermissions';

const user = (role, unit = 20) => ({
  MaChucVu: 'NV', IdDonVi: 10,
  DonVi: [{ IdDonVi: 10, MaChucVu: 'NV' }, { IdDonVi: unit, MaChucVu: role }],
});
const checkRoute = (path, u, allowed) => {
  expect(canAccessPath(path, u)).toBe(allowed);
  const paths = visibleGroups(u).flatMap(g => g.items.map(i => i.path));
  expect(paths.includes(path)).toBe(allowed);
};

test.each(['TP', 'QTP'])('%s tại P_DTBDCL xem giờ TKB qua menu và URL, kể cả kiêm nhiệm', role => {
  const path = '/quan-ly-gio-giang';
  checkRoute(path, { MaChucVu: role, MaDonVi: 'P_DTBDCL' }, true);
  const u = user(role);
  u.DonVi[1].MaDonVi = ' p_dtbdcl ';
  u.DonVi[1].MaChucVu = role.toLowerCase();
  checkRoute(path, u, true);
  u.DonVi[0].MaDonVi = 'P_DTBDCL';
  u.DonVi[1].MaDonVi = 'P_KH';
  checkRoute(path, u, false);
  checkRoute(path, { MaChucVu: role, MaDonVi: 'P_KH' }, false);
  checkRoute(path, { MaChucVu: role, MaDonVi: 'P_DTBDCL', DonVi: u.DonVi }, false);
});

test.each(['GD', 'VT', 'PTP', 'TK', 'NV'])('%s tại P_DTBDCL không được xem giờ TKB', role => {
  checkRoute('/quan-ly-gio-giang', { MaChucVu: role, MaDonVi: 'P_DTBDCL' }, false);
});

test.each(['TP', 'QTP', 'GD', 'VT', 'TK', 'TKL'])('kiêm %s: quyền chấm và vi phạm gắn đúng đơn vị', role => {
  const u = user(role);
  const ctx = { user: u, phieu: { IdDonVi: 20 }, phanQuyen: new Map([[1, new Set([20])], [2, new Set([10])]]), donViIndex: new Map() };
  expect(duocChamTieuChi({ IdTieuChi: 1 }, ctx)).toBe(true);
  expect(duocChamTieuChi({ IdTieuChi: 2 }, ctx)).toBe(false);
  expect(duocChamTieuChi({ IdTieuChi: 3 }, ctx)).toBe(true);
  expect(duocChamTieuChi({ IdTieuChi: 3 }, { ...ctx, phieu: { IdDonVi: 10 } })).toBe(false);
  expect(canSuaXoaViPham({ IdDonViGhiNhan: 20 }, u)).toBe(true);
  expect(canSuaXoaViPham({ IdDonViGhiNhan: 10 }, u)).toBe(false);
  expect(canSuaXoaViPham({ IdDonViGhiNhan: null }, u)).toBe(false);
  expect(canGhiNhanLoai({ DonViGhiNhan: [{ IdDonVi: '20' }] }, u)).toBe(true);
  expect(canGhiNhanLoai({ DonViGhiNhan: [{ IdDonVi: 10 }] }, u)).toBe(false);
  checkRoute('/quan-ly/tham-dinh', u, true);
  checkRoute('/ty-le-hoan-thanh-gio-giang', u, true);
});

test('TP kiêm nhiệm chỉ thấy tiêu chí được giao; giữ quyền xem của TK đồng thời', () => {
  const u = user('TP');
  const rows = [{ IdTieuChi: 1 }, { IdTieuChi: 2 }];
  const ctx = { user: u, phieu: { IdDonVi: 99 }, phanQuyen: new Map([[1, new Set([20])], [2, new Set([99])]]) };
  expect(locTieuChiHienThi(rows, ctx)).toEqual([rows[0]]);
  expect(locTieuChiHienThi(rows, { ...ctx, user: { ...u, DonVi: [...u.DonVi, { IdDonVi: 30, MaChucVu: 'TK' }] } })).toEqual(rows);
});

test.each(['TP', 'QTP'])('%s tại P_DTBDCL dùng được menu, URL và import/chốt', role => {
  const u = user(role);
  u.DonVi[1].MaDonVi = 'P_DTBDCL';
  checkRoute('/quan-ly-danh-gia-sinh-vien', u, true);
  expect(canManagePhanHoiSinhVien(u)).toBe(true);
  checkRoute('/diem-trung-binh-danh-gia-sinh-vien', u, true);
  u.DonVi[0].MaDonVi = 'P_DTBDCL';
  u.DonVi[1].MaDonVi = 'P_KH';
  checkRoute('/quan-ly-danh-gia-sinh-vien', u, false);
  expect(canManagePhanHoiSinhVien(u)).toBe(false);
});

test.each(['GD', 'VT', 'TK', 'TKL', 'TKK'])('%s chỉ đọc điểm trung bình, không import/chốt phản hồi', role => {
  const u = user(role); u.DonVi[1].MaDonVi = 'P_DTBDCL';
  checkRoute('/diem-trung-binh-danh-gia-sinh-vien', u, true);
  checkRoute('/quan-ly-danh-gia-sinh-vien', u, false);
  expect(canManagePhanHoiSinhVien(u)).toBe(false);
});

test.each(['ADMIN', 'Admin', ' admin '])('chuẩn hóa %s và giữ quyền quản trị', MaChucVu => {
  const u = { MaChucVu };
  checkRoute('/quan-ly-danh-gia-sinh-vien', u, true);
  expect(canManagePhanHoiSinhVien(u)).toBe(true);
  ['/quan-ly-nam-danh-gia', '/mau-danh-gia', '/quan-ly-ngoai-le-dinh-muc', '/nhom-tieu-chi', '/quan-ly-chuc-danh'].forEach(path => checkRoute(path, u, true));
});

test.each([null, { MaChucVu: 'NV' }, { MaChucVu: 'HT' }, { MaChucVu: 'PHT' }, { MaChucVu: 'TBM' }])('không mở quyền điểm trung bình ngoài hợp đồng', u => {
  checkRoute('/diem-trung-binh-danh-gia-sinh-vien', u, false);
});
