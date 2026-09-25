import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPhieuDonViList } from "../../utils/phieuDonViApi";
import useKpiDonViFilters from "../../hooks/useKpiDonViFilters";
import { TrangThaiDonViBadge } from "../../components/QuanLyChamDiem/TrangThaiBadge";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/DanhGia/PhieuDonViChoCham.css";

const PATH = "/phieu-don-vi-cho-cham";

// Không lọc theo đơn vị công tác: backend trả phạm vi được giao của người xem.
export default function PhieuDonViChoCham() {
  const { id } = useParams();
  const [params, setParams] = useKpiDonViFilters();
  const choToiCham = params.get("tab") !== "tat-ca";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [retry, setRetry] = useState(0);
  const [timKiem, setTimKiem] = useState("");
  const [data, setData] = useState({ rows: [], loading: true, error: "" });

  useEffect(() => {
    if (id) return;
    let active = true;
    setData({ rows: [], loading: true, error: "" });
    fetchPhieuDonViList({
      choToiCham: choToiCham ? true : undefined,
      page,
      pageSize: 20,
    })
      .then((rows) => {
        if (active) setData({ rows: rows || [], loading: false, error: "" });
      })
      .catch((e) => {
        if (active) setData({ rows: [], loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [id, choToiCham, page, retry]);

  const change = (tab, nextPage = 1) =>
    setParams(new URLSearchParams({ tab, page: String(nextPage) }));

  const rowsHienThi = useMemo(() => {
    if (!timKiem.trim()) return data.rows;
    const term = timKiem.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        (r.TenDonVi && r.TenDonVi.toLowerCase().includes(term)) ||
        String(r.IdDonVi || "").includes(term) ||
        String(r.IdNam || "").includes(term)
    );
  }, [data.rows, timKiem]);

  if (id)
    return (
      <div className="page-container pvd-page">
        <div className="pvd-back-bar">
          <Link
            className="cd-link-btn pvd-back-link"
            to={PATH}
            state={{ kpiFilters: Object.fromEntries(params) }}
          >
            <i
              className="fa-solid fa-arrow-left"
              aria-hidden="true"
              style={{ marginRight: 6 }}
            ></i>
            Về danh sách phiếu đơn vị
          </Link>
        </div>
        <ChiTietPhieuDonVi key={id} idPhieu={id} embedded backTo={PATH} />
      </div>
    );

  return (
    <div className="page-container pvd-page">
      <div className="page-header">
        <div className="header-title">
          <h2>Thẩm định KPI Khoa/Phòng</h2>
          <span className="pvd-header-desc">
            Chấm các tiêu chí KPI Khoa/Phòng được phân công cho đơn vị của bạn
          </span>
        </div>
      </div>

      <div className="cd-tabs pvd-tabs">
        <button
          className={`cd-tab pvd-tab${choToiCham ? " cd-tab-active pvd-tab-active" : ""}`}
          onClick={() => change("cho-cham")}
        >
          <i
            className="fa-solid fa-hourglass-half"
            aria-hidden="true"
            style={{ marginRight: 6 }}
          ></i>
          Chờ tôi chấm
        </button>
        <button
          className={`cd-tab pvd-tab${!choToiCham ? " cd-tab-active pvd-tab-active" : ""}`}
          onClick={() => change("tat-ca")}
        >
          <i
            className="fa-solid fa-layer-group"
            aria-hidden="true"
            style={{ marginRight: 6 }}
          ></i>
          Tất cả phiếu được xem
        </button>
      </div>

      <div className="cd-toolbar pvd-toolbar">
        <div className="pvd-toolbar-left">
          <div className="pvd-search-box">
            <i
              className="fa-solid fa-magnifying-glass pvd-search-icon"
              aria-hidden="true"
            ></i>
            <input
              type="text"
              className="pvd-search-input"
              placeholder="Tìm theo tên đơn vị..."
              value={timKiem}
              onChange={(e) => setTimKiem(e.target.value)}
            />
            {timKiem && (
              <button
                type="button"
                className="pvd-search-clear"
                onClick={() => setTimKiem("")}
                title="Xóa tìm kiếm"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            )}
          </div>
          <div className="pvd-info-badge">
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>
              {choToiCham
                ? "Phiếu còn tiêu chí chờ bạn thẩm định"
                : "Danh sách phiếu trong phạm vi được xem"}
            </span>
          </div>
        </div>
        <div className="pvd-toolbar-right">
          <button
            type="button"
            className="pvd-refresh-btn"
            disabled={data.loading}
            onClick={() => setRetry((v) => v + 1)}
            title="Tải lại danh sách"
          >
            <i
              className={`fa-solid fa-rotate${data.loading ? " fa-spin" : ""}`}
              aria-hidden="true"
            ></i>
            Làm mới
          </button>
        </div>
      </div>

      <div className="modern-table-card">
        {data.loading ? (
          <div className="cd-empty pvd-empty">
            <i
              className="fa-solid fa-spinner fa-spin pvd-empty-icon"
              style={{ color: "#2563eb" }}
              aria-hidden="true"
            ></i>
            Đang tải phiếu...
          </div>
        ) : data.error ? (
          <div
            className="cd-empty pvd-empty"
            role="alert"
            style={{ color: "#dc2626" }}
          >
            <i
              className="fa-solid fa-triangle-exclamation pvd-empty-icon"
              style={{ color: "#dc2626" }}
              aria-hidden="true"
            ></i>
            {data.error}
          </div>
        ) : !data.rows.length ? (
          <div className="cd-empty pvd-empty">
            <i
              className="fa-solid fa-folder-open pvd-empty-icon"
              aria-hidden="true"
            ></i>
            Không có phiếu trong mục này.
          </div>
        ) : !rowsHienThi.length ? (
          <div className="cd-empty pvd-empty">
            <i
              className="fa-solid fa-magnifying-glass pvd-empty-icon"
              aria-hidden="true"
            ></i>
            Không tìm thấy phiếu nào phù hợp với từ khóa "{timKiem}".
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table pvd-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Đơn vị</th>
                  <th style={{ width: "16%", textAlign: "center" }}>
                    Năm đánh giá
                  </th>
                  <th style={{ width: "26%", textAlign: "center" }}>
                    Trạng thái
                  </th>
                  <th style={{ width: "20%", textAlign: "right" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => (
                  <tr key={p.IdPhieuDv}>
                    <td>
                      <div className="pvd-unit-cell">
                        <div className="pvd-unit-icon">
                          <i
                            className="fa-solid fa-building-columns"
                            aria-hidden="true"
                          ></i>
                        </div>
                        <div>
                          <div className="pvd-unit-name">
                            {p.TenDonVi || `Đơn vị #${p.IdDonVi}`}
                          </div>
                          {p.IdDonVi && (
                            <div className="pvd-unit-sub">
                              Mã đơn vị: #{p.IdDonVi}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="pvd-year-pill">{p.IdNam}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <TrangThaiDonViBadge trangThai={p.TrangThai} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        className="table-btn-primary"
                        style={{ textDecoration: "none", color: "#ffffff" }}
                        to={`${PATH}/${p.IdPhieuDv}`}
                        state={{ kpiFilters: Object.fromEntries(params) }}
                      >
                        <i
                          className="fa-solid fa-pen-to-square"
                          aria-hidden="true"
                          style={{ marginRight: 6 }}
                        ></i>
                        Mở phiếu
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-pager">
          <span>
            Trang <strong>{page}</strong>
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="table-pager-btn"
              disabled={data.loading || page <= 1}
              onClick={() => change(choToiCham ? "cho-cham" : "tat-ca", page - 1)}
            >
              <i
                className="fa-solid fa-chevron-left"
                aria-hidden="true"
                style={{ marginRight: 4 }}
              ></i>
              Trang trước
            </button>
            <button
              className="table-pager-btn"
              disabled={data.loading || data.rows.length < 20}
              onClick={() => change(choToiCham ? "cho-cham" : "tat-ca", page + 1)}
            >
              Trang sau
              <i
                className="fa-solid fa-chevron-right"
                aria-hidden="true"
                style={{ marginLeft: 4 }}
              ></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
