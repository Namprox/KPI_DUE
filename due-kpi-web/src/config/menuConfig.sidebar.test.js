import {
  MENU_GROUPS,
  ROUTE_RULES,
  canAccessPath,
  visibleGroups,
} from "./menuConfig";

const expectedGroups = [
  ["evaluation", "Phiếu KPI", "Đánh giá KPI Giảng viên|Đánh giá KPI Nhân viên|Lịch sử đánh giá|Đánh giá KPI Khoa|Lịch sử đánh giá KPI Khoa|Đánh giá KPI Phòng/Trung tâm|Lịch sử đánh giá KPI Phòng/Trung tâm|Kho minh chứng cá nhân|Kho minh chứng đơn vị"],
  ["personalData", "Kê khai và dữ liệu của tôi", "Kê khai giờ quy đổi|Kê khai thành tích|Thành tích NCKH|Phản hồi sinh viên|Phục vụ cộng đồng|Vi phạm của tôi"],
  ["unitScoring", "Xử lý KPI đơn vị", "Hồ sơ chờ thẩm định|Chờ tôi chấm KPI đơn vị|Phiếu toàn đơn vị|Duyệt KPI viên chức theo quý|Duyệt hồ sơ KPI|Chốt hồ sơ nhân viên|Tờ trình KPI đơn vị|Duyệt kê khai giờ quy đổi|Duyệt kê khai thành tích|Ghi nhận vi phạm nhân viên|Báo cáo đơn vị"],
  ["evaluationMgmt", "Duyệt KPI cấp trường", "Duyệt hồ sơ lãnh đạo|Theo dõi phiếu toàn trường"],
  ["kpiSources", "Ghi nhận và số liệu KPI", "Giờ giảng từ thời khóa biểu|Quản lý học vụ|Quản lý đánh giá sinh viên|Điểm trung bình ĐGSV|Ghi nhận phục vụ cộng đồng|Ghi nhận vi phạm giảng viên|Tổng hợp điểm trừ vi phạm|Thống kê vi phạm của Khoa"],
  ["planMgmt", "Thiết lập KPI", "Quản lý năm đánh giá|Định mức giảng viên|Ngoại lệ định mức|Danh mục thành tích vượt trội|Danh mục loại vi phạm"],
  ["criteriaMgmt", "Quản lý tiêu chí", "Nhóm tiêu chí|Tiêu chí đánh giá|Mẫu phiếu đánh giá"],
  ["orgMgmt", "Cơ cấu tổ chức", "Cơ cấu đơn vị|Người dùng|Chức danh nghề nghiệp|Quản lý chức vụ"],
];

const donVi = (MaChucVu, LoaiDoiTuong) => ({ MaChucVu, LoaiDoiTuong });

const duLieuGiangVienPaths = [
  "/ke-khai-gio-quy-doi",
  "/thanh-tich-nckh",
  "/phan-hoi-sinh-vien-cua-toi",
  "/nhiem-vu-khoa-cua-toi",
  "/vi-pham-cua-toi",
];

test.each(["GV", "GVC", "GVCC", "HDLD_GV", "HDLD_HUU", " hdld_huu "])(
  "%s được vào cả menu và URL dữ liệu giảng viên bằng mã, không phụ thuộc id",
  (MaChucDanh) => {
    const user = { MaChucDanh, IdChucDanh: 999, DonVi: [donVi("GV", 1)] };
    const visible = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));
    duLieuGiangVienPaths.forEach((path) => {
      expect(visible).toContain(path);
      expect(canAccessPath(path, user)).toBe(true);
    });
  },
);

