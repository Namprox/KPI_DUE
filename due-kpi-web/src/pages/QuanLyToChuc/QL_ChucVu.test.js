import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './QL_ChucVu';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../hooks/useConfirmDeleteDialog', () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: ({ accept }) => accept() }) }));
const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Page /></MemoryRouter>);
beforeEach(() => {
  useAuth.mockReturnValue({ user: { MaChucVu: 'PHT' } });
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ Success: true, Items: [{ IdChucVu: 12, MaChucVu: 'TK', TenChucVu: 'Trưởng khoa', TrangThai: true, TyLeDinhMucGiang: 0.3, GhiChuDieuKien: 'Cấu hình cũ' }] }) });
});
test('sửa tên gọi API thật, không gửi hoặc hiển thị hệ số đóng băng', async () => {
  show();
  await screen.findByText('Trưởng khoa');
  expect(screen.queryByText('Cấu hình cũ')).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Chỉnh sửa'));
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tên chức vụ'), { target: { value: 'Trưởng khoa mới' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('chucvu/12', { method: 'PUT', body: JSON.stringify({ MaChucVu: 'TK', TenChucVu: 'Trưởng khoa mới', TrangThai: true }) }));
  await screen.findByText('Đã cập nhật chức vụ.');
});
test('tạo và xóa dùng POST/DELETE; nhắc cấu hình năm sau tạo', async () => {
  show();
  await screen.findByText('Trưởng khoa');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));
  fireEvent.change(screen.getByLabelText('Mã chức vụ'), { target: { value: 'ABC' } });
  fireEvent.change(screen.getByLabelText('Tên chức vụ'), { target: { value: 'Chức vụ mới' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
  await screen.findByText(/Đã tạo chức vụ/);
  expect(apiFetch).toHaveBeenCalledWith('chucvu', expect.objectContaining({ method: 'POST' }));
  fireEvent.click(await screen.findByTitle('Xóa'));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('chucvu/12', { method: 'DELETE' }));
});
test('lỗi 403 chữ thường giữ form và báo đúng thông điệp', async () => {
  show();
  fireEvent.click(await screen.findByTitle('Chỉnh sửa'));
  apiFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: 'Bạn không có quyền sửa chức vụ' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền sửa chức vụ');
  expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
});
test('người chỉ có HT kiêm nhiệm không có thao tác ghi', async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: 'GV', DonVi: [{ MaChucVu: 'HT' }] } });
  show();
  await screen.findByText('Trưởng khoa');
  expect(screen.queryByTitle('Chỉnh sửa')).not.toBeInTheDocument();
  expect(screen.queryByTitle('Xóa')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Thêm mới' })).not.toBeInTheDocument();
});
