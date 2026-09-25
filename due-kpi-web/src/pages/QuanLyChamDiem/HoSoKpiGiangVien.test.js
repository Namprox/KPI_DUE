import React from 'react';
import { render, screen } from '@testing-library/react';
import Page from './HoSoKpiGiangVien';

jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useParams: () => ({ idNv: '8' }), useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams('idNam=2026'), jest.fn()] }));
jest.mock('../../hooks/useNamDanhGia', () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: 2026 }) }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { MaChucVu: 'ADMIN' } }) }));
jest.mock('../../hooks/useNhanVienIndex', () => ({ useNhanVienIndex: () => ({ nhanVienIndex: new Map() }), thongTinNhanVien: () => ({ hoTen: 'Giảng viên kiểm thử' }), chuCaiDau: () => 'GV' }));
jest.mock('primereact/toast', () => ({ Toast: () => null }));
jest.mock('../../utils/phieuApi' , () => ({
  ...jest.requireActual('../../utils/phieuApi'),
  fetchDinhMucApDung: async () => ({ GioGiangBase: 270, GioGiangApDung: 270, TyLeGiangChucVu: 1, TenChucDanh: 'Chức danh từ API', LyDoDieuChinh: 'Không giảm giờ giảng' }),
  fetchGioNckhThucTe: async () => ({ GioNckhThucTe: 350 }),
  fetchNckhGiangVien: async () => ({}), fetchGioGiangTheoNam: async () => [],
  fetchViPhamGiangVien: async () => [], fetchDiemPhanHoiSv: async () => ({ items: [] }),
}));

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
