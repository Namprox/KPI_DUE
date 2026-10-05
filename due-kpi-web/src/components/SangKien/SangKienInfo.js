import React from "react";

export const ngaySangKien = (value, time = false) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : time ? date.toLocaleString("vi-VN") : date.toLocaleDateString("vi-VN");
};
export const ketQuaXetSangKien = (item) => item.LaDoiMoiGiangDay === true
  ? "Đổi mới, sáng tạo trong giảng dạy" : item.LaDoiMoiGiangDay === false ? "Không phải đổi mới giảng dạy" : "Chưa xét";
export function TacGiaSangKien({ items = [] }) {
  return <ul className="sk-authors">{items.map((person, index) => {
    const matched = person.IdNhanVien != null;
    const temporary = matched && person.CachGhep === 2;
    return <li key={person.Id ?? `${person.IdNhanVien ?? "nguon"}-${index}`} className={temporary ? "sk-name-match" : undefined}>
      <span className={matched ? "table-person-name" : "sk-unmatched"}>{person.HoTen || person.HoTenNguon || "Tác giả chưa xác định"}</span>
      <small>{[person.MaNhanVien, person.EmailNguon, person.LaGiangVien === true ? "Giảng viên" : person.LaVienChuc === true ? "Viên chức" : ""].filter(Boolean).join(" · ")}</small>
      {!matched ? <small className="sk-unmatched">Chưa khớp nhân sự — không được tính điểm</small>
        : temporary ? <small className="sk-unmatched">Ghép tạm theo họ tên — cần rà soát</small>
          : person.CachGhep === 1 ? <small>Ghép theo email</small>
            : person.CachGhep === 3 ? <small>P_KH nhập tay</small> : null}
    </li>;
  })}</ul>;
}
export function TrangThaiSangKien({ item }) {
  return <div className="sk-badges">
    <span className={`sk-badge ${item.Nguon === 1 ? "sk-source" : "sk-TRUNG"}`}>{item.Nguon === 1 ? "Đồng bộ NCKH" : item.Nguon === 2 ? "P_KH nhập tay" : "Nguồn chưa xác định"}</span>
    {item.Nguon === 1 && item.ConONguon === false && <span className="sk-badge sk-warning">Không còn trên NCKH — không tính điểm</span>}
    {item.IdCap == null && <span className="sk-badge sk-warning">Chưa xác định cấp</span>}
    {item.IdNamDanhGia == null && <span className="sk-badge sk-warning">Không thuộc năm đánh giá — không tính điểm</span>}
    {item.DaXoa === true && <span className="sk-badge sk-LOI">Đã xoá</span>}
  </div>;
}
