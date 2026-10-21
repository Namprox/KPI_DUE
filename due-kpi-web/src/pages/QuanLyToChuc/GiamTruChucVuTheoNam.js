import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchSelect from '../../components/Common/SearchSelect';
import { fetchGiamTruChucVu, saveGiamTruChucVu, requestDanhMuc, giamTruPayload, hienThiGiamTru, nguonGiamTru, LOAI_GIAM_TRU } from '../../utils/chucVuGiamTruApi';
import '../../css/Pages.css';
import '../../css/QuanLyToChuc/GiamTruChucVuTheoNam.css';

export default function GiamTruChucVuTheoNam() {
  // Quyền sửa đọc TRỌN từ ChoPhepSua của từng dòng: từ đợt 2026-10-20 nó là
  // DuocNhap (GET api/nhan-vien-chuc-vu/quyen - gồm TP / QTP P_TCHC và người
  // được họ ủy quyền) VÀ năm chưa đóng, nên không suy lại từ chức vụ trong token.
  const [params, setParams] = useSearchParams();
  const requestedYear = params.get('idNam');
  const [years, setYears] = useState([]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const defaultYear = years.find((year) => Number(year.TrangThai) === 2) || years.find((year) => Number(year.TrangThai) !== 3) || years[0];
  const idNam = requestedYear || String(defaultYear?.IdNam ?? '');
  const yearExists = years.some((year) => String(year.IdNam) === idNam);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    requestDanhMuc('namdanhgia', { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setYears([...(result.Items || [])].sort((a, b) => b.IdNam - a.IdNam));
      setYearsLoaded(true);
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!yearsLoaded) return;
    const controller = new AbortController();
    generation.current += 1;
    setEditing(null);
    setItems([]);
    setError('');
    if (!idNam || !yearExists) {
      setLoading(false);
      if (idNam) setError(`Năm đánh giá ${idNam} không tồn tại.`);
      return () => controller.abort();
    }
    setLoading(true);
    fetchGiamTruChucVu(idNam, { signal: controller.signal }).then((rows) => {
      if (!controller.signal.aborted) setItems(rows);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); generation.current += 1; };
  }, [idNam, yearExists, yearsLoaded, reload]);

  const edit = (item) => {
    if (item.ChoPhepSua !== true) return;
    setEditing(item);
    setForm({
      LoaiGiamTru: item.LoaiGiamTru || LOAI_GIAM_TRU.TY_LE,
      TyLePhanTram: item.TyLeDinhMucGiang == null ? '' : Number((item.TyLeDinhMucGiang * 100).toFixed(8)),
      GioGiamTruNam: item.GioGiamTruNam ?? '', GhiChuDieuKien: item.GhiChuDieuKien || ''
    });
    setFormError('');
  };
  const save = async (event) => {
    event.preventDefault();
    if (saving || editing?.ChoPhepSua !== true) return;
    const currentGeneration = generation.current;
    setFormError('');
    try {
      const payload = giamTruPayload(form);
      setSaving(true);
      await saveGiamTruChucVu(editing.IdChucVu, idNam, payload);
      if (generation.current !== currentGeneration) return;
      setEditing(null);
      setNotice(`Đã lưu cấu hình riêng năm ${idNam}.`);
      setReload((value) => value + 1);
    } catch (err) {
      if (generation.current !== currentGeneration) return;
      setFormError(err.message);
      // Permission / closure may have changed since opening the form; require a fresh list.
      if (err.status === 403 || err.status === 409) {
        setNotice(err.message);
        setEditing(null);
        setReload((value) => value + 1);
      }
    } finally { setSaving(false); }
  };

  return <div className="page-container gtcv-page">
    <div className="page-header"><div className="header-title"><h2>THIẾT LẬP TỶ LỆ GIẢNG TRỪ THEO NĂM</h2></div></div>
    <div className="gtcv-toolbar"><SearchSelect ariaLabel="Năm đánh giá" value={idNam} disabled={!yearsLoaded || saving} options={years.map((year) => ({ value: year.IdNam, label: `Năm ${year.IdNam}${Number(year.TrangThai) === 3 ? ' (đã đóng)' : ''}` }))} onChange={(value) => { setNotice(''); setParams({ idNam: String(value) }); }} />
    </div>
    {notice && <div role="status" className="gtcv-notice">{notice}</div>}
    {error && <div role="alert" className="gtcv-error">{error}</div>}
    {loading ? <p role="status">Đang tải cấu hình giảm trừ…</p> : !error && <div className="table-card gtcv-table"><table className="custom-table">
      <thead><tr><th>Chức vụ</th><th>Loại giảm trừ</th><th>Mức áp dụng</th><th>Ghi chú điều kiện</th><th>Nguồn</th><th>Thao tác</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.IdChucVu}>
        <td><strong>{item.TenChucVu}</strong><small className="gtcv-meta">{item.MaChucVu}{item.TrangThai === false ? ' · Ngừng hoạt động' : ''}</small></td>
        <td>{item.LoaiGiamTru === LOAI_GIAM_TRU.TY_LE ? 'Theo tỷ lệ' : item.LoaiGiamTru === LOAI_GIAM_TRU.GIO ? 'Giờ cố định' : '-'}</td>
        <td>{item.DaCauHinh ? hienThiGiamTru(item) : '-'}</td><td>{item.GhiChuDieuKien || '-'}</td>
        <td><span className={!item.DaCauHinh ? 'gtcv-missing' : ''}>{nguonGiamTru(item)}</span>
          {item.HoTenNguoiCapNhat && <small className="gtcv-meta">Bản nguồn: {item.HoTenNguoiCapNhat}</small>}</td>
        <td>{item.ChoPhepSua === true ? <button type="button" className="btn-submit gtcv-edit-btn" onClick={() => edit(item)} aria-label={`Sửa giảm trừ ${item.TenChucVu}`}><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Sửa</button> : <span className="gtcv-meta">Chỉ xem</span>}</td>
      </tr>)}{!items.length && <tr><td colSpan={6}>{years.length ? 'Không có chức vụ.' : 'Chưa có năm đánh giá.'}</td></tr>}</tbody>
    </table></div>}
    {editing && <div className="modal-overlay"><div className="modal-box form-modal-box gtcv-modal" role="dialog" aria-modal="true" aria-labelledby="gtcv-title">
      <div className="modal-header"><h3 id="gtcv-title">{editing.TenChucVu} - năm {idNam}</h3><button className="close-btn" aria-label="Đóng" disabled={saving} onClick={() => setEditing(null)}>×</button></div>
      <form onSubmit={save}><div className="modal-body">
        {editing.LaKeThua && <p className="gtcv-help">Đang kế thừa từ năm {editing.IdNamNguon}. Lưu sẽ tạo cấu hình riêng cho năm {idNam}.</p>}
        {formError && <div role="alert" className="gtcv-error">{formError}</div>}
        <fieldset disabled={saving}><legend>Loại giảm trừ</legend>
          <label className="gtcv-radio"><input type="radio" name="LoaiGiamTru" checked={form.LoaiGiamTru === LOAI_GIAM_TRU.TY_LE} onChange={() => setForm({ ...form, LoaiGiamTru: LOAI_GIAM_TRU.TY_LE, GioGiamTruNam: '', TyLePhanTram: '' })} /> Theo tỷ lệ</label>
          <label className="gtcv-radio"><input type="radio" name="LoaiGiamTru" checked={form.LoaiGiamTru === LOAI_GIAM_TRU.GIO} onChange={() => setForm({ ...form, LoaiGiamTru: LOAI_GIAM_TRU.GIO, TyLePhanTram: '', GioGiamTruNam: '' })} /> Giờ cố định</label>
          {form.LoaiGiamTru === LOAI_GIAM_TRU.TY_LE ? <div className="form-group"><label htmlFor="gtcv-rate">Tỷ lệ còn phải thực hiện (%)</label><input id="gtcv-rate" className="form-input" type="number" min="0" max="100" step="any" value={form.TyLePhanTram} onChange={(e) => setForm({ ...form, TyLePhanTram: e.target.value })} /><small>Để trống = 100% (không giảm).</small></div>
            : <div className="form-group"><label htmlFor="gtcv-hours">Giờ giảm trừ / năm</label><input id="gtcv-hours" className="form-input" type="number" required min="0" max="9999.99" step="0.01" value={form.GioGiamTruNam} onChange={(e) => setForm({ ...form, GioGiamTruNam: e.target.value })} /></div>}
          <div className="form-group"><label htmlFor="gtcv-note">Ghi chú điều kiện</label><textarea id="gtcv-note" className="form-input" rows={3} maxLength={500} value={form.GhiChuDieuKien} onChange={(e) => setForm({ ...form, GhiChuDieuKien: e.target.value })} /></div>
        </fieldset>
      </div><div className="modal-footer"><button type="button" className="btn-cancel" disabled={saving} onClick={() => setEditing(null)}>Hủy</button><button className="btn-submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button></div></form>
    </div></div>}
  </div>;
}