test.each(["HDLD_LX", "HDLD_NVCX", "HDLD_NVPV", "HDLD_NVKT", "CV", "", null, undefined])(
  "%s không vào dữ liệu giảng viên dù mang id cũ",
  (MaChucDanh) => {
    const user = { MaChucDanh, IdChucDanh: 3, DonVi: [donVi("NV", 2)] };
    const visible = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));
    duLieuGiangVienPaths.forEach((path) => {
      expect(visible).not.toContain(path);
      expect(canAccessPath(path, user)).toBe(false);
    });
    expect(canAccessPath("/danh-gia-kpi-nhan-vien", user)).toBe(true);
    expect(canAccessPath("/ke-khai-thanh-tich", user)).toBe(true);
  },
);

test("giảng viên kiêm nhiệm giữ các loại phiếu do backend phân loại", () => {
  const user = { MaChucDanh: "HDLD_HUU", DonVi: [donVi("GV", 1), donVi("TP", 2)] };
  const visible = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));
  [...duLieuGiangVienPaths, "/danh-gia-phu-luc-2", "/danh-gia-kpi-nhan-vien", "/ke-khai-thanh-tich"].forEach((path) => {
    expect(visible).toContain(path);
    expect(canAccessPath(path, user)).toBe(true);
  });
});

test("mã chức danh không ghi đè phân loại phiếu KPI hoặc tự cấp quyền khi thiếu phân loại", () => {
  expect(canAccessPath("/danh-gia-phu-luc-2", { MaChucDanh: "HDLD_HUU" })).toBe(false);
  expect(canAccessPath("/danh-gia-phu-luc-2", { MaChucDanh: "HDLD_HUU", DonVi: [donVi("NV", 2)] })).toBe(false);
  expect(canAccessPath("/danh-gia-kpi-nhan-vien", { MaChucDanh: "HDLD_HUU", DonVi: [donVi("NV", 2)] })).toBe(true);
});

test("nhóm và mục sidebar theo đúng thứ tự công việc", () => {
  expect(
    MENU_GROUPS.map((group) => [
      group.key,
      group.label,
      group.items
        .filter((item) => !item.name.startsWith("[Mock]"))
        .map((item) => item.name),
    ]),
  ).toEqual(expectedGroups.map(([key, label, names]) => [key, label, names.split("|")]));
});

test.each([
  ["giảng viên", { MaChucVu: "GV", MaChucDanh: "GV", IdChucDanh: 3, DonVi: [donVi("GV", 1)] }, ["/danh-gia-phu-luc-2", "/ke-khai-gio-quy-doi"], ["/danh-gia-kpi-nhan-vien"]],
  ["nhân viên", { MaChucVu: "NV", DonVi: [donVi("NV", 2)] }, ["/danh-gia-kpi-nhan-vien", "/ke-khai-thanh-tich"], ["/danh-gia-phu-luc-2"]],
  ["thư ký Khoa", { MaChucVu: "TKK", DonVi: [donVi("TKK", 1)] }, ["/danh-gia-kpi-don-vi"], ["/quan-ly/phieu"]],
  ["thư ký Phòng", { MaChucVu: "TKP", DonVi: [donVi("TKP", 2)] }, ["/danh-gia-kpi-phong"], ["/quan-ly/phieu"]],
  ["trưởng Khoa", { MaChucVu: "TK", DonVi: [donVi("TK", 1)] }, ["/quan-ly/duyet-ho-so", "/quan-ly/to-trinh"], ["/truong/to-trinh", "/ghi-nhan-vi-pham-nhan-vien"]],
  ["trưởng Khoa lớn", { MaChucVu: "TKL", DonVi: [donVi("TKL", 1)] }, ["/quan-ly/duyet-ho-so"], ["/ghi-nhan-vi-pham-nhan-vien"]],
  ["trưởng Phòng", { MaChucVu: "TP", DonVi: [donVi("TP", 2)] }, ["/quan-ly/ho-so-nhan-vien", "/ghi-nhan-vi-pham-nhan-vien"], ["/quan-ly/duyet-ho-so"]],
  ["Hiệu trưởng", { MaChucVu: "HT" }, ["/truong/to-trinh", "/quan-ly-nam-danh-gia", "/ghi-nhan-vi-pham-nhan-vien"], ["/danh-gia-kpi-don-vi"]],
  ["ADMIN", { MaChucVu: "ADMIN" }, ["/truong/phieu", "/nhom-tieu-chi", "/quan-ly/phieu-quy"], ["/danh-gia-kpi-nhan-vien"]],
  ["kiêm nhiệm", { MaChucVu: "TKK", DonVi: [donVi("TKK", 1), donVi("TP", 2)] }, ["/danh-gia-kpi-don-vi", "/danh-gia-kpi-phong", "/quan-ly/ho-so-nhan-vien", "/ghi-nhan-vi-pham-nhan-vien"], ["/truong/to-trinh"]],
])("lọc sidebar cho %s mà không đổi quyền URL", (_label, user, allowed, denied) => {
  const groups = visibleGroups(user);
  const paths = groups.flatMap((group) => group.items.map((item) => item.path));

  expect(groups.every((group) => group.items.length > 0)).toBe(true);
  expect(groups.map((group) => group.key)).toEqual(
    MENU_GROUPS.map((group) => group.key).filter((key) =>
      groups.some((group) => group.key === key),
    ),
  );
  expect(groups.flatMap((group) => group.items).some((item) => item.name.startsWith("[Mock]"))).toBe(false);
  expect(paths.every((path) => canAccessPath(path, user))).toBe(true);
  allowed.forEach((path) => {
    expect(paths).toContain(path);
    expect(canAccessPath(path, user)).toBe(true);
  });
  denied.forEach((path) => {
    expect(paths).not.toContain(path);
    expect(canAccessPath(path, user)).toBe(false);
  });
});

