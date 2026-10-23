import {
  MENU_GROUPS,
  ROUTE_RULES,
  canAccessPath,
  visibleGroups,
} from "./menuConfig";

const expectedGroups = [
  ["Cá nhân", "evaluation", "Phiếu KPI của tôi", "Đánh giá KPI Giảng viên|Đánh giá KPI Nhân viên|Lịch sử đánh giá|Kho minh chứng cá nhân"],
  ["Cá nhân", "personalData", "Dữ liệu của tôi", "Giờ giảng của tôi|Kê khai thành tích|Thành tích NCKH|Phản hồi sinh viên|Vi phạm của tôi"],
  ["Cá nhân", "nhiemVuPhucVuCuaToi", "Nhiệm vụ PVCĐ của tôi", "Nhiệm vụ PVCĐ của tôi"],
  ["Cá nhân", "hoatDongThanhTich", "Hoạt động & thành tích", "Hoạt động đào tạo|Khen thưởng đột xuất|Phát triển đội ngũ|Sáng kiến|Thành tích đoàn thể"],
  ["Công việc đơn vị", "unitScoring", "Việc chờ tôi xử lý", "Hồ sơ chờ thẩm định|Chấm theo tiêu chí|Chờ tôi chấm KPI đơn vị|Duyệt KPI viên chức theo quý|Duyệt hồ sơ KPI|Chốt hồ sơ nhân viên|Tờ trình KPI đơn vị|Duyệt kê khai thành tích"],
  ["Công việc đơn vị", "unitKpi", "KPI đơn vị", "Đánh giá KPI Khoa|Lịch sử đánh giá KPI Khoa|Đánh giá KPI Phòng/Trung tâm|Lịch sử đánh giá KPI Phòng/Trung tâm|Kho minh chứng đơn vị|Phiếu toàn đơn vị|Báo cáo đơn vị"],
  ["Công việc đơn vị", "viPham", "Vi phạm", "Ghi nhận vi phạm giảng viên|Ghi nhận vi phạm nhân viên|Thống kê vi phạm của Khoa|Tổng hợp điểm trừ vi phạm"],
  ["Công việc đơn vị", "kpiSources", "Dữ liệu nguồn", "Giờ giảng từ thời khóa biểu|Tỷ lệ hoàn thành giờ giảng|Quản lý học vụ|Quản lý đánh giá sinh viên|Điểm trung bình ĐGSV|Mẫu giảm trừ"],
  ["Công việc đơn vị", "nhiemVuPhucVu", "Nhiệm vụ PVCĐ", "Phân công và thực hiện|Tổng hợp kết quả"],
  ["Cấp Trường", "evaluationMgmt", "Duyệt KPI cấp trường", "Duyệt hồ sơ lãnh đạo|Xét xuất sắc viên chức Khoa|Theo dõi phiếu toàn trường"],
  ["Quản trị", "planMgmt", "Thiết lập KPI", "Quản lý năm đánh giá|Giảm trừ theo năm|Định mức giảng viên|Danh mục thành tích vượt trội|Danh mục loại vi phạm"],
  ["Quản trị", "criteriaMgmt", "Quản lý tiêu chí", "Nhóm tiêu chí|Tiêu chí đánh giá|Mẫu phiếu đánh giá"],
  ["Quản trị", "uyQuyenNhapLieu", "Ủy quyền nhập liệu", "Ủy quyền nhập liệu đào tạo|Ủy quyền nhập liệu khen thưởng|Ủy quyền nhập liệu phát triển đội ngũ|Ủy quyền nhập liệu sáng kiến|Ủy quyền kê khai chức vụ"],
  ["Quản trị", "orgMgmt", "Tổ chức & hệ thống", "Cơ cấu đơn vị|Người dùng|Chức danh nghề nghiệp|Quản lý chức vụ|Nhật ký hệ thống"],
];

const donVi = (MaChucVu, LoaiDoiTuong) => ({ MaChucVu, LoaiDoiTuong });

const duLieuGiangVienPaths = [
  "/thanh-tich-nckh",
  "/phan-hoi-sinh-vien-cua-toi",
  "/vi-pham-cua-toi",
];

test.each(["GV", "GVC", "GVCC", "CV", "", null, undefined])(
  "loại 1 được vào menu và URL dữ liệu giảng viên dù mã chức danh là %s",
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
  "loại 2 không vào dữ liệu giảng viên dù mã chức danh là %s và mang id cũ",
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
  const user = { MaChucDanh: "GV", DonVi: [donVi("TP", 2), donVi("GV", 1)] };
  const visible = visibleGroups(user).flatMap((group) => group.items.map((item) => item.path));
  [...duLieuGiangVienPaths, "/danh-gia-phu-luc-2", "/danh-gia-kpi-nhan-vien", "/ke-khai-thanh-tich"].forEach((path) => {
    expect(visible).toContain(path);
    expect(canAccessPath(path, user)).toBe(true);
  });
});

