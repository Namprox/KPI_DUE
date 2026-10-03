import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ThanhTichDoanTheDetail from "../../components/ThanhTichDoanThe/ThanhTichDoanTheDetail";

export default function ThanhTichDoanTheDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <div className="page-container hddt">
    <div className="page-header hddt-heading">
      <div className="header-title"><h2>Chi tiết thành tích đoàn thể</h2></div>
      <Link className="hddt-button" to="/thanh-tich-doan-the">Về danh sách thành tích</Link>
    </div>
    <ThanhTichDoanTheDetail id={id} onClose={() => navigate("/thanh-tich-doan-the")} />
  </div>;
}