test("đường dẫn Mock vẫn dùng trực tiếp; phiếu quý dùng chung mục KPI nhân viên", () => {
  const user = { MaChucVu: "NV", DonVi: [donVi("NV", 2)] };
  const paths = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));
  const allPaths = MENU_GROUPS.flatMap((group) => group.items.map((item) => item.path));

  expect(paths).not.toContain("/mock-tham-dinh-nhan-vien");
  expect(canAccessPath("/mock-tham-dinh-nhan-vien", user)).toBe(true);
  expect(allPaths.filter((path) => path === "/danh-gia-kpi-nhan-vien")).toHaveLength(1);
  expect(allPaths).not.toContain("/phieu-quy-cua-toi");
  expect(new Set(ROUTE_RULES.map((rule) => rule.path)).size).toBe(ROUTE_RULES.length);
});

test("alias cũ của trang vi phạm nhân viên dùng cùng quyền với trang chính", () => {
  const alias = "/mock-ghi-nhan-vi-pham-nv";
  expect(canAccessPath(alias, { MaChucVu: "TK" })).toBe(false);
  expect(canAccessPath(alias, { MaChucVu: "TKL" })).toBe(false);
  expect(canAccessPath(alias, { MaChucVu: "TP" })).toBe(true);
  expect(canAccessPath(alias, { MaChucVu: "ADMIN" })).toBe(true);
});

test("TK kiêm nhiệm TP vẫn thấy trang vi phạm nhân viên", () => {
  const user = { MaChucVu: "TK", DonVi: [donVi("TK", 1), donVi("TP", 2)] };
  const paths = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));

  expect(paths).toContain("/ghi-nhan-vi-pham-nhan-vien");
  expect(canAccessPath("/ghi-nhan-vi-pham-nhan-vien", user)).toBe(true);
});


test.each(["TK", "TKL", "TP", "ADMIN"])("%s vào được menu và URL phiếu được giao", (MaChucVu) => {
  const user = { MaChucVu, DonVi: [{ IdDonVi: 20, MaChucVu }] };
  expect(canAccessPath("/phieu-don-vi-cho-cham/7", user)).toBe(true);
  expect(visibleGroups(user).some((g) => g.items.some((i) => i.path === "/phieu-don-vi-cho-cham"))).toBe(true);
});
