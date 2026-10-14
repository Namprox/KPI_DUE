import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './QL_NamDanhGia';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../hooks/useConfirmDeleteDialog', () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: ({ accept }) => accept() }) }));
const reply = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Page /></MemoryRouter>);
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  useAuth.mockReturnValue({ user: { MaChucVu: 'PHT' } });
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(reply({ Items: [{ IdNam: 2027, TrangThai: 2, NgayBatDau: '2027-01-01', NgayKetThuc: '2027-12-31', NgayMoTuDanhGia: '2027-01-01', NgayDongTuDanhGia: '2027-12-01', NgayMoDanhGiaCapTren: '2027-01-01', NgayDongDanhGiaCapTren: '2027-12-31' }] }));
});
test('đóng năm nhận 409 giữ form, hiện Message và link đúng năm', async () => {
  show();
  fireEvent.click(await screen.findByTitle('Chỉnh sửa'));
  fireEvent.click(screen.getByRole('combobox', { name: 'Trạng thái hệ thống' }));
  fireEvent.click(screen.getByRole('option', { name: '3 - Đóng hệ thống (Kết thúc)' }));
  apiFetch.mockResolvedValueOnce(reply({ Success: false, Message: 'Chua cau hinh giam tru gio giang nam 2027 cho chuc vu: TK' }, 409));
  fireEvent.submit(screen.getByRole('form', { name: 'Năm đánh giá' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Chua cau hinh giam tru gio giang nam 2027');
  expect(screen.getByRole('link', { name: 'Cấu hình giảm trừ năm 2027' })).toHaveAttribute('href', '/giam-tru-chuc-vu-theo-nam?idNam=2027');
  expect(JSON.parse(apiFetch.mock.calls.find(([, options]) => options.method === 'PUT')[1].body).TrangThai).toBe(3);
});
test('tạo năm đã đóng cũng xử lý 409 với năm trong form', async () => {
  show();
  await screen.findByTitle('Chỉnh sửa');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2031' } });
  fireEvent.click(screen.getByRole('combobox', { name: 'Trạng thái hệ thống' }));
  fireEvent.click(screen.getByRole('option', { name: '3 - Đóng hệ thống (Kết thúc)' }));
  apiFetch.mockResolvedValueOnce(reply({ Message: 'Chưa cấu hình cho năm 2031' }, 409));
  fireEvent.submit(screen.getByRole('form', { name: 'Năm đánh giá' }));
  expect(await screen.findByRole('link', { name: 'Cấu hình giảm trừ năm 2031' })).toHaveAttribute('href', '/giam-tru-chuc-vu-theo-nam?idNam=2031');
  expect(apiFetch).toHaveBeenCalledWith('namdanhgia', expect.objectContaining({ method: 'POST' }));
});
test.each([403, 409])('xóa năm báo lỗi HTTP %s từ API', async (status) => {
  show();
  await screen.findByTitle('Xóa');
  apiFetch.mockResolvedValueOnce(reply(status === 403 ? { message: 'Bạn không có quyền xóa năm' } : { Message: 'Năm đã đóng phía sau còn kế thừa' }, status));
  fireEvent.click(screen.getByTitle('Xóa'));
  expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ? 'Bạn không có quyền xóa năm' : 'Năm đã đóng phía sau còn kế thừa');
  expect(screen.getByTitle('Chỉnh sửa')).toBeInTheDocument();
});
test('mở lại năm gửi trạng thái được chọn, không tự đóng lại theo ngày', async () => {
  apiFetch.mockResolvedValue(reply({ Items: [{ IdNam: 2020, TrangThai: 3, NgayMoTuDanhGia: '2020-01-01', NgayDongDanhGiaCapTren: '2020-12-31' }] }));
  show();
  fireEvent.click(await screen.findByTitle('Chỉnh sửa'));
  fireEvent.click(screen.getByRole('combobox', { name: 'Trạng thái hệ thống' }));
  fireEvent.click(screen.getByRole('option', { name: '2 - Mở hệ thống (Đang chạy)' }));
  fireEvent.submit(screen.getByRole('form', { name: 'Năm đánh giá' }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('namdanhgia/2020', expect.objectContaining({ method: 'PUT' })));
  expect(JSON.parse(apiFetch.mock.calls.find(([, options]) => options.method === 'PUT')[1].body).TrangThai).toBe(2);
});
test('không cấp quyền ghi theo chức vụ kiêm nhiệm', async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: 'GV', DonVi: [{ MaChucVu: 'PHT' }] } });
  show();
  await screen.findByText('2027');
  expect(screen.queryByTitle('Chỉnh sửa')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Thêm mới' })).not.toBeInTheDocument();
});
