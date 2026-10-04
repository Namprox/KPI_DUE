import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PhatTrienDoiNguDetail from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguDetail";

export default function PhatTrienDoiNguDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <div className="page-container ptdn">
    <div className="page-header ptdn-heading">
      <div className="header-title"><h2>Chi tiết phát triển đội ngũ</h2></div>
      <Link className="ptdn-button" to="/phat-trien-doi-ngu">Về danh sách ghi nhận</Link>
    </div>
    <PhatTrienDoiNguDetail id={id} onClose={() => navigate("/phat-trien-doi-ngu")} />
  </div>;
}
