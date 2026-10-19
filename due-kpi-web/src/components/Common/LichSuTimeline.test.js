import React from "react";
import { render, screen } from "@testing-library/react";
import LichSuTimeline, { tachNgayGio } from "./LichSuTimeline";

test("tachNgayGio tách ngày, giờ và bỏ qua giá trị rỗng", () => {
  expect(tachNgayGio(new Date(2026, 9, 19, 8, 7))).toMatchObject({ ngay: "19/10/2026", gio: "08:07" });
  expect(tachNgayGio(null)).toEqual({ ngay: "—", gio: "" });
  expect(tachNgayGio("không phải ngày")).toEqual({ ngay: "—", gio: "" });
});

test("xếp mốc mới nhất lên đầu và hiện đủ nội dung", () => {
  const { container } = render(<LichSuTimeline items={[
    { key: 1, ...tachNgayGio(new Date(2026, 9, 18, 9, 0)), tieuDe: "Ghi nhận", nguoi: "An" },
    { key: 2, ...tachNgayGio(new Date(2026, 9, 19, 8, 27)), tieuDe: "Sửa", moTa: "Đổi tên", phu: "Điểm: 4 → 7", nguoi: "Bình" },
  ]} />);
  const titles = [...container.querySelectorAll(".ls-timeline-body > b")].map((b) => b.textContent);
  expect(titles).toEqual(["Sửa", "Ghi nhận"]);
  expect(container.querySelector(".ls-timeline").classList.contains("ls-timeline-moi-nhat")).toBe(true);
  expect(screen.getByText("19/10/2026")).toBeTruthy();
  expect(screen.getByText("08:27")).toBeTruthy();
  expect(screen.getByText("Đổi tên")).toBeTruthy();
  expect(screen.getByText("Điểm: 4 → 7")).toBeTruthy();
});

test("giữ thứ tự gốc khi thiếu mốc thời gian và hiện chữ khi rỗng", () => {
  const { container, rerender } = render(<LichSuTimeline items={[{ key: 1, ngay: "—", tieuDe: "A" }, { key: 2, ngay: "—", tieuDe: "B" }]} />);
  expect([...container.querySelectorAll(".ls-timeline-body > b")].map((b) => b.textContent)).toEqual(["A", "B"]);
  expect(container.querySelector(".ls-timeline-moi-nhat")).toBeNull();
  rerender(<LichSuTimeline items={[]} />);
  expect(screen.getByText("Chưa có lịch sử.")).toBeTruthy();
  rerender(<LichSuTimeline items={[]} rong={null} />);
  expect(container.innerHTML).toBe("");
});
