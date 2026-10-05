import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SangKienDetail from "../../components/SangKien/SangKienDetail";

export default function SangKienDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <div className="page-container sk">
    <div className="page-header sk-heading"><div className="header-title"><h2>Chi tiết sáng kiến</h2></div><Link className="sk-button" to="/sang-kien">Về danh sách sáng kiến</Link></div>
    <SangKienDetail id={id} onClose={() => navigate("/sang-kien")} />
  </div>;
}
