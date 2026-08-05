import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import {
  fetchDiemPhanHoiSv,
  fetchDinhMucApDung,
  fetchGioGiangTheoNam,
  fetchGioNckhThucTe,
  fetchNckhGiangVien,
  fetchViPhamGiangVien,
  formatDiem,
  formatNgay,
  kyHocCuaNam,
} from '../../utils/phieuApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { chuCaiDau, thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';

const TABS = [
  { key: 'dinhMuc', nhan: 'Định mức', icon: 'fa-scale-balanced' },
  { key: 'nckh', nhan: 'NCKH', icon: 'fa-flask' },
  { key: 'gioGiang', nhan: 'Giờ giảng', icon: 'fa-chalkboard-user' },
  { key: 'viPham', nhan: 'Vi phạm', icon: 'fa-circle-exclamation' },
  { key: 'phanHoi', nhan: 'Phản hồi SV', icon: 'fa-star-half-stroke' },
];

/** Khối dữ liệu tự xử lý ba trạng thái: đang tải / lỗi (403 rất hay gặp) / rỗng. */
const Khoi = ({ tieuDe, trangThai, children, moTa }) => (
  <div className="modern-table-card" style={{ padding: '18px 20px', marginBottom: '16px' }}>
    <div className="cd-box-title" style={{ marginBottom: moTa ? '4px' : '12px' }}>
      {tieuDe}
    </div>
    {moTa && <div className="cd-hint" style={{ marginTop: 0, marginBottom: '12px' }}>{moTa}</div>}

    {trangThai.dangTai ? (
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        <i className="fa-solid fa-spinner fa-spin"></i> Đang tải...
      </div>
    ) : trangThai.loi ? (
      <div className="cd-hint cd-hint-warn">
        <i className="fa-solid fa-circle-exclamation"></i> {trangThai.loi}
      </div>
    ) : (
      children
    )}
  </div>
);

const Dong = ({ nhan, giaTri, nhanMau }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '8px 0',
      borderBottom: '1px dashed #e2e8f0',
      fontSize: '13px',
    }}
  >
    <span style={{ color: '#64748b' }}>{nhan}</span>
    <b style={{ color: nhanMau || '#0f172a' }}>{giaTri}</b>
  </div>
);

/**
 * Hồ sơ KPI của một giảng viên — tab tra cứu mở cạnh màn hình chấm.
 *
 * Mỗi nguồn dữ liệu được tải và hỏng độc lập: quyền xem định mức, NCKH, phản hồi
 * SV do các controller khác nhau kiểm soát nên một 403 chỉ được làm hỏng đúng
 * khối của nó, không được làm trắng cả trang.
 */
