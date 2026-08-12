import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import {
  fetchLichSuChamDiemPhieu,
  fetchPhieuDetail,
  fetchTieuChiDonViCham,
  formatDiem,
  formatNgayGio,
  gomLichSuTheoChiTiet,
  putDiemKhoa,
  traLaiPhieuKhoa,
  TRANG_THAI,
} from '../../utils/phieuApi';
import {
  buildChamContext,
  lyDoKhoaONhap,
  oNhapDiemMo,
  tinhTienDoCham,
} from '../../utils/phieuChamPermissions';
import { thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';
import { useMinhChungPhieuPreview } from '../../hooks/useMinhChungPhieuPreview';
import FilePreviewModal from '../../components/Common/FilePreviewModal';
import TienDoCham from '../../components/QuanLyChamDiem/TienDoCham';
import TieuChiChamCard from '../../components/QuanLyChamDiem/TieuChiChamCard';
import TraLaiPhieuModal from '../../components/QuanLyChamDiem/TraLaiPhieuModal';
import { TrangThaiBadge, XepLoaiBadge } from '../../components/QuanLyChamDiem/TrangThaiBadge';

/**
 * Màn hình chấm điểm một phiếu — trang quan trọng nhất của phân hệ.
 *
 * Hai điều dễ sai nếu không đọc kỹ luồng nghiệp vụ:
 *
 * 1. KHÔNG có nút "Khoa duyệt". Phiếu tự chuyển 2 → 3 ngay khi tiêu chí chấm tay
 *    cuối cùng của TOÀN phiếu (mọi đơn vị cùng chấm) có điểm. Vì vậy sau mỗi lần
 *    lưu điểm phải tải lại phiếu: badge trạng thái, RowVersion và quyền nhập đều
 *    có thể vừa đổi. Response PUT trả kèm TrangThaiPhieu để báo trước điều đó.
 *
 * 2. RowVersion là khóa lạc quan. Chỉ thao tác trả lại cần gửi kèm; khi server
 *    trả 409 nghĩa là phiếu đã bị người khác sửa — ta tải lại và bắt người dùng
 *    xem lại trước khi thử tiếp, không tự động gửi lại.
 */
const ChamDiemPhieu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();
  const { nhanVienIndex } = useNhanVienIndex();

  const [phieu, setPhieu] = useState(null);
  const [donViList, setDonViList] = useState([]);
  const [phanQuyenRows, setPhanQuyenRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState('');
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [lichSuItems, setLichSuItems] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(true);
  const [moTraLai, setMoTraLai] = useState(false);
  const [dangTraLai, setDangTraLai] = useState(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  // Xem trước / tải minh chứng của từng tiêu chí — modal dùng chung với trang vi phạm
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) => showToast('error', 'Lỗi', message));

  const taiPhieu = useCallback(
    async ({ imLang = false } = {}) => {
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchPhieuDetail(id);
        if (!item) {
          setLoiTai('Không tìm thấy phiếu này, hoặc phiếu nằm ngoài phạm vi bạn được xem.');
          setPhieu(null);
          return null;
        }
        setPhieu(item);
        setLoiTai('');
        return item;
      } catch (error) {
        console.error('Lỗi tải phiếu:', error);
        setLoiTai(error.message);
        setPhieu(null);
        return null;
      } finally {
        if (!imLang) setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    taiPhieu();
  }, [taiPhieu]);

  // Lịch sử chấm lấy một lần cho cả phiếu (thay vì mỗi tiêu chí một request) và
  // nạp lại sau mỗi lần lưu điểm — lượt vừa lưu chính là một dòng mới trong đó.
  const taiLichSu = useCallback(async () => {
    setDangTaiLichSu(true);
    try {
      setLichSuItems(await fetchLichSuChamDiemPhieu(id));
    } catch (error) {
      // Thiếu lịch sử không được chặn màn hình chấm — chỉ mất khối tham khảo.
      console.error('Lỗi tải lịch sử chấm điểm:', error);
      setLichSuItems([]);
    } finally {
      setDangTaiLichSu(false);
    }
  }, [id]);

  useEffect(() => {
    taiLichSu();
  }, [taiLichSu]);

  useEffect(() => {
    const taiDonVi = async () => {
      try {
        const res = await apiFetch('donvi');
        if (!res.ok) return;
        const result = await res.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      } catch (error) {
        console.error('Lỗi tải danh mục đơn vị:', error);
      }
    };
    taiDonVi();
  }, []);

  // Phân quyền chấm lấy theo mẫu của phiếu: gọi trước để disable đúng ô, thay vì
  // để người dùng gõ điểm xong mới nhận 403 từ server.
  useEffect(() => {
    if (!phieu?.IdMau) return;
    let huy = false;
    fetchTieuChiDonViCham({ idMau: phieu.IdMau })
      .then((rows) => {
        if (!huy) setPhanQuyenRows(rows);
      })
      .catch((error) => {
        // Không chặn màn hình: thiếu bảng phân quyền thì mọi tiêu chí rơi về quy
        // tắc mặc định (đơn vị chủ quản chấm) — server vẫn là chốt chặn cuối.
        console.error('Lỗi tải phân quyền chấm tiêu chí:', error);
      });
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  const chamCtx = useMemo(
    () => buildChamContext({ user, phieu, phanQuyenRows, donViList }),
    [user, phieu, phanQuyenRows, donViList],
  );

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const lichSuTheoChiTiet = useMemo(() => gomLichSuTheoChiTiet(lichSuItems), [lichSuItems]);
  const tienDo = useMemo(() => tinhTienDoCham(chiTietList, chamCtx), [chiTietList, chamCtx]);
  const nv = thongTinNhanVien(nhanVienIndex, phieu?.IdNhanVien);

  const dangOBuocCham = phieu?.TrangThai === TRANG_THAI.DON_VI_CHAM;

  const handleLuuDiem = async (chiTiet, { diem, nhanXet }) => {
    setIdDangLuu(chiTiet.IdChiTiet);
    try {
      const { trangThaiPhieu } = await putDiemKhoa(chiTiet.IdChiTiet, { diem, nhanXet });

      // Luôn tải lại: điểm vừa lưu có thể kéo theo đổi trạng thái phiếu, và
      // RowVersion đang giữ đã cũ ngay sau khi server ghi.
      await Promise.all([taiPhieu({ imLang: true }), taiLichSu()]);

      if (trangThaiPhieu === TRANG_THAI.CHO_HT_DUYET) {
        showToast(
          'success',
          'Đã chấm xong toàn phiếu',
          'Đây là tiêu chí chấm tay cuối cùng — phiếu đã tự chuyển sang chờ Hiệu trưởng duyệt và rời khỏi hàng đợi của đơn vị.',
          7000,
        );
      } else {
        showToast('success', 'Đã lưu', `Đã lưu điểm cho "${chiTiet.TenTieuChi}".`);
      }
    } catch (error) {
      console.error('Lỗi lưu điểm:', error);
      if (error.isConflict) {
        await taiPhieu({ imLang: true });
        showToast(
          'warn',
          'Dữ liệu đã thay đổi',
          'Phiếu vừa được người khác cập nhật. Màn hình đã tải lại — vui lòng kiểm tra rồi chấm lại.',
          7000,
        );
      } else {
        showToast('error', 'Không lưu được', error.message);
      }
    } finally {
      setIdDangLuu(null);
    }
  };

  const handleTraLai = async ({ lyDo, nhanXet }) => {
    if (!phieu?.RowVersion) {
      showToast('error', 'Thiếu dữ liệu', 'Không đọc được RowVersion của phiếu, vui lòng tải lại trang.');
      return;
    }
    setDangTraLai(true);
    try {
      await traLaiPhieuKhoa(phieu.IdPhieu, { lyDo, nhanXet, rowVersion: phieu.RowVersion });
      setMoTraLai(false);
      await taiPhieu({ imLang: true });
      showToast('success', 'Đã trả lại', `Phiếu của ${nv.hoTen} đã được trả về cho giảng viên sửa lại.`);
    } catch (error) {
      console.error('Lỗi trả lại phiếu:', error);
      if (error.isConflict) {
        setMoTraLai(false);
        await taiPhieu({ imLang: true });
        showToast(
          'warn',
          'Dữ liệu đã thay đổi',
          'Phiếu vừa được người khác cập nhật nên thao tác bị hủy. Màn hình đã tải lại — vui lòng thử lại.',
          7000,
        );
      } else {
        showToast('error', 'Không trả lại được', error.message);
      }
    } finally {
      setDangTraLai(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phiếu đánh giá...
          </div>
        </div>
      </div>
    );
  }

  if (loiTai || !phieu) {
    return (
      <div className="page-container">
        <Toast ref={toast} position="top-right" />
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Không mở được phiếu</h3>
            <p style={{ margin: '0 0 20px 0' }}>{loiTai || 'Phiếu không tồn tại.'}</p>
            <button className="btn-cancel" style={{ margin: '0 auto' }} onClick={() => navigate('/quan-ly/cho-cham')}>
              <i className="fa-solid fa-arrow-left"></i> Về hàng đợi chờ chấm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap' }}
      >
        <div>
          <button
            className="cd-link-btn"
            style={{ marginBottom: '8px' }}
            onClick={() => navigate('/quan-ly/cho-cham')}
          >
            <i className="fa-solid fa-arrow-left"></i> Hàng đợi chờ chấm
          </button>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
            Chấm điểm phiếu #{phieu.IdPhieu}
          </h2>
          <span className="breadcrumb">
            Năm học {phieu.IdNam} · Lần đánh giá {phieu.LanDanhGia}
            {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ''}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button
            className="btn-cancel"
            onClick={() => navigate(`/quan-ly/giang-vien/${phieu.IdNhanVien}?idNam=${phieu.IdNam}`)}
          >
            <i className="fa-solid fa-address-card"></i> Hồ sơ KPI giảng viên
          </button>
          {dangOBuocCham && (
            <button className="btn-submit" style={{ background: '#b45309' }} onClick={() => setMoTraLai(true)}>
              <i className="fa-solid fa-rotate-left"></i> Trả lại giảng viên
            </button>
          )}
        </div>
      </div>

      <div className="cd-phieu-header">
        <div className="cd-phieu-top">
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{nv.hoTen}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {nv.maNhanVien && <span className="code-pill" style={{ marginRight: '8px' }}>{nv.maNhanVien}</span>}
              {nv.tenDonVi || '—'}
              {phieu.TenChucDanh ? ` · ${phieu.TenChucDanh}` : ''}
              {phieu.TenChucVu ? ` · ${phieu.TenChucVu}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <TrangThaiBadge trangThai={phieu.TrangThai} />
            <TienDoCham
              xong={tienDo.cuaToi.xong}
              tong={tienDo.cuaToi.tong}
              nhan="Phần đơn vị bạn chấm"
              ghiChu={`Toàn phiếu: ${tienDo.toanPhieu.xong}/${tienDo.toanPhieu.tong} tiêu chí chấm tay`}
            />
          </div>
        </div>

        <div className="cd-meta-grid">
          <div>
            <div className="cd-meta-label">Tổng điểm cơ bản</div>
            <div className="cd-meta-value">{formatDiem(phieu.TongDiemCoBan)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Tổng điểm vượt trội</div>
            <div className="cd-meta-value">{formatDiem(phieu.TongDiemVuotTroi)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Tổng điểm tích lũy</div>
            <div className="cd-meta-value" style={{ color: '#1d4ed8' }}>
              {formatDiem(phieu.TongDiemTichLuy)}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Xếp loại</div>
            <div className="cd-meta-value">
              <XepLoaiBadge xepLoai={phieu.XepLoai} />
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Ngày gửi</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayGui)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Cập nhật gần nhất</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayCapNhat)}</div>
          </div>
        </div>

        {phieu.NhanXetKhoa && (
          <div className="cd-box" style={{ marginTop: '16px' }}>
            <div className="cd-box-title">Nhận xét của đơn vị</div>
            <div style={{ fontSize: '13px', color: '#334155' }}>{phieu.NhanXetKhoa}</div>
          </div>
        )}
        {phieu.NhanXetTruong && (
          <div className="cd-box" style={{ marginTop: '10px' }}>
            <div className="cd-box-title">Nhận xét của Hiệu trưởng</div>
            <div style={{ fontSize: '13px', color: '#334155' }}>{phieu.NhanXetTruong}</div>
          </div>
        )}
      </div>

      {!dangOBuocCham && (
        <div
          className="cd-box"
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: '16px' }}
        >
          <div style={{ fontSize: '13px', color: '#1e40af' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '8px' }}></i>
            Phiếu không ở bước <b>đơn vị chấm</b> nên toàn bộ ô nhập điểm đang khóa. Bạn vẫn xem
            được điểm, minh chứng và lịch sử chấm của từng tiêu chí.
          </div>
        </div>
      )}

      <p className="sub-title" style={{ marginBottom: '12px' }}>
        CHI TIẾT TIÊU CHÍ ({chiTietList.length})
      </p>

      {chiTietList.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-list"></i>
            Phiếu chưa có tiêu chí nào.
          </div>
        </div>
      ) : (
        chiTietList.map((ct, index) => {
          const choPhepNhap = oNhapDiemMo(ct, chamCtx);
          return (
            <TieuChiChamCard
              key={ct.IdChiTiet}
              chiTiet={ct}
              stt={index + 1}
              lichSu={lichSuTheoChiTiet.get(Number(ct.IdChiTiet)) || []}
              dangTaiLichSu={dangTaiLichSu}
              choPhepNhap={choPhepNhap}
              lyDoKhoa={choPhepNhap ? '' : lyDoKhoaONhap(ct, chamCtx)}
              dangLuu={idDangLuu === ct.IdChiTiet}
              onLuu={handleLuuDiem}
              onXemMinhChung={openPreview}
              onTaiMinhChung={downloadMinhChung}
            />
          );
        })
      )}

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />

      {moTraLai && (
        <TraLaiPhieuModal
          hoTen={nv.hoTen}
          dangGui={dangTraLai}
          onDong={() => setMoTraLai(false)}
          onXacNhan={handleTraLai}
        />
      )}
    </div>
  );
};

export default ChamDiemPhieu;