test("mã chức danh không ghi đè phân loại phiếu KPI hoặc tự cấp quyền khi thiếu phân loại", () => {
  expect(canAccessPath("/danh-gia-phu-luc-2", { MaChucDanh: "GV" })).toBe(false);
  expect(canAccessPath("/danh-gia-phu-luc-2", { MaChucDanh: "GV", DonVi: [donVi("NV", 2)] })).toBe(false);
  expect(canAccessPath("/danh-gia-kpi-nhan-vien", { MaChucDanh: "GV", DonVi: [donVi("NV", 2)] })).toBe(true);
});

test("nhóm và mục sidebar theo đúng thứ tự công việc", () => {
  expect(
    MENU_GROUPS.map((group) => [
      group.section,
      group.key,
      group.label,
      group.items
        .filter((item) => !item.name.startsWith("[Mock]"))
        .map((item) => item.name),
    ]),
  ).toEqual(expectedGroups.map(([section, key, label, names]) => [section, key, label, names.split("|")]));
});

test("các nhóm cùng phân khu đứng liền nhau, khu theo thứ tự cá nhân → quản trị", () => {
  const sections = MENU_GROUPS.map((group) => group.section)
    .filter((section, i, all) => section !== all[i - 1]);
  expect(sections).toEqual(["Cá nhân", "Công việc đơn vị", "Cấp Trường", "Quản trị"]);
});

test("menuAccess chỉ ẩn mục khỏi sidebar, URL giữ nguyên quyền", () => {
  const giamTru = "/giam-tru-chuc-vu-theo-nam";
  const khoCaNhan = "/kho-minh-chung";
  const paths = (user) => visibleGroups(user).flatMap((g) => g.items.map((i) => i.path));

  [{ MaChucVu: "GV", DonVi: [donVi("GV", 1)] }, { MaChucVu: "TK", DonVi: [donVi("TK", 1)] }, { MaChucVu: "TP", DonVi: [donVi("TP", 2)] }]
    .forEach((user) => {
      expect(paths(user)).not.toContain(giamTru);
      expect(canAccessPath(giamTru, user)).toBe(true);
    });
  // Chức vụ CHÍNH như API sửa giảm trừ; kiêm nhiệm không đủ.
  ["ADMIN", "HT", "PHT"].forEach((MaChucVu) => expect(paths({ MaChucVu })).toContain(giamTru));
  expect(paths({ MaChucVu: "GV", DonVi: [donVi("GV", 1), donVi("PHT", 0)] })).not.toContain(giamTru);

  const admin = { MaChucVu: "ADMIN", DonVi: [donVi("ADMIN", 0)] };
  expect(paths(admin)).not.toContain(khoCaNhan);
  expect(canAccessPath(khoCaNhan, admin)).toBe(true);
  expect(paths({ MaChucVu: "GV", DonVi: [donVi("GV", 1)] })).toContain(khoCaNhan);
  expect(paths({ MaChucVu: "NV", DonVi: [donVi("NV", 2)] })).toContain(khoCaNhan);
});

test.each([
  ["giảng viên", { MaChucVu: "GV", DonVi: [donVi("GV", 1)] }],
  ["thư ký Khoa", { MaChucVu: "TKK", DonVi: [donVi("TKK", 2)] }],
  ["trưởng Khoa", { MaChucVu: "TK", DonVi: [donVi("TK", 1)] }],
  ["trưởng Phòng", { MaChucVu: "TP", DonVi: [donVi("TP", 2)] }],
  ["Hiệu trưởng", { MaChucVu: "HT", DonVi: [donVi("HT", 1)] }],
  ["ADMIN", { MaChucVu: "ADMIN", DonVi: [donVi("ADMIN", 0)] }],
])("mỗi nhóm sidebar của %s không quá 7 mục", (_label, user) => {
  const quyen = { XemTatCa: true, LaQuanLy: true, Success: true };
  visibleGroups(user, quyen, quyen, quyen, quyen, quyen, { Xem: true, QuanLy: true })
    .forEach((group) => expect([group.label, group.items.length <= 7]).toEqual([group.label, true]));
});

test.each([
  ["giảng viên", { MaChucVu: "GV", MaChucDanh: "GV", IdChucDanh: 3, DonVi: [donVi("GV", 1)] }, ["/danh-gia-phu-luc-2", "/gio-giang-cua-toi"], ["/danh-gia-kpi-nhan-vien"]],
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
