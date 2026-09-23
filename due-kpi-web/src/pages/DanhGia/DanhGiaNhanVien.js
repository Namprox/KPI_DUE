import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import PhieuTuDanhGia from "./PhieuTuDanhGia";
import PhieuQuyCuaToi from "./PhieuQuyCuaToi";

/**
 * Phiếu tự đánh giá KPI ngạch VIÊN CHỨC / NGƯỜI LAO ĐỘNG.
 *
 * Toàn bộ logic nằm ở PhieuTuDanhGia - hai ngạch đi chung một quy trình, chỉ
 * khác mẫu đánh giá được chọn theo loaiDoiTuong.
 */
const DanhGiaNhanVien = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [namList, setNamList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const yearParam = Number(new URLSearchParams(location.search).get("year"));

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch("namdanhgia"), apiFetch("maudanhgia?loaiDoiTuong=2")])
      .then(async ([yearResponse, templateResponse]) => {
        if (!yearResponse.ok || !templateResponse.ok) {
          throw new Error("Không tải được cấu hình KPI viên chức");
        }
        const [yearBody, templateBody] = await Promise.all([
          yearResponse.json(),
          templateResponse.json(),
        ]);
        if (cancelled) return;
        const years = [
          ...(yearBody.Items || (Array.isArray(yearBody) ? yearBody : [])),
        ].sort((a, b) => Number(b.IdNam) - Number(a.IdNam));
        setNamList(years);
        setTemplates(
          templateBody.Items ||
            (Array.isArray(templateBody) ? templateBody : []),
        );
        const selected = years.some((n) => Number(n.IdNam) === yearParam)
          ? yearParam
          : Number(
              years.find(
                (n) => Number(n.IdNam) === new Date().getFullYear(),
              )?.IdNam || years[0]?.IdNam,
            );
        if (selected && selected !== yearParam) {
          navigate(`/danh-gia-kpi-nhan-vien?year=${selected}`, {
            replace: true,
          });
        }
      })
      .catch((error) =>
        console.error("Lỗi phát hiện chế độ phiếu quý:", error),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [navigate, yearParam]);

  const selectedYear = yearParam || Number(namList[0]?.IdNam);
  const nam = namList.find(
    (item) => Number(item.IdNam) === Number(selectedYear),
  );
  const template =
    templates.find(
      (item) =>
        Number(item.IdNam) === Number(selectedYear) && Boolean(item.TrangThai),
    ) ||
    templates.find((item) => Number(item.IdNam) === Number(selectedYear));
  const laVienChuc = Array.isArray(user?.DonVi) && user.DonVi.some(
    (donVi) => donVi?.LoaiDoiTuong === 2,
  );
  const useQuarterly =
    (nam?.ApDungPhieuQuy === true || Number(nam?.ApDungPhieuQuy) === 1) &&
    Number(nam?.TrangThai) === 2 &&
    laVienChuc &&
    Boolean(template);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: 48, textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin"></i> Đang tải cấu hình năm
        đánh giá...
      </div>
    );
  }

  if (useQuarterly) {
    return (
      <PhieuQuyCuaToi
        namList={namList}
        selectedYear={selectedYear}
        onYearChange={(year) =>
          navigate(`/danh-gia-kpi-nhan-vien?year=${year}`)
        }
        template={template}
      />
    );
  }

  return (
    <PhieuTuDanhGia
      loaiDoiTuong={2}
      duongDan="/danh-gia-kpi-nhan-vien"
      tieuDe="ĐÁNH GIÁ KPI VIÊN CHỨC / NGƯỜI LAO ĐỘNG"
    />
  );
};

export default DanhGiaNhanVien;
