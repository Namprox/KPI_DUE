import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import {
  fetchLichSuChamDiemPhieu,
  fetchPhieuDetail,
  fetchTieuChiTheoMau,
  formatNgayGio,
  gomLichSuTheoChiTiet,
  laTieuChiChamTay,
  tinhTongDiemTamTinh,
  TRANG_THAI_DONG,
} from '../../utils/phieuApi';
import { useMinhChungPhieuPreview } from '../../hooks/useMinhChungPhieuPreview';
import FilePreviewModal from '../../components/Common/FilePreviewModal';
import TienDoCham from '../../components/QuanLyChamDiem/TienDoCham';
import TieuChiChamCard from '../../components/QuanLyChamDiem/TieuChiChamCard';
import TongDiemMeta from '../../components/QuanLyChamDiem/TongDiemMeta';
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from '../../components/QuanLyChamDiem/TrangThaiBadge';

/**
 * Bản CHỈ ĐỌC của màn hình thẩm định, dành cho chủ phiếu.
 *
 * Dựng lại đúng danh sách tiêu chí mà Trưởng khoa / đơn vị thẩm định nhìn thấy
 * (điểm tự chấm · điểm đơn vị · điểm chính thức, minh chứng, lịch sử chấm, lý do
 * trả về) nhưng KHÔNG có bất kỳ thao tác ghi nào: TieuChiChamCard nhận
 * choPhepNhap = false nên toàn bộ nút duyệt / sửa / trả về đều không được dựng.
 *
 * Phạm vi dữ liệu do server quyết định — GET api/phieu/{id} chỉ trả phiếu trong
 * phạm vi của người gọi, giảng viên chỉ đọc được phiếu của chính mình. Trang này
 * không tự kiểm tra lại quyền, chỉ hiển thị lỗi mà API trả về.
 */
