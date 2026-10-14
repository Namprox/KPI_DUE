import React from 'react';
import { render, screen } from '@testing-library/react';
import Page from './HoSoKpiGiangVien';
import { fetchDinhMucApDung } from '../../utils/phieuApi';

jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useParams: () => ({ idNv: '8' }), useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams('idNam=2026'), jest.fn()] }));
jest.mock('../../hooks/useNamDanhGia', () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: 2026 }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { MaChucVu: 'ADMIN' } }) }));
jest.mock('../../hooks/useNhanVienIndex', () => ({ useNhanVienIndex: () => ({ nhanVienIndex: new Map() }), thongTinNhanVien: () => ({ hoTen: 'Giảng viên kiểm thử' }), chuCaiDau: () => 'GV' }));
jest.mock('primereact/toast', () => ({ Toast: () => null }));
jest.mock('../../utils/phieuApi' , () => ({
  ...jest.requireActual('../../utils/phieuApi'),
  fetchDinhMucApDung: jest.fn(async () => ({ GioGiangBase: 270, GioGiangApDung: 270, TyLeGiangChucVu: 1, TenChucDanh: 'Chức danh từ API', LyDoDieuChinh: 'Không giảm giờ giảng' })),
  fetchGioNckhThucTe: async () => ({ GioNckhThucTe: 350 }),
  fetchNckhGiangVien: async () => ({}), fetchGioGiangTheoNam: async () => [],
  fetchViPhamGiangVien: async () => [], fetchDiemPhanHoiSv: async () => ({ items: [] }),
}));

beforeEach(() => {
  fetchDinhMucApDung.mockResolvedValue({ GioGiangBase: 270, GioGiangApDung: 270, TyLeGiangChucVu: 1, TenChucDanh: 'Chức danh từ API', LyDoDieuChinh: 'Không giảm giờ giảng' });
});

test('định mức áp dụng hiển thị 270 giờ giảng, giữ giờ NCKH thực tế và bỏ định mức NCKH/PVCĐ', async () => {
  const { container } = render(<Page />);
  await screen.findByText('Không giảm giờ giảng');
  expect(screen.getByText(/^270([,.]0)?$/)).toBeTruthy();
  expect(screen.getByText('Tỷ lệ giờ giảng theo chức vụ')).toBeTruthy();
  expect(screen.getByText('Giờ NCKH thực tế')).toBeTruthy();
  for (const label of ['Giờ NCKH áp dụng', 'Giờ PVCĐ áp dụng', 'Hệ số NCKH áp dụng', 'Miễn điều kiện NCKH (tập sự)']) {
    expect(screen.queryByText(label)).toBeNull();
  }
  expect(container.textContent).not.toContain('NaN');
});

test('định mức áp dụng loại giờ dùng chức vụ và số giờ server chọn, không hiện tỷ lệ 1', async () => {
  fetchDinhMucApDung.mockResolvedValueOnce({ GioGiangBase: 270, GioGiangApDung: 226, TyLeGiangChucVu: 1, LoaiGiamTruChucVu: 'gio_chuan_co_dinh', GioGiamTruChucVu: 44, TenChucVuApDung: 'Chủ tịch Công đoàn', IdNamNguonGiamTru: 2025 });
  render(<Page />);
  await screen.findByText('Chủ tịch Công đoàn');
  expect(screen.getByText(/^−44([,.]0+)? giờ$/)).toBeTruthy();
  expect(screen.getByText(/^226([,.]0)?$/)).toBeTruthy();
  expect(screen.getByText('2025')).toBeTruthy();
  expect(screen.queryByText('Tỷ lệ giờ giảng theo chức vụ')).toBeNull();
});