const HoSoKpiGiangVien = () => {
  const { idNv } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  // Năm trên URL thắng mặc định: màn hình chấm điều hướng sang kèm ?idNam=
  const namTuUrl = searchParams.get('idNam');
  const idNam = namTuUrl || selectedNam;

  const [tab, setTab] = useState('dinhMuc');
  const [dinhMuc, setDinhMuc] = useState({ dangTai: true, loi: '', data: null, gioNckh: null });
  const [nckh, setNckh] = useState({ dangTai: true, loi: '', data: null });
  const [gioGiang, setGioGiang] = useState({ dangTai: true, loi: '', rows: [] });
  const [viPham, setViPham] = useState({ dangTai: true, loi: '', rows: [] });
  const [phanHoi, setPhanHoi] = useState({ dangTai: true, loi: '', item: null, dotChot: null });

  const nv = thongTinNhanVien(nhanVienIndex, idNv);

  const taiTatCa = useCallback(async () => {
    if (!idNam || !idNv) return;

    setDinhMuc({ dangTai: true, loi: '', data: null, gioNckh: null });
    Promise.allSettled([fetchDinhMucApDung(idNv, idNam), fetchGioNckhThucTe(idNv, idNam)]).then(
      ([dm, gio]) => {
        setDinhMuc({
          dangTai: false,
          loi: dm.status === 'rejected' ? dm.reason.message : '',
          data: dm.status === 'fulfilled' ? dm.value : null,
          gioNckh: gio.status === 'fulfilled' ? gio.value : null,
        });
      },
    );

    setNckh({ dangTai: true, loi: '', data: null });
    fetchNckhGiangVien(idNv, idNam)
      .then((data) => setNckh({ dangTai: false, loi: '', data }))
      .catch((error) => setNckh({ dangTai: false, loi: error.message, data: null }));

    setGioGiang({ dangTai: true, loi: '', rows: [] });
    fetchGioGiangTheoNam(idNam)
      .then((rows) => setGioGiang({ dangTai: false, loi: '', rows }))
      .catch((error) => setGioGiang({ dangTai: false, loi: error.message, rows: [] }));

    setViPham({ dangTai: true, loi: '', rows: [] });
    fetchViPhamGiangVien({ idNam, idNhanVien: idNv })
      .then((rows) => setViPham({ dangTai: false, loi: '', rows }))
      .catch((error) => setViPham({ dangTai: false, loi: error.message, rows: [] }));

    setPhanHoi({ dangTai: true, loi: '', item: null, dotChot: null });
    fetchDiemPhanHoiSv(idNam)
      .then(({ dotChot, items }) =>
        setPhanHoi({
          dangTai: false,
          loi: '',
          dotChot,
          item: items.find((x) => String(x.IdNhanVien) === String(idNv)) || null,
        }),
      )
      .catch((error) => setPhanHoi({ dangTai: false, loi: error.message, item: null, dotChot: null }));
  }, [idNv, idNam]);

  useEffect(() => {
    if (!dangTaiNam) taiTatCa();
  }, [dangTaiNam, taiTatCa]);

  /**
   * gio_giang_import không lưu id_nhan_vien, chỉ lưu HoTen — buộc phải khớp theo
   * tên. Chuẩn hóa khoảng trắng + bỏ dấu phân biệt hoa thường; trùng tên sẽ ra
   * nhiều dòng và người dùng cần tự đối chiếu (giới hạn của dữ liệu nguồn).
   */
  const gioGiangCuaGv = useMemo(() => {
    const ten = nv.hoTen?.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!ten || !nv.coTen) return [];
    return gioGiang.rows.filter(
      (r) => String(r.HoTen || '').trim().toLowerCase().replace(/\s+/g, ' ') === ten,
    );
  }, [gioGiang.rows, nv.hoTen, nv.coTen]);

  const tongGioGiang = useMemo(
    () =>
      gioGiangCuaGv.reduce(
        (acc, r) => ({
          quiDoi: acc.quiDoi + (Number(r.TongGioQuiDoi) || 0),
          thucLinh: acc.thucLinh + (Number(r.TongGioThucLinh) || 0),
          dinhMuc: acc.dinhMuc + (Number(r.DinhMucGioChuan) || 0),
        }),
        { quiDoi: 0, thucLinh: 0, dinhMuc: 0 },
      ),
    [gioGiangCuaGv],
  );

  const viPhamCuaGv = viPham.rows[0] || null;

  const doiNam = (value) => {
    setSelectedNam(value);
    // Giữ URL đồng bộ để nút quay lại / chia sẻ link vẫn đúng năm đang xem.
    setSearchParams(value ? { idNam: value } : {}, { replace: true });
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button className="cd-link-btn" style={{ marginBottom: '8px' }} onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>

        <div
          style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <div className="teacher-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
            {chuCaiDau(nv.hoTen)}
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
              {nv.hoTen}
            </h2>
            <span className="breadcrumb">
              {nv.maNhanVien && <span className="code-pill" style={{ marginRight: '8px' }}>{nv.maNhanVien}</span>}
              {nv.tenDonVi || '—'}
              {nv.tenChucDanh ? ` · ${nv.tenChucDanh}` : ''}
            </span>
          </div>

          <div className="cd-field" style={{ maxWidth: '200px' }}>
            <label className="cd-label">Năm đánh giá</label>
            <select
              className="form-input"
              value={idNam}
              onChange={(e) => doiNam(e.target.value)}
              disabled={dangTaiNam}
            >
              {namList.map((n) => (
                <option key={n.IdNam} value={n.IdNam}>
                  Năm học {n.IdNam}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="cd-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`cd-tab${tab === t.key ? ' cd-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`fa-solid ${t.icon}`}></i> {t.nhan}
          </button>
        ))}
      </div>

      {tab === 'dinhMuc' && (
        <>
          <Khoi
            tieuDe="Định mức áp dụng (sau ngoại lệ)"
            trangThai={dinhMuc}
            moTa="Định mức gốc theo chức danh, đã trừ/nhân các ngoại lệ đang hiệu lực của giảng viên."
          >
            {dinhMuc.data ? (
              <>
                <div className="stat-card-grid" style={{ marginBottom: '16px' }}>
                  <div className="stat-card">
                    <div className="stat-icon-box stat-icon-blue">
                      <i className="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <div>
                      <div className="stat-label">Giờ giảng áp dụng</div>
                      <div className="stat-value">{formatDiem(dinhMuc.data.GioGiangApDung, 1)}</div>
                      <div className="cd-hint">gốc {formatDiem(dinhMuc.data.GioGiangBase, 1)}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-box stat-icon-purple">
                      <i className="fa-solid fa-flask"></i>
                    </div>
                    <div>
                      <div className="stat-label">Giờ NCKH áp dụng</div>
                      <div className="stat-value">{formatDiem(dinhMuc.data.GioNckhApDung, 1)}</div>
                      <div className="cd-hint">gốc {formatDiem(dinhMuc.data.GioNckhBase, 1)}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-box stat-icon-green">
                      <i className="fa-solid fa-hands-holding-circle"></i>
                    </div>
                    <div>
                      <div className="stat-label">Giờ PVCĐ áp dụng</div>
                      <div className="stat-value">{formatDiem(dinhMuc.data.GioPvcdApDung, 1)}</div>
                      <div className="cd-hint">gốc {formatDiem(dinhMuc.data.GioPvcdBase, 1)}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-box stat-icon-amber">
                      <i className="fa-solid fa-flask-vial"></i>
                    </div>
                    <div>
                      <div className="stat-label">Giờ NCKH thực tế</div>
                      <div className="stat-value">
                        {formatDiem(dinhMuc.gioNckh?.GioNckhThucTe, 1)}
                      </div>
                      <div className="cd-hint">đã cộng giờ thêm từ ngoại lệ</div>
                    </div>
                  </div>
                </div>

                <Dong nhan="Chức danh" giaTri={dinhMuc.data.TenChucDanh || '—'} />
                <Dong nhan="Hệ số NCKH áp dụng" giaTri={formatDiem(dinhMuc.data.HeSoNckhApDung)} />
                <Dong
                  nhan="Miễn điều kiện NCKH (tập sự)"
                  giaTri={dinhMuc.data.MienNckh ? 'Có' : 'Không'}
                  nhanMau={dinhMuc.data.MienNckh ? '#b45309' : undefined}
                />
                {dinhMuc.data.LyDoDieuChinh && (
                  <div className="cd-box" style={{ marginTop: '12px' }}>
                    <div className="cd-box-title">Lý do điều chỉnh</div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      {dinhMuc.data.LyDoDieuChinh}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="cd-hint">Chưa cấu hình định mức cho giảng viên trong năm này.</div>
            )}
          </Khoi>
        </>
      )}

      {tab === 'nckh' && (
        <Khoi
          tieuDe={`Nghiên cứu khoa học${nckh.data?.IdNam ? ` — năm ${nckh.data.IdNam}` : ''}`}
          trangThai={nckh}
          moTa="Bài báo, đề tài và sách tích lũy toàn thời gian; tổng hợp/phân loại theo năm snapshot."
        >
          {nckh.data?.HoSo ? (
            <>
              <div className="stat-card-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-newspaper"></i>
                  </div>
                  <div>
                    <div className="stat-label">Bài báo</div>
                    <div className="stat-value">{nckh.data.BaiBao?.length || 0}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-purple">
                    <i className="fa-solid fa-diagram-project"></i>
                  </div>
                  <div>
                    <div className="stat-label">Đề tài</div>
                    <div className="stat-value">{nckh.data.DeTai?.length || 0}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-green">
                    <i className="fa-solid fa-book"></i>
                  </div>
                  <div>
                    <div className="stat-label">Sách</div>
                    <div className="stat-value">{nckh.data.Sach?.length || 0}</div>
                  </div>
                </div>
              </div>

              {(nckh.data.BaiBao || []).length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: '8px' }}>
                  <table className="custom-table" style={{ minWidth: '600px', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Bài báo</th>
                        <th style={{ width: '120px' }}>Xếp hạng</th>
                        <th style={{ width: '90px' }}>Năm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nckh.data.BaiBao.map((bb, i) => (
                        <tr key={bb.Id || bb.MaBaiBao || i}>
                          <td>{bb.TenBaiBao || bb.TieuDe || bb.Ten || '—'}</td>
                          <td>
                            <span className="tag-badge">{bb.QRanking || bb.PhanLoai || '—'}</span>
                          </td>
                          <td>{bb.Nam || bb.NamCongBo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="cd-hint">
              Giảng viên chưa được liên kết với hệ NCKH hoặc chưa có dữ liệu đồng bộ.
            </div>
          )}
        </Khoi>
      )}

      {tab === 'gioGiang' && (
        <Khoi
          tieuDe="Giờ giảng đã import"
          trangThai={gioGiang}
          moTa={`Các kỳ ${kyHocCuaNam(idNam).join(', ')}. Dữ liệu import chỉ lưu họ tên nên được khớp theo tên — hãy đối chiếu nếu đơn vị có người trùng tên.`}
        >
          {gioGiangCuaGv.length > 0 ? (
            <>
              <div className="stat-card-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <div>
                    <div className="stat-label">Tổng giờ quy đổi</div>
                    <div className="stat-value">{tongGioGiang.quiDoi.toFixed(1)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-green">
                    <i className="fa-solid fa-hand-holding-dollar"></i>
                  </div>
                  <div>
                    <div className="stat-label">Tổng giờ thực lĩnh</div>
                    <div className="stat-value">{tongGioGiang.thucLinh.toFixed(1)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-scale-balanced"></i>
                  </div>
                  <div>
                    <div className="stat-label">Định mức giờ chuẩn</div>
                    <div className="stat-value">{tongGioGiang.dinhMuc.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '760px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Kỳ học</th>
                      <th style={{ textAlign: 'right' }}>Giờ giảng dạy</th>
                      <th style={{ textAlign: 'right' }}>Giờ CVK</th>
                      <th style={{ textAlign: 'right' }}>Giờ quy đổi</th>
                      <th style={{ textAlign: 'right' }}>Định mức</th>
                      <th style={{ textAlign: 'right' }}>Thực lĩnh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gioGiangCuaGv.map((r) => (
                      <tr key={r.IdGioGiangImport}>
                        <td>
                          <span className="tag-badge">{r.KyHoc}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.TongGioGiangDay, 1)}</td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.TongGioCvk, 1)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatDiem(r.TongGioQuiDoi, 1)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.DinhMucGioChuan, 1)}</td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.TongGioThucLinh, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="cd-hint">
              Không tìm thấy dòng giờ giảng nào khớp họ tên giảng viên trong các kỳ của năm này.
            </div>
          )}
        </Khoi>
      )}

      {tab === 'viPham' && (
        <Khoi
          tieuDe="Tổng hợp vi phạm giảng dạy"
          trangThai={viPham}
          moTa="Điểm trừ cá nhân bị chặn trần 15 điểm/năm theo quy định."
        >
          {viPhamCuaGv ? (
            <>
              <div className="stat-card-grid">
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <div className="stat-label">Số lượt vi phạm</div>
                    <div className="stat-value">{viPhamCuaGv.SoViPham ?? 0}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-arrow-down-9-1"></i>
                  </div>
                  <div>
                    <div className="stat-label">Tổng điểm trừ thô</div>
                    <div className="stat-value">{formatDiem(viPhamCuaGv.TongDiemTruTho)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-purple">
                    <i className="fa-solid fa-scale-unbalanced"></i>
                  </div>
                  <div>
                    <div className="stat-label">Điểm trừ áp dụng (trần 15)</div>
                    <div className="stat-value">{formatDiem(viPhamCuaGv.DiemTruCaNhan)}</div>
                  </div>
                </div>
              </div>
              <button
                className="cd-link-btn"
                style={{ marginTop: '14px' }}
                onClick={() => navigate('/quan-ly/vi-pham')}
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i> Mở màn hình ghi nhận vi phạm
              </button>
            </>
          ) : (
            <div className="cd-hint">Giảng viên không có vi phạm nào được ghi nhận trong năm này.</div>
          )}
        </Khoi>
      )}

      {tab === 'phanHoi' && (
        <Khoi
          tieuDe="Điểm trung bình phản hồi sinh viên"
          trangThai={phanHoi}
          moTa={
            phanHoi.dotChot
              ? `Chốt ngày ${formatNgay(phanHoi.dotChot.NgayChot)} bởi ${
                  phanHoi.dotChot.NguoiChotHoTen || '—'
                } · ${phanHoi.dotChot.SoGiangVien} giảng viên`
              : undefined
          }
        >
          {phanHoi.item ? (
            <div className="stat-card-grid">
              <div className="stat-card">
                <div className="stat-icon-box stat-icon-green">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <div className="stat-label">Điểm trung bình</div>
                  <div className="stat-value">{formatDiem(phanHoi.item.DiemTrungBinh)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-box stat-icon-blue">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                  <div className="stat-label">Số lượt đánh giá</div>
                  <div className="stat-value">{phanHoi.item.SoLuotDanhGia ?? 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="cd-hint">
              Năm này chưa chốt điểm phản hồi sinh viên, hoặc giảng viên không có trong đợt chốt.
            </div>
          )}
        </Khoi>
      )}
    </div>
  );
};

export default HoSoKpiGiangVien;
