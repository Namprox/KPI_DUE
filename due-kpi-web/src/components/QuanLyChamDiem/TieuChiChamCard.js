import React, { useEffect, useState } from 'react';
import {
  fetchLichSuChamDiem,
  fetchMinhChung,
  fetchNhiemVuCongDong,
  formatDiem,
  formatNgayGio,
  laTieuChiChamTay,
  TEN_CAP_CHAM,
  TEN_HANH_DONG_CHAM,
} from '../../utils/phieuApi';
import {
  duoiFile,
  formatKb,
  iconFile,
  laMinhChungFile,
  LOAI_MINH_CHUNG,
} from '../../utils/minhChungPhieuApi';

/**
 * Một minh chứng. Tệp tải lên (LoaiMinhChung = 1) phải đi qua
 * GET api/minhchung/{id}/tai-ve — endpoint nằm sau [TokenAuthorize] nên không gắn
 * được vào <a href>, việc tải blob do useMinhChungPhieuPreview ở trang cha lo.
 * Liên kết / DOI (loại 2, 3) không có tệp trên đĩa nên mở thẳng DuongDan.
 */
const MinhChungRow = ({ mc, onXem, onTai }) => {
  const nhan = mc.TenHienThi || mc.TenFileGoc || mc.DuongDan;

  if (!laMinhChungFile(mc)) {
    return (
      <div className="cd-mc-row">
        <i className="fa-solid fa-link cd-mc-icon" style={{ color: '#0ea5e9' }}></i>
        <div className="cd-mc-main">
          <a
            className="cd-mc-name"
            href={mc.DuongDan}
            target="_blank"
            rel="noreferrer"
            title={mc.DuongDan}
          >
            {nhan}
          </a>
          <div className="cd-mc-meta">
            {Number(mc.LoaiMinhChung) === LOAI_MINH_CHUNG.DOI
              ? 'DOI / liên kết học thuật'
              : 'Liên kết ngoài'}
          </div>
        </div>
        <a
          className="cd-mc-act"
          href={mc.DuongDan}
          target="_blank"
          rel="noreferrer"
          title="Mở liên kết trong tab mới"
        >
          <i className="fa-solid fa-arrow-up-right-from-square"></i> Mở
        </a>
      </div>
    );
  }

  const icon = iconFile(mc);
  const meta = [
    duoiFile(mc) ? duoiFile(mc).toUpperCase() : null,
    mc.KichThuocKb != null ? formatKb(mc.KichThuocKb) : null,
    mc.NgayTaiLen ? formatNgayGio(mc.NgayTaiLen) : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="cd-mc-row">
      <i className={`${icon.className} cd-mc-icon`} style={{ color: icon.color }}></i>
      <div className="cd-mc-main">
        <button
          type="button"
          className="cd-mc-name"
          onClick={() => onXem(mc)}
          title={`Xem trước: ${nhan}`}
        >
          {nhan}
        </button>
        <div className="cd-mc-meta">{meta || '—'}</div>
      </div>
      <button type="button" className="cd-mc-act" onClick={() => onXem(mc)} title="Xem trước tệp">
        <i className="fa-solid fa-eye"></i> Xem
      </button>
      <button type="button" className="cd-mc-act" onClick={() => onTai(mc)} title="Tải tệp về máy">
        <i className="fa-solid fa-download"></i> Tải về
      </button>
    </div>
  );
};

/**
 * Một tiêu chí trên màn hình chấm.
 *
 * Điểm quan trọng về dữ liệu: GET api/phieu/{id} đã nhúng sẵn MinhChung[] và
 * NhiemVuCongDong[] trong từng chi tiết, nên chỉ gọi API khi bản ghi thiếu mảng
 * đó (tránh n request thừa). Lịch sử chấm điểm không nằm trong detail nên phải
 * gọi riêng, và chỉ gọi khi tiêu chí đã từng được chấm — tiêu chí chưa ai chấm
 * chắc chắn chưa có lượt nào, gọi cũng chỉ nhận về mảng rỗng.
 */
