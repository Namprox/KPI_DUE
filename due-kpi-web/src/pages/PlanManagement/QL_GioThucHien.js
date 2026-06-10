import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import * as XLSX from 'xlsx';
import '../../css/Pages.css';

const QL_GioThucHien = () => {
    const toast = useRef(null);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [namList, setNamList] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    const authHeaders = { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` };

    useEffect(() => {
        fetchNamList();
    }, []);

    useEffect(() => {
        if (selectedYear) {
            fetchData();
        }
    }, [selectedYear]);

    const fetchNamList = async () => {
        try {
            const response = await fetch(`${API_URL}/nam-danh-gia`, { headers: authHeaders });
            if (response.ok) {
                const list = await response.json();
                setNamList(list);
                if (list.length > 0) setSelectedYear(list[0].IdNam);
            }
        } catch (error) { console.error("Lỗi tải năm:", error); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/gio-thuc-hien?idNam=${selectedYear}`, { headers: authHeaders });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                    setFilteredData(result.data);
                }
            }
        } catch (error) { console.error("Lỗi tải dữ liệu:", error); }
        finally { setIsLoading(false); }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.HoTen && item.HoTen.toLowerCase().includes(query)) ||
            (item.MaNhanVien && item.MaNhanVien.toLowerCase().includes(query)) ||
            (item.TenDonVi && item.TenDonVi.toLowerCase().includes(query))
        ));
    };

    const handleInputChange = (idNhanVien, field, value) => {
        const val = parseFloat(value) || 0;
        const newData = data.map(item => {
            if (item.IdNhanVien === idNhanVien) {
                return { ...item, [field]: val };
            }
            return item;
        });
        setData(newData);
        setFilteredData(newData.filter(item =>
            (item.HoTen && item.HoTen.toLowerCase().includes(searchQuery)) ||
            (item.MaNhanVien && item.MaNhanVien.toLowerCase().includes(searchQuery))
        ));
    };

    const handleExportTemplate = () => {
        if (data.length === 0) return;
        const templateData = data.map((item, index) => ({
            'STT': index + 1,
            'Mã NV': item.MaNhanVien,
            'Họ Tên': item.HoTen,
            'Đơn vị': item.TenDonVi,
            'Giờ giảng thực tế': item.GioGiangThucTe || 0,
            'Giờ NCKH thực tế': item.GioNckhThucTe || 0
        }));

        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "GioThucHien");
        XLSX.writeFile(wb, `NhapGioThucHien_Nam_${selectedYear}.xlsx`);
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const dataExcel = XLSX.utils.sheet_to_json(ws);

                let updatedData = [...data];
                let count = 0;

                dataExcel.forEach(row => {
                    const maNV = row['Mã NV'] || row['MaNhanVien'] || row['ma_nhan_vien'];
                    const gioGiang = parseFloat(row['Giờ giảng thực tế'] || row['GioGiang'] || 0);
                    const gioNckh = parseFloat(row['Giờ NCKH thực tế'] || row['GioNckh'] || 0);

                    if (maNV) {
                        const index = updatedData.findIndex(item => item.MaNhanVien.toString() === maNV.toString());
                        if (index !== -1) {
                            updatedData[index] = {
                                ...updatedData[index],
                                GioGiangThucTe: gioGiang,
                                GioNckhThucTe: gioNckh
                            };
                            count++;
                        }
                    }
                });

                setData(updatedData);
                setFilteredData(updatedData.filter(item =>
                    (item.HoTen && item.HoTen.toLowerCase().includes(searchQuery))
                ));

                toast.current.show({
                    severity: 'success',
                    summary: 'Đọc Excel thành công',
                    detail: `Đã dán số liệu cho ${count} giảng viên. Vui lòng bấm LƯU để ghi vào CSDL!`,
                    life: 6000
                });
            } catch (err) {
                toast.current.show({ severity: 'error', summary: 'Lỗi file', detail: 'File Excel không đúng định dạng!', life: 4000 });
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const handleSave = async () => {
        setIsSaving(true);
        toast.current.show({ severity: 'info', summary: 'Đang xử lý', detail: 'Hệ thống đang lưu dữ liệu' });

        const payload = {
            IdNam: selectedYear,
            Items: data.map(d => ({
                IdNhanVien: d.IdNhanVien,
                GioGiangThucTe: d.GioGiangThucTe,
                GioNckhThucTe: d.GioNckhThucTe
            }))
        };

        try {
            const res = await fetch(`${API_URL}/gio-thuc-hien`, {
                method: 'POST',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            toast.current.clear();
            if (result.success) {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                fetchData();
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message, life: 4000 });
            }
        } catch (error) {
            toast.current.clear();
            toast.current.show({ severity: 'error', summary: 'Lỗi kết nối', detail: 'Mất kết nối tới máy chủ!', life: 4000 });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-title">
                    <h2 style={{ margin: 0 }}>NHẬP GIỜ THỰC TẾ GIẢNG VIÊN</h2>
                    <span className="breadcrumb" style={{ fontSize: '13px', color: '#64748b' }}>Thay thế đồng bộ Đào tạo/NCKH</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>Năm học:</label>
                    <select
                        className="form-input"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ width: '130px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: '#fff' }}
                    >
                        {namList.map(y => (
                            <option key={y.IdNam} value={y.IdNam}>Năm {y.IdNam}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                <button className="btn-add-new" onClick={handleSave} disabled={isSaving || isLoading} style={{ margin: 0, backgroundColor: '#10b981', borderColor: '#059669' }}>
                    <i className={isSaving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk"} style={{ marginRight: '6px' }}></i>
                    {isSaving ? "Đang lưu..." : "Lưu tất cả thay đổi"}
                </button>

                <button className="btn-add-new" onClick={handleExportTemplate} style={{ margin: 0, backgroundColor: '#f59e0b', borderColor: '#d97706', color: '#fff' }}>
                    <i className="fa-solid fa-download" style={{ marginRight: '6px' }}></i> Xuất file nhập liệu
                </button>

                <button className="btn-add-new" onClick={() => document.getElementById('excelUpload').click()} style={{ margin: 0, backgroundColor: '#3b82f6', borderColor: '#2563eb' }}>
                    <i className="fa-solid fa-upload" style={{ marginRight: '6px' }}></i> Nhập từ Excel
                </button>
                <input type="file" id="excelUpload" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportExcel} />
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH GIẢNG VIÊN (NĂM {selectedYear})</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo Mã NV hoặc Tên"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="table-container" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin fa-2x color-primary"></i></div>
                ) : (
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#334155' }}>
                            <tr>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '60px' }}>STT</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', width: '100px' }}>Mã NV</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Họ Tên</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>Đơn vị</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '160px' }}>Giờ Giảng Dạy</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '160px' }}>Giờ NCKH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, index) => (
                                <tr key={item.IdNhanVien} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>{index + 1}</td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{item.MaNhanVien}</td>
                                    <td style={{ padding: '12px', color: '#0f172a', fontWeight: '600' }}>{item.HoTen}</td>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{item.TenDonVi}</td>

                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            value={item.GioGiangThucTe}
                                            onChange={(e) => handleInputChange(item.IdNhanVien, 'GioGiangThucTe', e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#0369a1', backgroundColor: '#f0f9ff' }}
                                        />
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            value={item.GioNckhThucTe}
                                            onChange={(e) => handleInputChange(item.IdNhanVien, 'GioNckhThucTe', e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#6d28d9', backgroundColor: '#f5f3ff' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không tìm thấy giảng viên nào</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default QL_GioThucHien;