const ChiTietPhieuCuaToi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);

  const [phieu, setPhieu] = useState(null);
  const [lichSuItems, setLichSuItems] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(true);
  const [tieuChiMauMap, setTieuChiMauMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState('');

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) =>
      toast.current?.show({
        severity: 'error',
        summary: 'Lỗi',
        detail: message,
        life: 4000,
      }),
    );

  const taiPhieu = useCallback(async () => {
    setIsLoading(true);
    try {
      const item = await fetchPhieuDetail(id);
      if (!item) {
        setLoiTai('Không tìm thấy phiếu này, hoặc phiếu không thuộc về bạn.');
        setPhieu(null);
        return;
      }
      setPhieu(item);
      setLoiTai('');
    } catch (error) {
      console.error('Lỗi tải phiếu:', error);
      setLoiTai(error.message);
      setPhieu(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    taiPhieu();
  }, [taiPhieu]);

  // Lịch sử chấm lấy một lần cho cả phiếu rồi phát xuống từng thẻ. Hỏng thì chỉ
  // mất khối tham khảo trong thẻ, không chặn màn hình.
  useEffect(() => {
    let huy = false;
    setDangTaiLichSu(true);
    fetchLichSuChamDiemPhieu(id)
      .then((items) => {
        if (!huy) setLichSuItems(items);
      })
      .catch((error) => {
        console.error('Lỗi tải lịch sử chấm điểm:', error);
        if (!huy) setLichSuItems([]);
      })
      .finally(() => {
        if (!huy) setDangTaiLichSu(false);
      });
    return () => {
      huy = true;
    };
  }, [id]);

  // Chỉ cần loai_nhom của mẫu để tách tổng điểm cơ bản / vượt trội; thiếu thì hai
  // ô đó bỏ trống chứ không ảnh hưởng phần còn lại.
  useEffect(() => {
    if (!phieu?.IdMau) return undefined;
    let huy = false;
    fetchTieuChiTheoMau(phieu.IdMau)
      .then((map) => {
        if (!huy) setTieuChiMauMap(map);
      })
      .catch((error) => {
        console.error('Lỗi tải chi tiết mẫu đánh giá:', error);
      });
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);

  const lichSuTheoChiTiet = useMemo(
    () => gomLichSuTheoChiTiet(lichSuItems),
    [lichSuItems],
  );

  const tamTinh = useMemo(
    () => tinhTongDiemTamTinh(chiTietList, tieuChiMauMap),
    [chiTietList, tieuChiMauMap],
  );

  // Mẫu số là tiêu chí CHẤM TAY: dòng điểm tự động được engine chốt ngay lúc nộp
  // nên gộp vào sẽ khiến thanh tiến độ báo gần đầy khi chưa ai thẩm định.
  const tienDo = useMemo(() => {
    const chamTay = chiTietList.filter(laTieuChiChamTay);
    return {
      tong: chamTay.length,
      xong: chamTay.filter(
        (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT,
      ).length,
      tuDong: chiTietList.length - chamTay.length,
    };
  }, [chiTietList]);

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
        <div className="modern-table-card">
          <div className="cd-empty">
            <i
              className="fa-solid fa-triangle-exclamation"
              style={{ color: '#f59e0b' }}
            ></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>
              Không mở được phiếu
            </h3>
            <p style={{ margin: '0 0 20px 0' }}>
              {loiTai || 'Phiếu không tồn tại.'}
            </p>
            <button
              className="btn-cancel"
              style={{ margin: '0 auto' }}
              onClick={() => navigate('/lich-su-danh-gia')}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách phiếu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-link-btn"
          style={{ marginBottom: '8px' }}
          onClick={() => navigate('/lich-su-danh-gia')}
        >
          <i className="fa-solid fa-arrow-left"></i> Phiếu đánh giá của tôi
        </button>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Kết quả chấm điểm — năm học {phieu.IdNam}
        </h2>
        <span className="breadcrumb">
          Lần đánh giá {phieu.LanDanhGia}
          {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ''} · Chỉ
          xem, không chỉnh sửa
        </span>
      </div>

      <div className="cd-phieu-header">
        <div className="cd-phieu-top">
          <TrangThaiBadge trangThai={phieu.TrangThai} />
          {tienDo.tong > 0 && (
            <TienDoCham
              xong={tienDo.xong}
              tong={tienDo.tong}
              nhan="Tiêu chí đã chốt điểm"
              ghiChu={
                tienDo.tuDong > 0
                  ? `Không tính ${tienDo.tuDong} tiêu chí hệ thống tự chấm`
                  : undefined
              }
            />
          )}
        </div>

        <div className="cd-meta-grid">
          <TongDiemMeta phieu={phieu} tamTinh={tamTinh} />
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
            <div className="cd-meta-value">
              {formatNgayGio(phieu.NgayCapNhat)}
            </div>
          </div>
        </div>

        {phieu.TongDiemTichLuy == null && tamTinh && (
          <div className="cd-hint">
            <i className="fa-solid fa-circle-info"></i> Hệ thống chỉ lưu tổng điểm
            vào hồ sơ khi Trưởng khoa chốt. Số “tạm tính” do trình duyệt cộng từ
            điểm hiện có của từng tiêu chí
            {tamTinh.soDongChuaChot > 0
              ? `, còn ${tamTinh.soDongChuaChot} tiêu chí chưa chốt điểm.`
              : '.'}
          </div>
        )}

        {phieu.NhanXetKhoa && (
          <div className="cd-box" style={{ marginTop: '16px' }}>
            <div className="cd-box-title">Nhận xét của đơn vị</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>
              {phieu.NhanXetKhoa}
            </div>
          </div>
        )}
        {phieu.NhanXetTruong && (
          <div className="cd-box" style={{ marginTop: '10px' }}>
            <div className="cd-box-title">Nhận xét của Hiệu trưởng</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>
              {phieu.NhanXetTruong}
            </div>
          </div>
        )}
      </div>

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
        chiTietList.map((ct, index) => (
          <TieuChiChamCard
            key={ct.IdChiTiet}
            chiTiet={ct}
            stt={index + 1}
            lichSu={lichSuTheoChiTiet.get(Number(ct.IdChiTiet)) || []}
            dangTaiLichSu={dangTaiLichSu}
            choPhepNhap={false}
            lyDoKhoa="Điểm do đơn vị thẩm định chấm. Bạn chỉ xem, muốn sửa điểm phải chờ tiêu chí được trả về."
            onXemMinhChung={openPreview}
            onTaiMinhChung={downloadMinhChung}
          />
        ))
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
    </div>
  );
};

export default ChiTietPhieuCuaToi;
