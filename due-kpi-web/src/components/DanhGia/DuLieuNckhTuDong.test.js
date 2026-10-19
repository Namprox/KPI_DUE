import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import DuLieuNckhTuDong from "./DuLieuNckhTuDong";

const show = (gio) => render(<DuLieuNckhTuDong info={{ DuLieuGioNckh: gio }} />).container.textContent;

test("định mức > 0: giữ quy đổi / định mức, tỷ lệ và Đạt / Chưa đạt", () => {
  const text = show({ GioNckhQuyDoi: 100.02, GioNckhDinhMuc: 108, TyLeHoanThanh: 92.61, DatDinhMuc: false });
  expect(text).toContain("/ định mức 108.00");
  expect(text).toContain("hoàn thành 92.61%");
  expect(text).toContain("Chưa đạt định mức");
});

test("định mức ≤ 0, LaTroGiangTapSu = false: miễn NCKH, không in định mức 0 hay Đạt định mức", () => {
  const text = show({ GioNckhQuyDoi: 0, GioNckhDinhMuc: 0, LaTroGiangTapSu: false, DatDinhMuc: true });
  expect(text).toContain("không có định mức");
  expect(text).toContain("Miễn NCKH");
  expect(text).not.toContain("định mức 0");
  expect(text).not.toContain("Đạt định mức");
});

test("định mức ≤ 0, LaTroGiangTapSu = true: trợ giảng tập sự, không in Chưa đạt định mức", () => {
  const text = show({ GioNckhQuyDoi: 12, GioNckhDinhMuc: -5, LaTroGiangTapSu: true, DatDinhMuc: false });
  expect(text).toContain("Trợ giảng / phục vụ giảng dạy / chuyên viên tập sự");
  expect(text).not.toContain("Chưa đạt định mức");
});

test("định mức ≤ 0, LaTroGiangTapSu vắng: chưa có thông tin đối tượng", () => {
  const text = show({ GioNckhQuyDoi: 0, GioNckhDinhMuc: 0, DatDinhMuc: false });
  expect(text).toContain("Chưa có thông tin đối tượng");
  expect(text).not.toContain("Chưa đạt định mức");
});
