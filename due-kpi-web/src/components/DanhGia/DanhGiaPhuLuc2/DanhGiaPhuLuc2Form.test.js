import React, { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DanhGiaPhuLuc2Form from "./DanhGiaPhuLuc2Form";

const coKhong = { IdTieuChi: 1, TenTieuChi: "Hướng dẫn đề tài SVNCKH", TenNhom: "NCKH", TenNhomCha: "NCKH", LoaiThangDiem: 3, DiemToiDa: 3, BatBuocMinhChung: true };
const tuDong = { IdTieuChi: 2, TenTieuChi: "Phản hồi sinh viên", TenNhom: "NCKH", TenNhomCha: "NCKH", DiemToiDa: 5 };
const autoScores = { 2: { IdTieuChi: 2, IdChiTiet: 9, CongThucTongHop: "PHSV_TB", DiemChinhThuc: 5, MinhChung: [] } };

const PhieuThu = ({ duLieuDau = {}, loaiDoiTuong }) => {
  const [formData, setFormData] = useState(duLieuDau);
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DanhGiaPhuLuc2Form
        criteriaList={[coKhong, tuDong]}
        formData={formData}
        autoScores={autoScores}
        tongDiemCoBan={0}
        loaiDoiTuong={loaiDoiTuong}
        laDongMoNhap={() => true}
        onScoreChange={(id, _idThang, diem) => setFormData((cu) => ({ ...cu, [id]: { ...cu[id], DiemTuDanhGia: diem } }))}
        onTextChange={() => {}}
      />
    </MemoryRouter>
  );
};

test("hai loại tiêu chí mang huy hiệu nguồn điểm khác nhau", () => {
  render(<PhieuThu />);
  expect(screen.getByText("Giảng viên kê khai và nộp minh chứng")).toBeInTheDocument();
  expect(screen.getByText("Tiêu chí được tổng hợp điểm tự động")).toBeInTheDocument();
  expect(screen.queryByText("Bắt buộc có minh chứng")).not.toBeInTheDocument();
});

test("phiếu nhân viên đổi chữ huy hiệu kê khai", () => {
  render(<PhieuThu loaiDoiTuong={2} />);
  expect(screen.getByText("Nhân viên kê khai và nộp minh chứng")).toBeInTheDocument();
});

// Hai khối luôn trong DOM để CSS co giãn mượt; lúc đóng chúng mang `inert`.
const dangDong = (el) => el.closest("[inert]") != null;

test("diễn giải và minh chứng chỉ mở khi chọn mức có điểm", () => {
  render(<PhieuThu />);
  expect(dangDong(screen.getByLabelText("Diễn giải / ghi chú"))).toBe(true);
  expect(dangDong(screen.getByText("Tệp minh chứng"))).toBe(true);

  fireEvent.click(screen.getByRole("radio", { name: /Có/ }));
  expect(dangDong(screen.getByLabelText("Diễn giải / ghi chú"))).toBe(false);
  expect(dangDong(screen.getByText("Tệp minh chứng"))).toBe(false);

  fireEvent.click(screen.getByRole("radio", { name: /Không/ }));
  expect(dangDong(screen.getByLabelText("Diễn giải / ghi chú"))).toBe(true);
});

test("dòng 0 điểm còn tệp cũ vẫn mở khối minh chứng để gỡ", () => {
  render(<PhieuThu duLieuDau={{ 1: { DiemTuDanhGia: 0, DanhSachFile: [{ fileName: "cu.pdf" }] } }} />);
  expect(dangDong(screen.getByText("cu.pdf"))).toBe(false);
});
