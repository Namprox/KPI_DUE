import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from './QL_DinhMucGiangVien';
import { apiFetch } from '../../utils/api';

jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { MaChucVu: 'ADMIN' } }) }));
jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../hooks/useConfirmDeleteDialog', () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: ({ accept }) => accept() }) }));

const longTitle = 'HĐLĐ/ Hỗ trợ công tác khởi nghiệp và đổi mới sáng tạo';
const titles = Array.from({ length: 24 }, (_, i) => ({ IdChucDanh: 100 + i, TenChucDanh: i === 23 ? longTitle : `Chức danh từ API ${i}`, TrangThai: true }));
let items;
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  items = [{ IdDinhMuc: 91, IdChucDanh: 123, TenChucDanh: longTitle, IdNam: 2026, GioGiangLyThuyet: 270, MoTa: null }];
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url, options = {}) => {
    if (options.method === 'POST') items.push({ ...JSON.parse(options.body), IdDinhMuc: 92 });
    if (options.method === 'PUT') items[0] = { ...items[0], ...JSON.parse(options.body) };
    if (options.method === 'DELETE') items = [];
    return { ok: true, json: async () => ({ Success: true, Items: url === 'namdanhgia' ? [{ IdNam: 2026 }] : url === 'chuc-danh-nghe-nghiep' ? [...titles, { IdChucDanh: 999, TenChucDanh: 'Ngừng hoạt động', TrangThai: false }] : [...items] }) };
  });
});

test('dropdown lấy đủ 24 mục API, lọc ngừng hoạt động và giữ tooltip tên dài', async () => {
  render(<Page />);
  await screen.findByText(longTitle);
  fireEvent.click(screen.getByText('Thêm mới'));
  fireEvent.click(screen.getByText('Chọn chức danh'));
  const options = await screen.findAllByRole('option');
  expect(options).toHaveLength(24);
  expect(screen.queryByText('Ngừng hoạt động')).toBeNull();
  fireEvent.click(screen.getByRole('option', { name: longTitle }));
  expect(screen.getAllByTitle(longTitle).length).toBeGreaterThan(0);
  expect(screen.queryByText('Giờ NCKH chuẩn')).toBeNull();
});

test('thêm, sửa, xóa dùng đúng route và body chỉ có định mức giờ giảng', async () => {
  render(<Page />);
  await screen.findByText(longTitle);
  fireEvent.click(screen.getByText('Thêm mới'));
  fireEvent.click(screen.getByText('Chọn năm'));
  fireEvent.click(screen.getByRole('option', { name: 'Năm 2026' }));
  fireEvent.click(screen.getByText('Chọn chức danh'));
  fireEvent.click(screen.getByRole('option', { name: longTitle }));
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '270' } });
  fireEvent.click(screen.getByText('Lưu'));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('dinhmucgiangvien', expect.objectContaining({ method: 'POST' })));
  await waitFor(() => expect(screen.queryByText('Lưu')).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: /Sửa định mức/ })[0]);
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '280' } });
  fireEvent.click(screen.getByText('Lưu'));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('dinhmucgiangvien/91', expect.objectContaining({ method: 'PUT' })));
  for (const [, options] of apiFetch.mock.calls.filter(([, options]) => ['POST', 'PUT'].includes(options?.method))) {
    expect(Object.keys(JSON.parse(options.body)).sort()).toEqual(['GioGiangLyThuyet', 'IdChucDanh', 'IdNam', 'MoTa']);
  }
  await waitFor(() => expect(screen.queryByText('Lưu')).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: /Xóa định mức/ })[0]);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('dinhmucgiangvien/91', { method: 'DELETE' }));
  await screen.findByText('Chưa có định mức nào được thiết lập');
});
