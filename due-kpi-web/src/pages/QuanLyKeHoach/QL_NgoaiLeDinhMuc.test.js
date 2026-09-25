import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from './QL_NgoaiLeDinhMuc';
import { apiFetch } from '../../utils/api';

jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { MaChucVu: 'Admin' } }) }));
jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../hooks/useConfirmDeleteDialog', () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: jest.fn() }) }));
jest.mock('primereact/toast', () => {
  const React = require('react');
  return { Toast: React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ show: jest.fn() })); return null; }) };
});
jest.mock('primereact/calendar' , () => ({ Calendar: ({ value, onChange }) => <input type="date" aria-label="Ngày ngoại lệ" value={value ? value.toLocaleDateString('en-CA') : ''} onChange={(event) => onChange({ value: new Date(`${event.target.value}T00:00:00`) })} /> }));

test('ngoại lệ Tập sự không có ô miễn NCKH, vẫn gửi MienNckh true', async () => {
  Element.prototype.scrollIntoView = jest.fn();
  apiFetch.mockImplementation(async (url) => ({ ok: true, json: async () => ({ Success: true, Items: url === 'namdanhgia' ? [{ IdNam: 2026 }] : url === 'nhan-vien' ? [{ IdNhanVien: 8, HoTen: 'Giảng viên kiểm thử' }] : [] }) }));
  render(<Page />);
  await screen.findByText('Chưa có bản ghi ngoại lệ định mức nào');
  fireEvent.click(screen.getByText(/Thêm ngoại lệ mới/));
  fireEvent.click(screen.getByText('-- Chọn giảng viên --'));
  fireEvent.click(screen.getByRole('option', { name: 'Giảng viên kiểm thử' }));
  fireEvent.click(screen.getByText('-- Chọn loại ngoại lệ --'));
  fireEvent.click(screen.getByRole('option', { name: /Tập sự/ }));
  expect(screen.queryByRole('checkbox', { name: /Miễn.*NCKH/ })).toBeNull();
  const dates = screen.getAllByLabelText('Ngày ngoại lệ');
  fireEvent.change(dates[0], { target: { value: '2026-01-01' } });
  fireEvent.change(dates[1], { target: { value: '2026-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu dữ liệu' }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('ngoai-le-dinh-muc', expect.objectContaining({ method: 'POST' })));
  const body = JSON.parse(apiFetch.mock.calls.find(([, opts]) => opts?.method === 'POST')[1].body);
  expect(body).toEqual({ IdNhanVien: 8, IdNam: 2026, LoaiNgoaiLe: 1, HeSoGiamGiang: null, SoGioGiamGiang: null, MienNckh: true, TuNgay: '2026-01-01', DenNgay: '2026-12-31', LyDo: null, MinhChungUrl: null });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu dữ liệu' })).toBeNull());
});
