import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NhatKyHeThong from "./NhatKyHeThong";
import { apiFetch } from "../utils/api";
import { getNhatKy, rawValue, logTime } from "../utils/nhatKyApi";
import { canAccessPath, visibleGroups } from "../config/menuConfig";

jest.mock("../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/dialog", () => ({ Dialog: ({ visible, children }) => visible ? <div role="dialog">{children}</div> : null }));
const requestId = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url) => {
    let data = { Success: true, Page: 1, TotalPages: 1, TotalCount: 0, Items: [] };
    if (url.includes("thao-tac/bang")) data.Items = [{ TenBang: "nhan_vien", DangBat: true, TriggerDangChay: false }];
    else if (url.includes("dung-luong")) data.Item = { CanhBao: true, PhanTramGioiHan: 85 };
    else if (url.includes("thao-tac/2")) data.Item = { TenBang: "nhan_vien", CacTruong: [{ Truong: "changed", GiaTriMoi: "", CoThayDoi: true }, { Truong: "unchanged", GiaTriCu: "a", GiaTriMoi: "a", CoThayDoi: false }] };
    else if (url.includes("thao-tac?")) data.Items = [{ Id: 1, LaTomTat: true, SoDong: 10, TenBang: "raw" }, { Id: 2, MucGhi: 1, LoaiTacNhan: 3, TenBang: "nhan_vien", TenDangNhapSql: "operator" }];
    else data.Items = [{ Id: 3, LoaiSuKien: 5, ThanhCong: false, LyDoThatBai: "InvalidPassword", HoTen: "Người bị đặt lại", HoTenNguoiThucHien: "Quản trị A", MaYeuCau: requestId }];
    return { ok: true, json: async () => data };
  });
});

test.each([["ADMIN", true], ["Admin", true], ["admin", true], [" Admin ", true], ["HT", false], ["NV", false], [undefined, false]])("chức vụ chính %s: cùng quyền menu và URL", (role, allowed) => {
  const user = { MaChucVu: role, DonVi: [{ MaChucVu: "ADMIN" }] };
  expect(canAccessPath("/nhat-ky-he-thong", user)).toBe(allowed);
  expect(visibleGroups(user).flatMap((g) => g.items).some((i) => i.path === "/nhat-ky-he-thong")).toBe(allowed);
});

test("giữ false, khoá ghép, chuỗi thô và thời gian máy chủ", async () => {
  await getNhatKy("dang-nhap", { thanhCong: false, khoaBanGhi: "4521|2026", tenDangNhap: "" });
  expect(apiFetch.mock.calls[0][0]).toContain("thanhCong=false&khoaBanGhi=4521%7C2026");
  expect(rawValue(undefined)).toBe("(trống)");
  expect(rawValue("")).toBe('""');
  expect(rawValue("2.00 ")).toBe("2.00 ");
  expect(logTime("2026-10-09T10:21:05")).toBe("2026-10-09 10:21:05");
});

test("liên kết request, tóm tắt, cảnh báo và so sánh trường", async () => {
  render(<NhatKyHeThong />);
  expect(await screen.findByText("Sai mật khẩu")).toBeInTheDocument();
  expect(screen.getByText(/Người đặt lại: Quản trị A/)).toBeInTheDocument();
  expect(screen.getByText(/Nhật ký bảng nhan_vien chưa hoạt động/)).toBeInTheDocument();
  expect(screen.getByText(/CSDL sắp đầy/)).toBeInTheDocument();
  fireEvent.click(screen.getByText(requestId));
  expect(await screen.findByText("Import 10 dòng (tóm tắt)")).toBeInTheDocument();
  expect(screen.getAllByText("Chi tiết")).toHaveLength(1);
  expect(apiFetch.mock.calls.some(([url]) => url.includes(`thao-tac?maYeuCau=${requestId}`))).toBe(true);
  fireEvent.click(screen.getByText("Chi tiết"));
  expect(await screen.findByText("changed")).toBeInTheDocument();
  expect(screen.getByText("(trống)")).toBeInTheDocument();
  expect(screen.getByText('""')).toBeInTheDocument();
  expect(screen.queryByText("unchanged")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Hiện tất cả trường"));
  expect(screen.getByText("unchanged")).toBeInTheDocument();
});

test("lỗi 403 không hiển thị như danh sách rỗng", async () => {
  apiFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
  render(<NhatKyHeThong />);
  await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
  expect(screen.queryByText("Không có nhật ký phù hợp.")).not.toBeInTheDocument();
});