const TieuChiChamCard = ({
  chiTiet,
  stt,
  choPhepNhap,
  lyDoKhoa,
  dangLuu,
  onLuu,
  onXemMinhChung,
  onTaiMinhChung,
}) => {
  const chamTay = laTieuChiChamTay(chiTiet);
  const daCham = chiTiet.DiemKhoa != null;

  const [diem, setDiem] = useState(chiTiet.DiemKhoa ?? '');
  const [nhanXet, setNhanXet] = useState(chiTiet.NhanXetKhoa ?? '');
  const [loiNhap, setLoiNhap] = useState('');
  const [daThuGon, setDaThuGon] = useState(false);

  const [minhChung, setMinhChung] = useState(
    Array.isArray(chiTiet.MinhChung) ? chiTiet.MinhChung : null,
  );
  const [nhiemVu, setNhiemVu] = useState(
    Array.isArray(chiTiet.NhiemVuCongDong) ? chiTiet.NhiemVuCongDong : null,
  );
  const [lichSu, setLichSu] = useState(null);
  const [dangTaiPhu, setDangTaiPhu] = useState(false);

  // Sau mỗi lần lưu, phiếu được tải lại → đồng bộ lại ô nhập theo dữ liệu server
  // (nếu không giá trị cũ của người dùng sẽ che mất giá trị server vừa ghi nhận)
  // rồi nạp phần dữ liệu kèm theo còn thiếu. Lịch sử luôn nạp lại vì lượt chấm
  // vừa lưu chính là một dòng mới trong đó.
  useEffect(() => {
    setDiem(chiTiet.DiemKhoa ?? '');
    setNhanXet(chiTiet.NhanXetKhoa ?? '');
    setLoiNhap('');

    const mcNhung = Array.isArray(chiTiet.MinhChung) ? chiTiet.MinhChung : null;
    const nvNhung = Array.isArray(chiTiet.NhiemVuCongDong) ? chiTiet.NhiemVuCongDong : null;
    setMinhChung(mcNhung);
    setNhiemVu(nvNhung);
    setLichSu(null);

    const canTaiMinhChung = mcNhung === null;
    const canTaiNhiemVu = nvNhung === null;
    const canTaiLichSu =
      chiTiet.DiemKhoa != null || chiTiet.DiemChinhThuc != null || !!chiTiet.NgayDgKhoa;
    if (!canTaiMinhChung && !canTaiNhiemVu && !canTaiLichSu) return undefined;

    let huy = false;
    setDangTaiPhu(true);
    Promise.allSettled([
      canTaiMinhChung ? fetchMinhChung(chiTiet.IdChiTiet) : Promise.resolve(mcNhung),
      canTaiNhiemVu ? fetchNhiemVuCongDong(chiTiet.IdChiTiet) : Promise.resolve(nvNhung),
      canTaiLichSu ? fetchLichSuChamDiem(chiTiet.IdChiTiet) : Promise.resolve([]),
    ]).then((ketQua) => {
      if (huy) return;
      // Một endpoint lỗi (403/404) không được làm hỏng cả panel — coi như rỗng.
      setMinhChung(ketQua[0].status === 'fulfilled' ? ketQua[0].value : []);
      setNhiemVu(ketQua[1].status === 'fulfilled' ? ketQua[1].value : []);
      setLichSu(ketQua[2].status === 'fulfilled' ? ketQua[2].value : []);
      setDangTaiPhu(false);
    });

    return () => {
      huy = true;
    };
  }, [chiTiet]);

  const kiemTraDiem = (giaTri) => {
    if (giaTri === '' || giaTri === null) return 'Chưa nhập điểm';
    const so = Number(giaTri);
    if (isNaN(so)) return 'Điểm phải là số';
    if (so < 0) return 'Điểm không được âm';
    if (chiTiet.DiemToiDa != null && so > Number(chiTiet.DiemToiDa)) {
      return `Điểm vượt mức tối đa (${formatDiem(chiTiet.DiemToiDa)})`;
    }
    return '';
  };

  const handleLuu = () => {
    const loi = kiemTraDiem(diem);
    if (loi) {
      setLoiNhap(loi);
      return;
    }
    setLoiNhap('');
    onLuu(chiTiet, { diem: Number(diem), nhanXet: nhanXet.trim() || null });
  };

  const coThayDoi =
    String(diem) !== String(chiTiet.DiemKhoa ?? '') ||
    (nhanXet || '') !== (chiTiet.NhanXetKhoa || '');

  const lopThe = !chamTay ? 'cd-tu-dong' : daCham ? 'cd-da-cham' : choPhepNhap ? 'cd-mo-nhap' : '';

  // Khối kèm theo chỉ dựng cho phần thực sự có dữ liệu và mặc định mở sẵn —
  // tiêu chí trống thì không cần một hàng "không có gì" để người chấm bấm vào.
  const coMinhChung = (minhChung?.length ?? 0) > 0;
  const coNhiemVu = (nhiemVu?.length ?? 0) > 0;
  const coLichSu = (lichSu?.length ?? 0) > 0;
  const coDuLieuPhu = coMinhChung || coNhiemVu || coLichSu;
  const moRong = !daThuGon;

  const nhanKhoiPhu = [
    coMinhChung ? `minh chứng (${minhChung.length})` : null,
    coNhiemVu ? `nhiệm vụ cộng đồng (${nhiemVu.length})` : null,
    coLichSu ? 'lịch sử chấm' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={`cd-tieu-chi ${lopThe}`}>
      <div className="cd-tc-head">
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <p className="cd-tc-ten">
            {stt}. {chiTiet.TenTieuChi || `Tiêu chí #${chiTiet.IdTieuChi}`}
          </p>
          <div>
            <span className="cd-tc-tag">Tối đa {formatDiem(chiTiet.DiemToiDa)}</span>
            <span className="cd-tc-tag">
              {chamTay ? (
                <>
                  <i className="fa-solid fa-pen-to-square"></i> Chấm tay
                </>
              ) : (
                <>
                  <i className="fa-solid fa-robot"></i> Điểm tự động
                </>
              )}
            </span>
            {chiTiet.LaTruongHopDacBiet && (
              <span
                className="cd-tc-tag"
                style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                title={chiTiet.LyDoDacBiet || ''}
              >
                <i className="fa-solid fa-star"></i> Trường hợp đặc biệt
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="cd-meta-label">GV tự chấm</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#334155' }}>
              {formatDiem(chiTiet.DiemTuDanhGia)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="cd-meta-label">Đơn vị chấm</div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: daCham ? '#047857' : '#cbd5e1',
              }}
            >
              {formatDiem(chiTiet.DiemKhoa)}
            </div>
          </div>
          {chiTiet.DiemChinhThuc != null && (
            <div style={{ textAlign: 'center' }}>
              <div className="cd-meta-label">Chính thức</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#1d4ed8' }}>
                {formatDiem(chiTiet.DiemChinhThuc)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cd-tc-body">
        <div>
          <div className="cd-box">
            <div className="cd-box-title">Giảng viên tự đánh giá</div>
            {chiTiet.MoTaHoanThanh ? (
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                {chiTiet.MoTaHoanThanh}
              </p>
            ) : (
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                Không có mô tả mức độ hoàn thành.
              </p>
            )}
            {chiTiet.NhanXetTuDanhGia && (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                <i className="fa-solid fa-quote-left" style={{ marginRight: '6px', color: '#cbd5e1' }}></i>
                {chiTiet.NhanXetTuDanhGia}
              </p>
            )}
          </div>

          {dangTaiPhu && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu kèm theo...
            </div>
          )}

          {coDuLieuPhu && (
            <button
              type="button"
              className="cd-link-btn"
              style={{ marginTop: '10px' }}
              onClick={() => setDaThuGon((truoc) => !truoc)}
            >
              <i className={`fa-solid ${moRong ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              {moRong ? 'Thu gọn' : `Xem ${nhanKhoiPhu}`}
            </button>
          )}

          {coDuLieuPhu && moRong && (
            <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
              {coMinhChung && (
                <div className="cd-box">
                  <div className="cd-box-title">Minh chứng ({minhChung.length})</div>
                  <div>
                    {minhChung.map((mc) => (
                      <MinhChungRow
                        key={mc.IdMinhChung}
                        mc={mc}
                        onXem={onXemMinhChung}
                        onTai={onTaiMinhChung}
                      />
                    ))}
                  </div>
                </div>
              )}

              {coNhiemVu && (
                <div className="cd-box">
                  <div className="cd-box-title">Nhiệm vụ cộng đồng ({nhiemVu.length})</div>
                  <table className="custom-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 10px' }}>Nhiệm vụ</th>
                        <th style={{ padding: '8px 10px' }}>Nhóm</th>
                        <th style={{ padding: '8px 10px' }}>Vai trò</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nhiemVu.map((nv) => (
                        <tr key={nv.IdNhiemVu}>
                          <td style={{ padding: '8px 10px' }}>{nv.TenNhiemVu}</td>
                          <td style={{ padding: '8px 10px' }}>{nv.TenNhom || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{nv.TenVaiTro || '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {formatDiem(nv.DiemSnapshot)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {coLichSu && (
                <div className="cd-box">
                  <div className="cd-box-title">Lịch sử chấm điểm</div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {lichSu.map((nhom) => (
                      <div key={`${nhom.LanDanhGia}-${nhom.Cap}`}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Vòng {nhom.LanDanhGia} · {TEN_CAP_CHAM[nhom.Cap] || `Cấp ${nhom.Cap}`}
                        </div>
                        {(nhom.Entries || []).map((e) => (
                          <div key={e.IdLichSu} style={{ fontSize: '12px', color: '#64748b', paddingLeft: '10px' }}>
                            <b style={{ color: '#0f172a' }}>{formatDiem(e.Diem)}</b> ·{' '}
                            {TEN_HANH_DONG_CHAM[e.HanhDong] || 'Cập nhật'} bởi {e.TenNguoiThucHien || `#${e.IdNguoiThucHien}`} ·{' '}
                            {formatNgayGio(e.NgayThucHien)}
                            {e.NhanXet ? ` — ${e.NhanXet}` : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`cd-box cd-cham-box${choPhepNhap ? '' : ' cd-khoa'}`}>
          <div className="cd-box-title">
            {choPhepNhap ? 'Chấm điểm đơn vị' : 'Điểm đơn vị (chỉ đọc)'}
          </div>

          <label className="cd-label" htmlFor={`diem-${chiTiet.IdChiTiet}`}>
            Điểm (0 – {formatDiem(chiTiet.DiemToiDa)})
          </label>
          <input
            id={`diem-${chiTiet.IdChiTiet}`}
            type="number"
            step="0.01"
            min="0"
            max={chiTiet.DiemToiDa ?? undefined}
            className="cd-diem-input"
            value={diem}
            disabled={!choPhepNhap || dangLuu}
            onChange={(e) => {
              setDiem(e.target.value);
              if (loiNhap) setLoiNhap('');
            }}
          />

          <label className="cd-label" style={{ marginTop: '12px' }} htmlFor={`nx-${chiTiet.IdChiTiet}`}>
            Nhận xét
          </label>
          <textarea
            id={`nx-${chiTiet.IdChiTiet}`}
            className="cd-textarea"
            value={nhanXet}
            disabled={!choPhepNhap || dangLuu}
            placeholder="Nhận xét của đơn vị (không bắt buộc)"
            onChange={(e) => setNhanXet(e.target.value)}
          />

          {loiNhap && (
            <div className="cd-hint cd-hint-error">
              <i className="fa-solid fa-circle-exclamation"></i> {loiNhap}
            </div>
          )}

          {choPhepNhap ? (
            <button
              type="button"
              className="btn-submit"
              style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
              disabled={dangLuu || !coThayDoi}
              onClick={handleLuu}
            >
              {dangLuu ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> {daCham ? 'Cập nhật điểm' : 'Lưu điểm'}
                </>
              )}
            </button>
          ) : (
            <div className="cd-hint cd-hint-warn" style={{ marginTop: '10px' }}>
              <i className="fa-solid fa-lock"></i> {lyDoKhoa}
            </div>
          )}

          {chiTiet.NgayDgKhoa && (
            <div className="cd-hint">Chấm lúc {formatNgayGio(chiTiet.NgayDgKhoa)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TieuChiChamCard;
