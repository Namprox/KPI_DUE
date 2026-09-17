import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CanhBaoTieuChiChuaChot from "./CanhBaoTieuChiChuaChot";

test("mặc định thu gọn danh sách dài và cho phép mở khi cần", () => {
  const { container } = render(
    <CanhBaoTieuChiChuaChot
      tieuChi={[
        { IdTieuChi: 1, TenTieuChi: "Tiêu chí thứ nhất" },
        { IdTieuChi: 2, TenTieuChi: "Tiêu chí thứ hai" },
      ]}
    />,
  );

  expect(container.textContent).toContain(
    "Còn 2 tiêu chí chưa thẩm định xong",
  );
  const details = container.querySelector("details");
  expect(details.hasAttribute("open")).toBe(false);

  fireEvent.click(screen.getByText("Xem danh sách"));
  expect(details.hasAttribute("open")).toBe(true);
  expect(screen.getByText("Tiêu chí thứ nhất")).toBeTruthy();
  expect(screen.getByText("Tiêu chí thứ hai")).toBeTruthy();
});

test("không hiện cảnh báo khi không có tiêu chí chưa chốt", () => {
  const { container } = render(<CanhBaoTieuChiChuaChot tieuChi={[]} />);
  expect(container.childElementCount).toBe(0);
});
