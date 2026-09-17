import React from "react";
import { useParams } from "react-router-dom";
import { cauHinhKpiDonVi } from "../../utils/kpiDonViWorkspace";
import useKpiDonViFilters from "../../hooks/useKpiDonViFilters";
import KpiDonViWorkspace from "./KpiDonViWorkspace";
import ChiTietLichSuKpiDonVi from "./ChiTietLichSuKpiDonVi";

export default function LichSuKpiDonVi({ loai = "khoa", chiTiet = false }) {
  const { id } = useParams();
  const [filters] = useKpiDonViFilters();
  if (!chiTiet) return <KpiDonViWorkspace key={loai} loai={loai} lichSu />;
  return <ChiTietLichSuKpiDonVi key={`${loai}:${id}`} idPhieu={id} loai={loai} backTo={cauHinhKpiDonVi(loai).lichSu} backState={{ kpiFilters: Object.fromEntries(filters) }} />;
}
