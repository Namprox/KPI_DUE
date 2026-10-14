import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './GiamTruChucVuTheoNam';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { giamTruPayload, hienThiGiamTru, LOAI_GIAM_TRU } from '../../utils/chucVuGiamTruApi';

jest.mock('../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
let rows;
let years;
let failSave;
const show = (query = '') => render(<MemoryRouter initialEntries={[`/giam-tru-chuc-vu-theo-nam${query}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Page /></MemoryRouter>);
const selectYear = (label) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Năm đánh giá' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
};
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  useAuth.mockReturnValue({ user: { MaChucVu: ' pht ' } });
  failSave = null;
  years = [{ IdNam: 2029, TrangThai: 1 }, { IdNam: 2028, TrangThai: 2 }, { IdNam: 2027, TrangThai: 2 }, { IdNam: 2026, TrangThai: 3 }];
  rows = [
    { IdChucVu: 12, MaChucVu: 'TK', TenChucVu: 'Trưởng khoa', TrangThai: true, IdNam: 2028, DaCauHinh: true, ChoPhepSua: true, LaKeThua: true, IdNamNguon: 2027, LoaiGiamTru: LOAI_GIAM_TRU.TY_LE, TyLeDinhMucGiang: 0.3 },
    { IdChucVu: 40, TenChucVu: 'Công đoàn', TrangThai: false, IdNam: 2028, DaCauHinh: true, ChoPhepSua: true, LoaiGiamTru: LOAI_GIAM_TRU.GIO, GioGiamTruNam: 44, SaoChepTuNam: 2025 },
    { IdChucVu: 77, TenChucVu: 'Thanh tra', IdNam: 2028, DaCauHinh: false, ChoPhepSua: true },
  ];
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url, options = {}) => {
    if (url === 'namdanhgia') return response({ Items: years });
    if (options.method === 'PUT') {
      if (failSave) return response(failSave.body, failSave.status);
      rows[0] = { ...rows[0], ...JSON.parse(options.body), LaKeThua: false, IdNamNguon: 2028 };
      return response({ Success: true, Item: rows[0] });
    }
    const idNam = Number(new URLSearchParams(url.split('?')[1]).get('idNam'));
    return response({ Items: rows.map((row) => ({ ...row, IdNam: idNam, ChoPhepSua: idNam !== 2026 && row.ChoPhepSua })) });
  });
});

test('mặc định năm mở mới nhất; đủ nhãn nguồn và giữ chức vụ ngừng hoạt động; đổi năm khóa sửa', async () => {
  show();
  expect(await screen.findByText('Kế thừa từ năm 2027')).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('chucvu/giam-tru?idNam=2028', expect.anything());
  expect(screen.getByText('Chốt khi đóng năm (từ 2025)')).toBeInTheDocument();
  expect(screen.getByText('Chưa cấu hình')).toBeInTheDocument();
  expect(screen.getByText('30% còn phải thực hiện')).toBeInTheDocument();
  expect(screen.getByText('−44 giờ')).toBeInTheDocument();
  expect(screen.getByText(/Ngừng hoạt động/)).toBeInTheDocument();
  selectYear('Năm 2026 (đã đóng)');
  await waitFor(() => expect(screen.getAllByText('Chỉ xem')).toHaveLength(3));
  expect(screen.queryByRole('button', { name: /Sửa giảm trừ/ })).not.toBeInTheDocument();
});

test.each([
  [LOAI_GIAM_TRU.TY_LE, 0.25, null], [LOAI_GIAM_TRU.GIO, null, 22],
])('lưu %s bằng PUT và tải lại cả danh sách', async (loai, rate, hours) => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa giảm trừ Trưởng khoa' }));
  if (loai === LOAI_GIAM_TRU.GIO) {
    fireEvent.click(screen.getByRole('radio', { name: 'Giờ cố định' }));
    fireEvent.change(screen.getByLabelText('Giờ giảm trừ / năm'), { target: { value: '22' } });
  } else fireEvent.change(screen.getByLabelText('Tỷ lệ còn phải thực hiện (%)'), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
  await screen.findByText('Cấu hình riêng năm 2028');
  const put = apiFetch.mock.calls.find(([, options]) => options.method === 'PUT');
  expect(put[0]).toBe('chucvu/12/giam-tru/2028');
  expect(JSON.parse(put[1].body)).toEqual({ LoaiGiamTru: loai, TyLeDinhMucGiang: rate, GioGiamTruNam: hours, GhiChuDieuKien: null });
  expect(apiFetch.mock.calls.filter(([url]) => url === 'chucvu/giam-tru?idNam=2028')).toHaveLength(2);
});

test.each([
  { MaChucVu: 'GV' }, { MaChucVu: 'GV', DonVi: [{ MaChucVu: 'HT' }] },
])('vai trò chính không đủ quyền chỉ xem dù có kiêm nhiệm', async (user) => {
  useAuth.mockReturnValue({ user });
  show();
  await screen.findByText('Trưởng khoa');
  expect(screen.queryByRole('button', { name: /Sửa giảm trừ/ })).not.toBeInTheDocument();
});

test('ChoPhepSua từ server khóa ADMIN; deep link giữ đúng năm', async () => {
  rows.forEach((row) => { row.ChoPhepSua = false; });
  show('?idNam=2027');
  await screen.findByText('Trưởng khoa');
  expect(apiFetch).toHaveBeenCalledWith('chucvu/giam-tru?idNam=2027', expect.anything());
  expect(screen.queryByRole('button', { name: /Sửa giảm trừ/ })).not.toBeInTheDocument();
});

test.each([[403, { message: 'Bạn không có quyền cập nhật' }], [409, { Message: 'Năm 2028 đã đóng' }], [400, { Message: 'Dữ liệu không hợp lệ' }], [404, { Message: 'Chức vụ không tồn tại' }]])('hiện lỗi HTTP %s đúng shape', async (status, body) => {
  failSave = { status, body };
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa giảm trừ Trưởng khoa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
  expect(await screen.findByText(body.Message || body.message)).toBeInTheDocument();
  expect(screen.queryByText('Cấu hình riêng năm 2028')).not.toBeInTheDocument();
});

test('đổi năm không nhận response cũ đến chậm', async () => {
  let resolveOld;
  const original = apiFetch.getMockImplementation();
  apiFetch.mockImplementation((url, options) => url === 'chucvu/giam-tru?idNam=2028'
    ? new Promise((resolve) => { resolveOld = resolve; }) : original(url, options));
  show();
  await waitFor(() => expect(resolveOld).toBeDefined());
  selectYear('Năm 2026 (đã đóng)');
  await screen.findByText('Trưởng khoa');
  resolveOld(response({ Items: [{ ...rows[0], TenChucVu: 'Dữ liệu cũ' }] }));
  await waitFor(() => expect(screen.getAllByText('Chỉ xem')).toHaveLength(3));
  expect(screen.queryByText('Dữ liệu cũ')).not.toBeInTheDocument();
});

test('kiểm tra biên, null tỷ lệ không giảm, và không gửi giá trị của loại còn lại', () => {
  const base = { LoaiGiamTru: LOAI_GIAM_TRU.TY_LE, TyLePhanTram: '', GioGiamTruNam: 44 };
  expect(giamTruPayload(base)).toMatchObject({ TyLeDinhMucGiang: null, GioGiamTruNam: null });
  expect(giamTruPayload({ ...base, TyLePhanTram: 0 }).TyLeDinhMucGiang).toBe(0);
  expect(giamTruPayload({ ...base, TyLePhanTram: 100 }).TyLeDinhMucGiang).toBe(1);
  for (const value of [-1, 101, 'abc']) expect(() => giamTruPayload({ ...base, TyLePhanTram: value })).toThrow();
  for (const value of ['', null, -1, 10000]) expect(() => giamTruPayload({ ...base, LoaiGiamTru: LOAI_GIAM_TRU.GIO, GioGiamTruNam: value })).toThrow();
  expect(giamTruPayload({ ...base, LoaiGiamTru: LOAI_GIAM_TRU.GIO, GioGiamTruNam: 9999.99 })).toMatchObject({ GioGiamTruNam: 9999.99, TyLeDinhMucGiang: null });
  expect(() => giamTruPayload({ ...base, GhiChuDieuKien: 'x'.repeat(501) })).toThrow();
  expect(hienThiGiamTru({ IdChucVu: 1, LoaiGiamTru: LOAI_GIAM_TRU.TY_LE, TyLeDinhMucGiang: null })).toBe('100% còn phải thực hiện');
  expect(hienThiGiamTru({ IdChucVu: 1, LoaiGiamTru: null })).toBe('Chưa cấu hình');
});
