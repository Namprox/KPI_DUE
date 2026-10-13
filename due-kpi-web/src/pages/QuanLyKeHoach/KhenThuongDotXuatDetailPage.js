import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import KhenThuongDotXuatDetail from "../../components/KhenThuongDotXuat/KhenThuongDotXuatDetail";

export default function KhenThuongDotXuatDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <div className="page-container ktdx">
    <div className="page-header ktdx-heading">
      <div className="header-title"><h2>Chi tiết khen thưởng đột xuất</h2></div>
      <Link className="ktdx-button" to="/khen-thuong-dot-xuat">Về danh sách ghi nhận</Link>
    </div>
    <KhenThuongDotXuatDetail id={id} onClose={() => navigate("/khen-thuong-dot-xuat")} />
  </div>;
}
