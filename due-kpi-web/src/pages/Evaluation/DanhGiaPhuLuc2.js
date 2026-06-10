import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../css/Pages.css';
import '../../css/Evaluation/DanhGiaPhuLuc2.css';
import DanhGiaPhuLuc2Form from '../../components/Evaluation/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form';
import { Toast } from 'primereact/toast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { apiFetch } from '../../utils/api';

const parseNetDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString === 'string' && dateString.includes('/Date(')) {
        return new Date(parseInt(dateString.match(/\d+/)[0], 10));
    }
    return new Date(dateString);
};

const DanhGiaPhuLuc2 = () => {
    const [criteriaList, setCriteriaList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [tongDiemCoBan, setTongDiemCoBan] = useState(0);

    const [trangThaiPhieu, setTrangThaiPhieu] = useState(0);
    const [lyDoTraVe, setLyDoTraVe] = useState("");

    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogType, setDialogType] = useState('');

    const [dinhMucHienTai, setDinhMucHienTai] = useState({ gioGiang: 270, gioNckh: 600 });
    const [gioThucTe, setGioThucTe] = useState({ gioGiang: 0, gioNckh: 0, soLopVuot: 0 });

    const toast = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const yearParam = queryParams.get('year');

    const [listYears, setListYears] = useState([]);
    const [yearDetails, setYearDetails] = useState([]);
    const [selectedYear, setSelectedYear] = useState(yearParam ? parseInt(yearParam) : new Date().getFullYear());

    useEffect(() => {
        const fetchYears = async () => {
            const currentRealYear = new Date().getFullYear();
            try {
                const res = await apiFetch('nam-danh-gia');
                const result = await res.json();

                if (Array.isArray(result) && result.length > 0) {
                    setYearDetails(result);
                    const years = result.map(item => item.IdNam || item.id_nam || item.NamHoc || item.nam).filter(y => y != null && !isNaN(y));
                    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

                    if (uniqueYears.length > 0) {
                        setListYears(uniqueYears);

                        if (!yearParam) {
                            setSelectedYear(uniqueYears[0]);
                            navigate(`/danh-gia-phu-luc-2?year=${uniqueYears[0]}`, { replace: true });
                        }
                    } else {
                        setListYears([currentRealYear]);
                    }
                } else {
                    setListYears([currentRealYear]);
                }
            } catch (err) {
                console.error("Lỗi lấy danh sách năm:", err);
                setListYears([currentRealYear]);
            }
        };

        fetchYears();
    }, []);

    useEffect(() => {
        const fetchDinhMuc = async () => {
            if (!currentUser.IdChucDanh) return;
            try {
                const res = await fetch(`${API_URL}/dinh-muc-gv`, { headers: authHeaders });
                if (res.ok) {
                    const listDinhMuc = await res.json();
                    const dm = listDinhMuc.find(x => x.IdNam === selectedYear && x.IdChucDanh === currentUser.IdChucDanh);
                    if (dm) {
                        setDinhMucHienTai({ gioGiang: dm.GioGiangLyThuyet, gioNckh: dm.GioNckh });
                    }
                }
            } catch (error) {
                console.error("Lỗi kéo định mức:", error);
            }
        };

        const fetchGioThucTe = async () => {
            if (!currentUser.IdNhanVien || !selectedYear) return;
            try {
                const url = `${API_URL}/gio-thuc-hien?idNhanVien=${currentUser.IdNhanVien}&idNam=${selectedYear}`;
                const res = await fetch(url, { headers: authHeaders });

                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        setGioThucTe({
                            gioGiang: parseFloat(result.data.gio_giang_thuc_te) || 0,
                            gioNckh: parseFloat(result.data.gio_nckh_thuc_te) || 0,
                            soLopVuot: parseInt(result.data.so_lop_vuot) || 0
                        });
                    }
                }
            } catch (error) {
                console.error("Lỗi kéo giờ thực tế:", error);
            }
        };

        if (selectedYear) {
            fetchDinhMuc();
            fetchGioThucTe();
        }
    }, [selectedYear, currentUser.IdChucDanh]);

    useEffect(() => {
        const fetchScoringData = async () => {
            setIsLoading(true);
            try {
                const endpoint = `scoring?idNam=${selectedYear}&idNhanVien=${currentUser.IdNhanVien || 0}`;
                const res = await apiFetch(endpoint);

                if (!res.ok) throw new Error("Network response was not ok");
                const result = await res.json();

                setFormData({});
                setTongDiemCoBan(0);
                setTrangThaiPhieu(0);
                setLyDoTraVe("");

                if (result.success) {
                    setCriteriaList(result.data || []);

                    if (result.phieu) {
                        setTrangThaiPhieu(result.phieu.TrangThai);
                        setLyDoTraVe(result.phieu.LyDoTraVe || "");

                        if (result.chiTiet && result.chiTiet.length > 0) {
                            const initialFormData = {};
                            result.chiTiet.forEach(item => {
                                if (!initialFormData[item.IdTieuChi]) {
                                    initialFormData[item.IdTieuChi] = {
                                        IdTieuChi: item.IdTieuChi,
                                        IdThangDiemChon: item.IdThangDiemChon,
                                        DiemTuDanhGia: item.DiemTuDanhGia,
                                        MoTaHoanThanh: item.MoTaHoanThanh,
                                        DanhSachFile: [],
                                        DanhSachNCKH: []
                                    };
                                }

                                if (item.TenFile) {
                                    initialFormData[item.IdTieuChi].DanhSachFile.push({
                                        fileName: item.TenFile,
                                        originalName: item.TenFileGoc || item.TenFile,
                                        fileType: item.LoaiFile,
                                        fileSizeKB: item.KichThuocKB
                                    });
                                }

                                if (item.ScienceRecordId) {
                                    initialFormData[item.IdTieuChi].DanhSachNCKH.push({
                                        ScienceRecordId: item.ScienceRecordId,
                                        BangNguon: item.BangNguon || 'ScientificArticles',
                                        MoTa: item.MoTaNckh || '',
                                        QRanking: item.QRanking || 'NCKH',
                                        JournalScore: item.JournalScore,
                                        BonusCoefficient: item.BonusCoefficient,
                                        TotalAuthors: item.TotalAuthors,
                                        PrimaryAuthors: item.PrimaryAuthors,
                                        MembersJSON: item.MembersJSON
                                    });
                                }
                            });
                            setFormData(initialFormData);
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi API Tải dữ liệu đánh giá:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (listYears.length > 0) {
            fetchScoringData();
        }
    }, [selectedYear, currentUser.IdNhanVien, listYears.length]);

    const activeYear = yearDetails.find(y => y.IdNam === selectedYear);
    let isWithinTime = false;
    let timeMessage = "";

    if (activeYear) {
        const now = new Date().getTime();
        const start = activeYear.NgayMoTuDanhGia ? parseNetDate(activeYear.NgayMoTuDanhGia).getTime() : 0;
        const end = activeYear.NgayDongTuDanhGia ? parseNetDate(activeYear.NgayDongTuDanhGia).setHours(23, 59, 59, 999) : 0;

        if (!activeYear.NgayMoTuDanhGia || !activeYear.NgayDongTuDanhGia) {
            timeMessage = "Hệ thống chưa thiết lập lịch tự đánh giá cho năm này";
        } else if (now < start) {
            timeMessage = `Chưa đến thời gian mở hệ thống. Lịch tự đánh giá sẽ bắt đầu từ ${parseNetDate(activeYear.NgayMoTuDanhGia).toLocaleDateString('vi-VN')}`;
        } else if (now > end) {
            timeMessage = `Đã hết hạn tự đánh giá! Hệ thống đã đóng vào lúc 23:59 ngày ${parseNetDate(activeYear.NgayDongTuDanhGia).toLocaleDateString('vi-VN')}`;
        } else {
            isWithinTime = true;
        }
    }

    const displayTrangThai = !isWithinTime ? Math.max(trangThaiPhieu, 2.5) : trangThaiPhieu;

    const calculateArticleScore = (article, currentUserId) => {
        const journalScore = parseFloat(article.JournalScore) || 0;
        const a_coeff = parseFloat(article.BonusCoefficient) || 1.0;
        const totalAuthors = parseInt(article.TotalAuthors) || 1;
        const primaryAuthors = parseInt(article.PrimaryAuthors) || 1;

        const totalScore = journalScore * a_coeff;
        let primaryScore = totalScore;
        let coAuthorScore = 0;

        if (totalAuthors > 1) {
            const thirdPool = totalScore / 3;
            const twoThirdsPool = (totalScore * 2) / 3;
            const primaryShare = thirdPool / primaryAuthors;
            const shareFromTwoThirds = twoThirdsPool / totalAuthors;
            primaryScore = primaryShare + shareFromTwoThirds;
            coAuthorScore = shareFromTwoThirds;
        }

        let yourScore = 0;
        try {
            const members = JSON.parse(article.MembersJSON || '[]');
            const me = members.find(m => m.UserId?.toString() === currentUserId?.toString());
            if (me) {
                if (me.IsFirstAuthor || me.IsContactAuthor) {
                    yourScore = primaryScore;
                } else {
                    yourScore = coAuthorScore;
                }
                if ((parseInt(me.OrganizationCount) || 1) > 1) {
                    yourScore *= 0.5;
                }
            } else {
                yourScore = coAuthorScore;
            }
        } catch (e) {
            console.error("Lỗi parse MembersJSON", e);
        }
        return yourScore;
    };

    const applyAutoScoring = (idTieuChi, nckhList, state) => {
        const tc = criteriaList.find(c => c.IdTieuChi === idTieuChi);
        if (!tc) return state;

        let autoScore = state[idTieuChi]?.DiemTuDanhGia || 0;
        let selectedThangDiem = state[idTieuChi]?.IdThangDiemChon || null;

        const tenTC = (tc.TenTieuChi || '').normalize("NFC").toLowerCase();

        if (tenTC.includes('định mức giờ giảng') || tenTC.includes('định mức giờ nckh') || tenTC.includes('giảng dạy lý thuyết vượt định mức') || tenTC.includes('vượt định mức')) {
            const roleName = (currentUser.RoleName || currentUser.TenChucVu || '').toLowerCase();

            let heSoGiamTru = 1.0;
            if (roleName.includes('trưởng khoa')) heSoGiamTru = 0.3;
            else if (roleName.includes('phó khoa') || roleName.includes('trưởng bộ môn')) heSoGiamTru = 0.7;

            const thongKeKpi = {
                dinhMucGioGiang: dinhMucHienTai.gioGiang * heSoGiamTru,
                gioGiangThucTe: gioThucTe.gioGiang,
                dinhMucGioNckh: dinhMucHienTai.gioNckh * heSoGiamTru,
                gioNckhThucTe: gioThucTe.gioNckh,
                soLopVuot: gioThucTe.soLopVuot
            };

            if (tenTC.includes('định mức giờ giảng')) {
                const tyLe = thongKeKpi.dinhMucGioGiang > 0 ? (thongKeKpi.gioGiangThucTe / thongKeKpi.dinhMucGioGiang) * 100 : 100;
                if (tyLe >= 100) autoScore = 20;
                else if (tyLe > 75) autoScore = 15;
                else if (tyLe > 50) autoScore = 10;
                else autoScore = 0;
                toast.current.show({ severity: 'info', summary: 'Hệ thống Đồng bộ', detail: `Tỷ lệ hoàn thành giờ giảng: ${tyLe.toFixed(1)}%. Tự động cộng ${autoScore}đ.`, life: 4000 });
            }
            else if (tenTC.includes('định mức giờ nckh')) {
                const tyLe = thongKeKpi.dinhMucGioNckh > 0 ? (thongKeKpi.gioNckhThucTe / thongKeKpi.dinhMucGioNckh) * 100 : 100;
                if (tyLe >= 100) autoScore = 40;
                else if (tyLe > 75) autoScore = 30;
                else if (tyLe > 50) autoScore = 20;
                else autoScore = 0;
                toast.current.show({ severity: 'info', summary: 'Hệ thống NCKH', detail: `Tỷ lệ hoàn thành giờ NCKH: ${tyLe.toFixed(1)}%. Tự động cộng ${autoScore}đ.`, life: 4000 });
            }
            else if (tenTC.includes('giảng dạy lý thuyết vượt định mức') || tenTC.includes('vượt định mức')) {
                if (thongKeKpi.soLopVuot >= 4) autoScore = 15;
                else if (thongKeKpi.soLopVuot === 3) autoScore = 10;
                else if (thongKeKpi.soLopVuot === 2) autoScore = 5;
                else autoScore = 0;
                if (autoScore > 0) {
                    toast.current.show({ severity: 'info', summary: 'Hệ thống Đồng bộ', detail: `Ghi nhận vượt ${thongKeKpi.soLopVuot} lớp. Tự động cộng ${autoScore}đ.`, life: 4000 });
                }
            }

            const td = tc.CacThangDiem?.find(t => t.GiaTriDiem === autoScore);
            if (td) selectedThangDiem = td.IdThangDiem;

            return {
                ...state,
                [idTieuChi]: {
                    ...state[idTieuChi],
                    DiemTuDanhGia: autoScore,
                    IdThangDiemChon: selectedThangDiem !== null ? selectedThangDiem : state[idTieuChi]?.IdThangDiemChon
                }
            };
        }

        if (nckhList.length === 0) {
            const isAuto = tenTC.includes('1 bài') || tenTC.includes('nhiều hơn 1 bài') ||
                tenTC.includes('q1') || tenTC.includes('q2') || tenTC.includes('demo') ||
                tenTC.includes('chủ nhiệm') || tenTC.includes('chủ biên') || tenTC.includes('chủ bằng') || tenTC.includes('thành viên') ||
                tenTC.includes('sinh viên') || tenTC.includes('sv nckh') ||
                tenTC.includes('tham luận') || tenTC.includes('hội thảo') || tenTC.includes('diễn giả') || tenTC.includes('góp ý') || tenTC.includes('tham vấn');
            if (isAuto) {
                return {
                    ...state,
                    [idTieuChi]: { ...state[idTieuChi], DiemTuDanhGia: 0, IdThangDiemChon: null }
                };
            }
            return state;
        }

        if (tenTC.includes('nhiều hơn 1 bài') || tenTC.includes('từ 2 bài')) {
            let hasQ1Q2 = false;
            let totalAuthorScore = 0;
            nckhList.forEach(art => {
                if (art.QRanking && (art.QRanking.toUpperCase().includes('Q1') || art.QRanking.toUpperCase().includes('Q2'))) hasQ1Q2 = true;
                totalAuthorScore += calculateArticleScore(art, currentUser.IdNhanVien);
            });
            let baseScore = hasQ1Q2 ? 10 : 5;
            autoScore = baseScore + (totalAuthorScore * 5);
            if (tc.DiemToiDa && autoScore > tc.DiemToiDa) autoScore = tc.DiemToiDa;
            autoScore = Math.round(autoScore * 100) / 100;
            toast.current.show({ severity: 'success', summary: 'Hệ thống tự tính điểm', detail: `Áp dụng công thức cộng dồn: ${autoScore}đ.`, life: 5000 });
        }
        else if ((tenTC.includes('1 bài') && (tenTC.includes('q1') || tenTC.includes('q2'))) || tenTC.includes('demo')) {
            autoScore = tc.DiemToiDa || 10;
            toast.current.show({ severity: 'success', summary: 'Hệ thống tự tính điểm', detail: `Đạt mức điểm tối đa (${autoScore}đ).`, life: 4000 });
        }
        else if (tenTC.includes('1 bài') && !tenTC.includes('q1')) {
            autoScore = tc.DiemToiDa || 8;
            toast.current.show({ severity: 'success', summary: 'Hệ thống tự tính điểm', detail: `Đạt mức điểm (${autoScore}đ) cho bài WoS/Scopus.`, life: 4000 });
        }
        else if (tenTC.includes('chủ nhiệm') || tenTC.includes('chủ biên') || tenTC.includes('chủ bằng') || tenTC.includes('thành viên') || tenTC.includes('tham gia')) {
            const item = nckhList[0];
            let isMainRole = false;

            try {
                const members = JSON.parse(item.MembersJSON || '[]');
                const userEmail = (currentUser.email || currentUser.Email || '').toLowerCase().trim();

                const me = members.find(m => {
                    const mEmail = (m.Email || m.email || '').toLowerCase().trim();
                    const mId = (m.UserId || m.userId || m.Id || m.id)?.toString();
                    return (mEmail && mEmail === userEmail) || (mId === currentUser.IdNhanVien?.toString());
                });

                if (me) {
                    const role = (me.role || me.Role || me.RoleName || '').toLowerCase();
                    if (role.includes('chủ nhiệm') || role.includes('chủ biên') || role.includes('tác giả chính') || role.includes('chủ bằng') || me.IsFirstAuthor || me.IsContactAuthor) {
                        isMainRole = true;
                    }
                } else {
                    if (parseInt(item.TotalAuthors) === 1 || parseInt(item.PrimaryAuthors) === 1) {
                        isMainRole = true;
                    }
                }
            } catch (e) { }

            const isTieuChiChinh = tenTC.includes('chủ nhiệm') || tenTC.includes('chủ biên') || tenTC.includes('chủ bằng') || tenTC.includes('tác giả thứ nhất');

            if ((isTieuChiChinh && isMainRole) || (!isTieuChiChinh && !isMainRole)) {
                autoScore = tc.DiemToiDa || 0;
                toast.current.show({ severity: 'success', summary: 'Khớp vai trò', detail: `Xác nhận đúng vai trò trong công trình. Đạt ${autoScore}đ`, life: 4000 });
            } else {
                autoScore = 0;
                toast.current.show({ severity: 'error', summary: 'Sai vai trò', detail: `Tiêu chí yêu cầu vai trò '${isTieuChiChinh ? "Chủ nhiệm/Chủ biên" : "Thành viên"}', nhưng tài khoản của bạn không khớp với vai trò này!`, life: 6000 });
            }
        }
        else if (tenTC.includes('sinh viên') || tenTC.includes('sv nckh')) {
            autoScore = tc.DiemToiDa || 0;
            toast.current.show({ severity: 'success', summary: 'Hệ thống tự tính điểm', detail: `Đạt mức điểm tối đa (${autoScore}đ) cho thành tích hướng dẫn SV NCKH`, life: 4000 });
        }
        else if (tenTC.includes('tham luận') || tenTC.includes('hội thảo') || tenTC.includes('diễn giả') || tenTC.includes('góp ý') || tenTC.includes('tham vấn')) {
            autoScore = tc.DiemToiDa || 0;
            toast.current.show({ severity: 'success', summary: 'Hệ thống tự tính điểm', detail: `Đạt mức điểm tối đa (${autoScore}đ) cho hoạt động NCKH này`, life: 4000 });
        }
        else {
            toast.current.show({ severity: 'success', summary: 'Liên kết thành công', detail: `Đã đính kèm minh chứng từ hệ thống NCKH`, life: 3000 });
        }

        const td = tc.CacThangDiem?.find(t => t.GiaTriDiem === autoScore);
        if (td) selectedThangDiem = td.IdThangDiem;

        return {
            ...state,
            [idTieuChi]: {
                ...state[idTieuChi],
                DiemTuDanhGia: autoScore,
                IdThangDiemChon: selectedThangDiem !== null ? selectedThangDiem : state[idTieuChi]?.IdThangDiemChon
            }
        };
    };

    useEffect(() => {
        if (criteriaList.length > 0 && Object.keys(formData).length > 0) {
            let newState = { ...formData };
            let needUpdate = false;

            criteriaList.forEach(tc => {
                const tenTC = (tc.TenTieuChi || '').normalize("NFC").toLowerCase();
                if (tenTC.includes('định mức giờ giảng') || tenTC.includes('định mức giờ nckh') || tenTC.includes('vượt định mức')) {
                    const oldThangDiem = newState[tc.IdTieuChi]?.IdThangDiemChon;
                    const oldDiem = newState[tc.IdTieuChi]?.DiemTuDanhGia;

                    newState = applyAutoScoring(tc.IdTieuChi, [], newState);

                    if (newState[tc.IdTieuChi]?.IdThangDiemChon !== oldThangDiem || newState[tc.IdTieuChi]?.DiemTuDanhGia !== oldDiem) {
                        needUpdate = true;
                    }
                }
            });

            if (needUpdate) {
                setFormData(newState);
            }
        }
    }, [criteriaList.length, dinhMucHienTai, gioThucTe]);

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        setSelectedYear(newYear);
        navigate(`/danh-gia-phu-luc-2?year=${newYear}`);
    };

    useEffect(() => {
        const total = Object.values(formData).reduce((sum, item) => sum + (item.DiemTuDanhGia || 0), 0);
        setTongDiemCoBan(total);
    }, [formData]);

    const handleScoreChange = (idTieuChi, idThangDiem, score) => {
        if (displayTrangThai >= 2) return;

        const tc = criteriaList.find(c => c.IdTieuChi === idTieuChi);
        const tenTC = tc ? (tc.TenTieuChi || '').normalize("NFC").toLowerCase() : '';
        const isAutoScoredCriteria = tenTC.includes('1 bài') || tenTC.includes('nhiều hơn 1 bài') ||
            tenTC.includes('q1') || tenTC.includes('q2') || tenTC.includes('demo') ||
            tenTC.includes('chủ nhiệm') || tenTC.includes('chủ biên') || tenTC.includes('đồng chủ biên') || tenTC.includes('thành viên') ||
            tenTC.includes('sinh viên') || tenTC.includes('sv nckh') ||
            tenTC.includes('tham luận') || tenTC.includes('hội thảo') || tenTC.includes('diễn giả') || tenTC.includes('góp ý') || tenTC.includes('tham vấn') ||
            tenTC.includes('định mức');

        if (isAutoScoredCriteria && formData[idTieuChi]?.DanhSachNCKH && formData[idTieuChi]?.DanhSachNCKH.length > 0) {
            toast.current.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Điểm của tiêu chí này đang được tính TỰ ĐỘNG bằng hệ thống AI. Vui lòng gỡ bài báo nếu muốn nhập thủ công!', life: 4000 });
            return;
        }

        if (isAutoScoredCriteria && tenTC.includes('định mức')) {
            toast.current.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Tiêu chí định mức được đồng bộ tự động từ hệ thống Đào tạo và NCKH. Bạn không thể tự sửa điểm!', life: 4000 });
            return;
        }

        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, IdThangDiemChon: idThangDiem, DiemTuDanhGia: score }
        }));
    };

    const handleTextChange = (idTieuChi, text) => {
        if (displayTrangThai >= 2) return;
        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, MoTaHoanThanh: text }
        }));
    };

    const handleFileChange = (idTieuChi, newFilesArray) => {
        if (displayTrangThai >= 2 || !newFilesArray || newFilesArray.length === 0) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi] || { IdTieuChi: idTieuChi, DanhSachFile: [], DanhSachNCKH: [] };
            const currentFiles = currentData.DanhSachFile || [];

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachFile: [...currentFiles, ...newFilesArray]
                }
            };
        });
    };

    const handleRemoveFile = (idTieuChi, indexToRemove) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi];
            if (!currentData || !currentData.DanhSachFile) return prev;

            const newFilesList = currentData.DanhSachFile.filter((_, idx) => idx !== indexToRemove);

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachFile: newFilesList
                }
            };
        });
    };

    const handleNckhChange = (idTieuChi, articleObj) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi] || { IdTieuChi: idTieuChi, DanhSachFile: [], DanhSachNCKH: [] };
            const currentNckh = currentData.DanhSachNCKH || [];

            if (currentNckh.some(item => item.ScienceRecordId === articleObj.ScienceRecordId)) {
                return prev;
            }

            const newList = [...currentNckh, articleObj];
            let newState = {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachNCKH: newList
                }
            };

            newState = applyAutoScoring(idTieuChi, newList, newState);
            return newState;
        });
    };

    const handleRemoveNckh = (idTieuChi, indexToRemove) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi];
            if (!currentData || !currentData.DanhSachNCKH) return prev;

            const newNckhList = currentData.DanhSachNCKH.filter((_, idx) => idx !== indexToRemove);

            let newState = {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachNCKH: newNckhList
                }
            };

            newState = applyAutoScoring(idTieuChi, newNckhList, newState);
            return newState;
        });
    };

    const executeSubmit = async (status) => {
        setIsSubmitting(true);
        toast.current.show({ severity: 'info', summary: 'Đang xử lý', detail: 'Đang tải tệp tin và lưu dữ liệu', sticky: true });

        try {
            const finalChiTiet = [];

            for (const item of Object.values(formData)) {
                const uploadedFilesList = [];
                const filesToProcess = item.DanhSachFile || [];

                for (const fileItem of filesToProcess) {
                    if (fileItem instanceof File) {
                        const resUpload = await apiFetch(`upload?fileName=${encodeURIComponent(fileItem.name)}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': undefined
                            },
                            body: fileItem
                        });

                        if (!resUpload.ok) throw new Error("Upload file thất bại");

                        const uploadResult = await resUpload.json();
                        if (uploadResult.success) {
                            uploadedFilesList.push({
                                fileName: uploadResult.fileName,
                                originalName: uploadResult.originalName,
                                fileType: uploadResult.fileType,
                                fileSizeKB: uploadResult.fileSizeKB
                            });
                        } else {
                            throw new Error(uploadResult.message);
                        }
                    }
                    else {
                        uploadedFilesList.push(fileItem);
                    }
                }

                finalChiTiet.push({
                    ...item,
                    DanhSachFile: uploadedFilesList,
                    DanhSachNCKH: item.DanhSachNCKH || []
                });
            }

            const payload = {
                Action: 'SUBMIT',
                IdNam: selectedYear,
                IdNhanVien: currentUser.IdNhanVien,
                IdDonVi: currentUser.IdDonVi,
                TrangThai: status,
                TongDiemCoBan: tongDiemCoBan,
                TongDiemTichLuy: tongDiemCoBan,
                ChiTiet: finalChiTiet
            };

            const res = await apiFetch('scoring', {
                method: 'POST', body: JSON.stringify(payload)
            });
            const result = await res.json();

            toast.current.clear();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                setTrangThaiPhieu(status);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Lỗi lưu phiếu!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi khi nộp phiếu/upload file:", err);
            toast.current.clear();
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Quá trình tải tệp tin hoặc lưu phiếu thất bại!', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (status) => {
        if (status === 2) {
            const hasEvaluated = Object.values(formData).some(item =>
                item.IdThangDiemChon != null ||
                (item.MoTaHoanThanh && item.MoTaHoanThanh.trim() !== '') ||
                (item.DanhSachFile && item.DanhSachFile.length > 0) ||
                (item.DanhSachNCKH && item.DanhSachNCKH.length > 0)
            );

            if (!hasEvaluated) {
                toast.current.show({
                    severity: 'error',
                    summary: 'Không thể nộp phiếu',
                    detail: 'Bạn chưa chọn mục đánh giá hoặc tải file nào! Vui lòng đánh giá ít nhất 1 tiêu chí trước khi nộp',
                    life: 4000
                });
                return;
            }

            setDialogType('SUBMIT');
            setDialogVisible(true);
        } else {
            executeSubmit(status);
        }
    };

    const executeRecall = async () => {
        setIsSubmitting(true);
        const payload = {
            Action: 'RECALL',
            IdNam: selectedYear,
            IdNhanVien: currentUser.IdNhanVien
        };

        try {
            const res = await apiFetch('scoring', {
                method: 'POST', body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                setTrangThaiPhieu(1);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Lỗi thu hồi phiếu!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi khi thu hồi phiếu:", err);
            toast.current.show({ severity: 'error', summary: 'Lỗi kết nối', detail: 'Không thể kết nối đến máy chủ!', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecall = () => {
        setDialogType('RECALL');
        setDialogVisible(true);
    };

    if (isLoading) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', color: '#003399' }}></i>
                <p style={{ marginTop: '15px' }}>Đang tải biểu mẫu đánh giá</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />

            <ConfirmDialog
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                message={dialogType === 'SUBMIT' ? "Xác nhận nộp phiếu? Sau khi nộp sẽ không thể chỉnh sửa dữ liệu!" : "Bạn có chắc chắn muốn thu hồi phiếu để chỉnh sửa lại?"}
                header={dialogType === 'SUBMIT' ? "Xác nhận nộp phiếu" : "Xác nhận thu hồi"}
                icon={dialogType === 'SUBMIT' ? "pi pi-exclamation-triangle" : "pi pi-info-circle"}
                acceptLabel={dialogType === 'SUBMIT' ? "Nộp phiếu" : "Thu hồi phiếu"}
                rejectLabel="Hủy bỏ"
                acceptClassName={dialogType === 'SUBMIT' ? "p-button-primary" : "p-button-danger"}
                accept={() => {
                    if (dialogType === 'SUBMIT') executeSubmit(2);
                    if (dialogType === 'RECALL') executeRecall();
                }}
            />

            <div className="phu-luc-2-container">
                <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>ĐÁNH GIÁ PHỤ LỤC 2</h2>
                        <span className="breadcrumb phu-luc-2-breadcrumb">
                            Giảng viên: {currentUser.FullName || 'Người dùng'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>Năm đánh giá:</label>
                        <select
                            className="form-input"
                            value={selectedYear}
                            onChange={handleYearChange}
                            disabled={isLoading || listYears.length === 0}
                            style={{ width: '130px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', fontSize: '14px' }}
                        >
                            {listYears.map(y => (
                                <option key={y} value={y}>Năm {y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {!isWithinTime && timeMessage && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: '20px' }}></i>
                        <span style={{ fontWeight: '500' }}>{timeMessage} Hiện tại bạn không thể thao tác nộp hoặc chỉnh sửa phiếu</span>
                    </div>
                )}

                <div className="phu-luc-2-content">
                    <DanhGiaPhuLuc2Form
                        criteriaList={criteriaList}
                        formData={formData}
                        tongDiemCoBan={tongDiemCoBan}
                        isSubmitting={isSubmitting}
                        trangThaiPhieu={displayTrangThai}
                        lyDoTraVe={lyDoTraVe}
                        onSubmit={handleSubmit}
                        onScoreChange={handleScoreChange}
                        onTextChange={handleTextChange}
                        onFileChange={handleFileChange}
                        onRemoveFile={handleRemoveFile}
                        onNckhChange={handleNckhChange}
                        onRemoveNckh={handleRemoveNckh}
                        onRecall={handleRecall}
                    />
                </div>
            </div>
        </div>
    );
};

export default DanhGiaPhuLuc2;