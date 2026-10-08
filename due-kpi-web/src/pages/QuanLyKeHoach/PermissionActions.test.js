import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import Nam from './QL_NamDanhGia';
import Mau from './QL_MauDanhGia';
import NgoaiLe from './QL_NgoaiLeDinhMuc';
import Nhom from '../QuanLyTieuChi/QL_NhomTieuChi';
import Thang from '../QuanLyTieuChi/QL_ThangDiemByTieuChi';
import ChucDanh from '../QuanLyToChuc/QL_ChucDanh';
import PhanHoi from './QL_DanhGiaSinhVien';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../hooks/useConfirmDeleteDialog', () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: jest.fn() }) }));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async url => ({ ok: true, json: async () => ({
    Success: true, Items: url === 'tieuchidanhgia' ? [{ IdTieuChi: 1, TenTieuChi: 'Tiêu chí kiểm thử' }] : [],
  }) }));
});
const mount = async (Page, user) => {
  useAuth.mockReturnValue({ user });
  await act(async () => render(<MemoryRouter initialEntries={['/1/thang-diem']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path='/:tieuChiId/thang-diem' element={<Page />} /></Routes>
  </MemoryRouter>));
};
const pages = [
  ['Năm đánh giá', Nam, /Thêm mới/], ['Mẫu phiếu', Mau, /Thêm mới/],
  ['Ngoại lệ', NgoaiLe, /Thêm ngoại lệ mới/], ['Nhóm tiêu chí', Nhom, /Thêm mới/],
  ['Thang điểm', Thang, /Thêm mức điểm/], ['Chức danh', ChucDanh, /Thêm mới/],
];
test.each(pages)('%s: ADMIN viết hoa thấy thao tác', async (_name, Page, label) => {
  await mount(Page, { MaChucVu: 'ADMIN' });
  expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
});
test.each(pages)('%s: nhận quyền HT kiêm nhiệm', async (_name, Page, label) => {
  await mount(Page, { MaChucVu: 'NV', DonVi: [{ MaChucVu: 'HT', IdDonVi: 1 }] });
  expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
});
test.each(['TP', 'QTP'])('phản hồi: %s kiêm nhiệm đúng phòng có nút import/chốt', async role => {
  await mount(PhanHoi, { MaChucVu: 'NV', DonVi: [{ MaChucVu: role, MaDonVi: 'P_DTBDCL' }] });
  expect(screen.getByRole('button', { name: /Import Excel/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Chốt điểm/ })).toBeInTheDocument();
  expect(apiFetch.mock.calls.some(([, options]) => ['POST', 'PUT', 'DELETE'].includes(options?.method))).toBe(false);
});
test('phản hồi: chức vụ và phòng khác bổ nhiệm không hiện thao tác', async () => {
  await mount(PhanHoi, { MaChucVu: 'TP', DonVi: [{ MaChucVu: 'TP', MaDonVi: 'P_KH' }, { MaChucVu: 'NV', MaDonVi: 'P_DTBDCL' }] });
  expect(screen.queryByRole('button', { name: /Import Excel/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /Chốt điểm/ })).toBeNull();
});
