-- =============================================================================
-- 1. BẢNG THAM CHIẾU
-- =============================================================================

-- 1.1. Đơn vị (Trường → Khoa → Bộ môn)
CREATE TABLE don_vi (
    id_don_vi       INT          IDENTITY(1,1) PRIMARY KEY,
    ma_don_vi       NVARCHAR(20) NOT NULL,
    ten_don_vi      NVARCHAR(200) NOT NULL,
    id_don_vi_cha   INT          NULL,
    cap_don_vi      TINYINT      NOT NULL,    -- 1: Trường, 2: Khoa/Viện, 3: Bộ môn
    -- Tham chiếu logic đến DueScienceDB.dbo.Departments.Id
    science_dept_id INT          NULL,
    trang_thai      BIT          DEFAULT 1,
    CONSTRAINT uq_ma_don_vi   UNIQUE (ma_don_vi),
    CONSTRAINT fk_don_vi_cha  FOREIGN KEY (id_don_vi_cha) REFERENCES don_vi(id_don_vi),
    CONSTRAINT chk_cap_don_vi CHECK (cap_don_vi IN (1, 2, 3))
);
GO

-- 1.2. Chức vụ
CREATE TABLE chuc_vu (
    id_chuc_vu  INT          IDENTITY(1,1) PRIMARY KEY,
    ma_chuc_vu  NVARCHAR(20)  NOT NULL,
    ten_chuc_vu NVARCHAR(100) NOT NULL,
    cap_bac     TINYINT       DEFAULT 1,     -- 1→5: Nhân viên → Hiệu trưởng
    trang_thai  BIT           DEFAULT 1,
    CONSTRAINT uq_ma_chuc_vu UNIQUE (ma_chuc_vu)
);
GO

-- 1.3. Nhóm giảng viên (xác định định mức giờ chuẩn)
CREATE TABLE nhom_giang_vien (
    id_nhom_gv INT          IDENTITY(1,1) PRIMARY KEY,
    ma_nhom    NVARCHAR(20)  NOT NULL,
    ten_nhom   NVARCHAR(200) NOT NULL,
    mo_ta      NVARCHAR(500) NULL,
    trang_thai BIT           DEFAULT 1,
    CONSTRAINT uq_ma_nhom_gv UNIQUE (ma_nhom)
);
GO

-- 1.4. Giảng viên / Nhân viên
CREATE TABLE nhan_vien (
    id_nhan_vien           INT           IDENTITY(1,1) PRIMARY KEY,
    ma_nhan_vien           NVARCHAR(20)  NOT NULL,
    ho_ten                 NVARCHAR(100) NOT NULL,
    email                  NVARCHAR(150) NULL,
    mat_khau               NVARCHAR(255) NOT NULL,
    id_don_vi              INT           NOT NULL,
    id_chuc_vu             INT           NULL,
    id_quan_ly_truc_tiep   INT           NULL,
    id_nhom_gv             INT           NULL,        -- NULL nếu không phải giảng viên
    trinh_do               NVARCHAR(50)  NULL,        -- Cử nhân, ThS, TS, PGS, GS (free-text dự phòng)
    -- Tham chiếu logic đến DueScienceDB.dbo.Users.Id
    science_user_id        INT           NULL,
    trang_thai             BIT           DEFAULT 1,
    ngay_tao               DATETIME      DEFAULT GETDATE(),
    CONSTRAINT uq_ma_nhan_vien UNIQUE (ma_nhan_vien),
    CONSTRAINT uq_science_user UNIQUE (science_user_id),  -- 1 GV ↔ 1 tài khoản science
    CONSTRAINT fk_nv_don_vi    FOREIGN KEY (id_don_vi)            REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_nv_chuc_vu   FOREIGN KEY (id_chuc_vu)           REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT fk_nv_quan_ly   FOREIGN KEY (id_quan_ly_truc_tiep) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_nv_nhom_gv   FOREIGN KEY (id_nhom_gv)           REFERENCES nhom_giang_vien(id_nhom_gv)
);
GO


-- =============================================================================
-- 2. CẤU HÌNH KPI
-- =============================================================================

-- 2.1. Năm đánh giá
CREATE TABLE nam_danh_gia (
    id_nam                      INT          PRIMARY KEY,  -- VD: 2024
    ngay_bat_dau                DATE         NOT NULL,
    ngay_ket_thuc               DATE         NOT NULL,
    ngay_mo_tu_danh_gia         DATE         NULL,
    ngay_dong_tu_danh_gia       DATE         NULL,
    ngay_mo_danh_gia_cap_tren   DATE         NULL,
    ngay_dong_danh_gia_cap_tren DATE         NULL,
    trang_thai                  TINYINT      DEFAULT 1,    -- 1: Chuẩn bị, 2: Đang mở, 3: Đã đóng
    ghi_chu                     NVARCHAR(500) NULL,
    CONSTRAINT chk_ngay_nam      CHECK (ngay_bat_dau < ngay_ket_thuc),
    CONSTRAINT chk_trang_thai_nam CHECK (trang_thai IN (1, 2, 3))
);
GO

-- 2.2. Định mức giảng viên theo nhóm và năm
CREATE TABLE dinh_muc_giang_vien (
    id_dinh_muc          INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhom_gv           INT           NOT NULL,
    id_nam               INT           NOT NULL,
    gio_giang_ly_thuyet  DECIMAL(8,2)  NOT NULL,   -- Giờ giảng lý thuyết chuẩn/năm
    gio_nckh             DECIMAL(8,2)  NOT NULL,   -- Giờ NCKH quy đổi chuẩn/năm
    mo_ta                NVARCHAR(500) NULL,
    CONSTRAINT fk_dm_nhom_gv        FOREIGN KEY (id_nhom_gv) REFERENCES nhom_giang_vien(id_nhom_gv),
    CONSTRAINT fk_dm_nam            FOREIGN KEY (id_nam)     REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT uq_dinh_muc_nhom_nam UNIQUE (id_nhom_gv, id_nam)
);
GO

-- 2.3. Nhóm tiêu chí (cây phân cấp)
--   Nhóm A (100đ): I. Đào tạo (40), II. NCKH (40), III. PVCĐ (20)
--   Nhóm B (điểm cộng): thành tích vượt trội
CREATE TABLE nhom_tieu_chi (
    id_nhom          INT           IDENTITY(1,1) PRIMARY KEY,
    ten_nhom         NVARCHAR(200) NOT NULL,
    id_nhom_cha      INT           NULL,
    loai_nhom        TINYINT       NOT NULL DEFAULT 1,  -- 1: Cơ bản (A), 2: Vượt trội (B)
    diem_toi_da      DECIMAL(5,2)  DEFAULT 100,
    thu_tu_hien_thi  INT           DEFAULT 0,
    trang_thai       BIT           DEFAULT 1,
    CONSTRAINT fk_nhom_cha  FOREIGN KEY (id_nhom_cha) REFERENCES nhom_tieu_chi(id_nhom),
    CONSTRAINT chk_loai_nhom CHECK (loai_nhom IN (1, 2))
);
GO

-- 2.4. Tiêu chí đánh giá
CREATE TABLE tieu_chi_danh_gia (
    id_tieu_chi            INT            IDENTITY(1,1) PRIMARY KEY,
    ten_tieu_chi           NVARCHAR(500)  NOT NULL,
    id_nhom                INT            NOT NULL,
    id_nam                 INT            NULL,          -- NULL = áp dụng mọi năm
    mo_ta                  NVARCHAR(1000) NULL,
    diem_toi_da            DECIMAL(5,2)   NOT NULL,
    loai_thang_diem        TINYINT        DEFAULT 1,     -- 1: Rời rạc, 2: Liên tục, 3: Có/Không, 4: Công thức
    cap_danh_gia           TINYINT        NULL,          -- 1: Trường, 2: Khoa, NULL: Cả hai
    cong_thuc_tinh_diem    NVARCHAR(500)  NULL,          -- Chỉ dùng khi loai_thang_diem = 4
    bat_buoc_minh_chung    BIT            DEFAULT 0,
    -- Đánh dấu các tiêu chí Nhóm B có thể đồng bộ từ DueScienceDB
    co_the_dong_bo_science BIT            DEFAULT 0,
    -- Tên bảng nguồn trong DueScienceDB để đồng bộ, VD: 'ScientificArticlesMngt'
    bang_nguon_science     NVARCHAR(100)  NULL,
    thu_tu_hien_thi        INT            DEFAULT 0,
    trang_thai             BIT            DEFAULT 1,
    CONSTRAINT fk_tieu_chi_nhom FOREIGN KEY (id_nhom)   REFERENCES nhom_tieu_chi(id_nhom),
    CONSTRAINT fk_tieu_chi_nam  FOREIGN KEY (id_nam)    REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT chk_diem_toi_da_tc  CHECK (diem_toi_da > 0),
    CONSTRAINT chk_loai_thang_diem CHECK (loai_thang_diem IN (1, 2, 3, 4))
);
GO

-- 2.5. Thang điểm (mức điểm rời rạc cho từng tiêu chí)
CREATE TABLE thang_diem (
    id_thang_diem   INT           IDENTITY(1,1) PRIMARY KEY,
    id_tieu_chi     INT           NOT NULL,
    gia_tri_diem    DECIMAL(5,2)  NOT NULL,
    dieu_kien_diem  NVARCHAR(500) NULL,       -- VD: 'Hoàn thành 100%', 'Không vi phạm'
    thu_tu_hien_thi INT           DEFAULT 0,
    CONSTRAINT fk_thang_diem_tieu_chi FOREIGN KEY (id_tieu_chi)
        REFERENCES tieu_chi_danh_gia(id_tieu_chi) ON DELETE CASCADE,
    CONSTRAINT chk_gia_tri_diem CHECK (gia_tri_diem >= 0)
);
GO

-- 2.6. Mẫu đánh giá (template gắn tiêu chí vào năm)
CREATE TABLE mau_danh_gia (
    id_mau     INT           IDENTITY(1,1) PRIMARY KEY,
    ten_mau    NVARCHAR(200) NOT NULL,
    id_nam     INT           NOT NULL,
    mo_ta      NVARCHAR(500) NULL,
    trang_thai BIT           DEFAULT 1,
    CONSTRAINT fk_mau_nam FOREIGN KEY (id_nam) REFERENCES nam_danh_gia(id_nam)
);
GO

-- 2.7. Chi tiết mẫu (mẫu ↔ tiêu chí, nhiều-nhiều)
CREATE TABLE chi_tiet_mau_danh_gia (
    id_chi_tiet_mau INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    id_mau          INT NOT NULL,
    id_tieu_chi     INT NOT NULL,
    CONSTRAINT fk_ct_mau_mau      FOREIGN KEY (id_mau)      REFERENCES mau_danh_gia(id_mau) ON DELETE CASCADE,
    CONSTRAINT fk_ct_mau_tieu_chi FOREIGN KEY (id_tieu_chi) REFERENCES tieu_chi_danh_gia(id_tieu_chi),
    CONSTRAINT uq_mau_tieu_chi    UNIQUE (id_mau, id_tieu_chi)
);
GO


-- =============================================================================
-- 3. DỮ LIỆU NGUỒN (INPUT DATA)
-- =============================================================================

-- 3.1. Giờ thực hiện của giảng viên theo năm
CREATE TABLE gio_thuc_hien_gv (
    id_gio_thuc_hien    INT          IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien        INT          NOT NULL,
    id_nam              INT          NOT NULL,
    gio_giang_thuc_te   DECIMAL(8,2) NOT NULL DEFAULT 0,  -- Giờ giảng LT thực tế trong năm
    gio_nckh_thuc_te    DECIMAL(8,2) NOT NULL DEFAULT 0,  -- Giờ NCKH quy đổi thực tế
    nguon               TINYINT      NOT NULL DEFAULT 1,   -- 1: Nhập tay, 2: Đồng bộ DueScienceDB
    -- Tham chiếu logic đến DueScienceDB.dbo.ScienceScoringDeclarations.Id
    -- hoặc DueScienceDB.dbo.ScienceScoringManagements.Id
    science_scoring_id  INT          NULL,
    ngay_cap_nhat       DATETIME     DEFAULT GETDATE(),
    CONSTRAINT fk_gth_nv      FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_gth_nam     FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT uq_gth_nv_nam  UNIQUE (id_nhan_vien, id_nam),
    CONSTRAINT chk_nguon_gth  CHECK (nguon IN (1, 2)),
    CONSTRAINT chk_gio_giang  CHECK (gio_giang_thuc_te >= 0),
    CONSTRAINT chk_gio_nckh   CHECK (gio_nckh_thuc_te  >= 0)
);
GO

-- 3.2. Vi phạm giảng dạy
--  Lưu các vi phạm quy định giảng dạy trong năm để tính KPI I.2
CREATE TABLE vi_pham_giang_day (
    id_vi_pham        INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien      INT           NOT NULL,
    id_nam            INT           NOT NULL,
    mo_ta             NVARCHAR(500) NOT NULL,
    la_nghiem_trong   BIT           DEFAULT 0,   -- 1 = vi phạm nghiêm trọng → 0đ
    ngay_vi_pham      DATE          NULL,
    id_nguoi_ghi_nhan INT           NOT NULL,    -- Người lập biên bản / ghi nhận
    ngay_ghi_nhan     DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_vp_nv    FOREIGN KEY (id_nhan_vien)    REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_vp_nam   FOREIGN KEY (id_nam)          REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_vp_nguoi FOREIGN KEY (id_nguoi_ghi_nhan) REFERENCES nhan_vien(id_nhan_vien)
);
GO

-- 3.3. Điểm phản hồi sinh viên
--  Lưu điểm đánh giá phản hồi của sinh viên theo thang Likert 5 để tính KPI I.3
CREATE TABLE phan_hoi_sinh_vien (
    id_phan_hoi          INT          IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien         INT          NOT NULL,
    id_nam               INT          NOT NULL,
    diem_trung_binh      DECIMAL(4,2) NOT NULL,   -- Điểm Likert trung bình (1.00–5.00)
    so_hoc_phan_danh_gia INT          DEFAULT 0,  -- Số học phần được sinh viên đánh giá
    he_thong_nguon       NVARCHAR(200) NULL,      -- Tên hệ thống khảo sát (VD: LMS, QLDT)
    ngay_cap_nhat        DATETIME     DEFAULT GETDATE(),
    CONSTRAINT fk_phsv_nv     FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phsv_nam    FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT uq_phsv_nv_nam UNIQUE (id_nhan_vien, id_nam),
    CONSTRAINT chk_diem_phan_hoi CHECK (diem_trung_binh BETWEEN 1.00 AND 5.00)
);
GO


-- =============================================================================
-- 4. DỮ LIỆU ĐÁNH GIÁ
-- =============================================================================

-- 4.1. Phiếu đánh giá (Header – 1 phiếu duy nhất / GV / năm)
CREATE TABLE phieu_danh_gia (
    id_phieu              INT            IDENTITY(1,1) PRIMARY KEY,
    id_nam                INT            NOT NULL,
    id_nhan_vien          INT            NOT NULL,
    id_don_vi             INT            NOT NULL,   -- Đơn vị tại thời điểm đánh giá
    id_mau                INT            NULL,
    id_nguoi_danh_gia     INT            NULL,       -- Cấp trên chấm duyệt
    trang_thai            TINYINT        DEFAULT 1,  -- 1: Nháp, 2: Đã gửi, 3: Đang duyệt,
                                                     -- 4: Đã duyệt, 5: Từ chối
    tong_diem_co_ban      DECIMAL(6,2)   NULL,       -- Tổng điểm Nhóm A (tối đa 100)
    tong_diem_vuot_troi   DECIMAL(6,2)   NULL,       -- Tổng điểm Nhóm B (điểm cộng)
    tong_diem_tich_luy    DECIMAL(6,2)   NULL,       -- = co_ban + vuot_troi
    xep_loai              NVARCHAR(50)   NULL,       -- Hoàn thành xuất sắc / Tốt / Hoàn thành / Không HT
    nhan_xet              NVARCHAR(2000) NULL,
    ngay_gui              DATETIME       NULL,
    ngay_duyet            DATETIME       NULL,
    ngay_tao              DATETIME       DEFAULT GETDATE(),
    ngay_cap_nhat         DATETIME       NULL,
    CONSTRAINT fk_phieu_nam       FOREIGN KEY (id_nam)          REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_phieu_nv        FOREIGN KEY (id_nhan_vien)    REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_don_vi    FOREIGN KEY (id_don_vi)       REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_phieu_mau       FOREIGN KEY (id_mau)          REFERENCES mau_danh_gia(id_mau),
    CONSTRAINT fk_phieu_nguoi_dg  FOREIGN KEY (id_nguoi_danh_gia) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_trang_thai_phieu     CHECK (trang_thai IN (1, 2, 3, 4, 5)),
    CONSTRAINT chk_tong_diem_co_ban     CHECK (tong_diem_co_ban    >= 0),
    CONSTRAINT chk_tong_diem_vuot_troi  CHECK (tong_diem_vuot_troi >= 0),
    CONSTRAINT chk_tong_diem_tich_luy   CHECK (tong_diem_tich_luy  >= 0),
    -- Mỗi GV chỉ có 1 phiếu đánh giá / năm
    CONSTRAINT uq_phieu_unique           UNIQUE (id_nam, id_nhan_vien)
);
GO

-- 4.2. Chi tiết đánh giá (Detail – 1 dòng = 1 tiêu chí)
CREATE TABLE chi_tiet_danh_gia (
    id_chi_tiet           INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu              INT            NOT NULL,
    id_tieu_chi           INT            NOT NULL,
    diem_tu_danh_gia      DECIMAL(5,2)   NULL,
    diem_cap_tren         DECIMAL(5,2)   NULL,
    diem_chinh_thuc       DECIMAL(5,2)   NULL,
    id_thang_diem_chon    INT            NULL,        -- Mức thang điểm đã chọn (Nhóm A rời rạc)
    mo_ta_hoan_thanh      NVARCHAR(2000) NULL,        -- VD: "Hoàn thành 320/300 giờ giảng"
    nhan_xet              NVARCHAR(1000) NULL,        -- Nhận xét của cấp đánh giá về tiêu chí này
    -- Trường hợp đặc biệt (áp dụng cho KPI I.1 theo quy định)
    la_truong_hop_dac_biet BIT           DEFAULT 0,
    ly_do_dac_biet         NVARCHAR(500) NULL,
    ngay_tao               DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_ct_phieu        FOREIGN KEY (id_phieu)           REFERENCES phieu_danh_gia(id_phieu) ON DELETE CASCADE,
    CONSTRAINT fk_ct_tieu_chi     FOREIGN KEY (id_tieu_chi)        REFERENCES tieu_chi_danh_gia(id_tieu_chi),
    CONSTRAINT fk_ct_thang_diem   FOREIGN KEY (id_thang_diem_chon) REFERENCES thang_diem(id_thang_diem),
    CONSTRAINT chk_diem_tu_dg     CHECK (diem_tu_danh_gia  >= 0),
    CONSTRAINT chk_diem_cap_tren  CHECK (diem_cap_tren     >= 0),
    CONSTRAINT chk_diem_chinh_thuc CHECK (diem_chinh_thuc  >= 0),
    CONSTRAINT uq_chi_tiet_unique  UNIQUE (id_phieu, id_tieu_chi)
);
GO

-- 4.3. Danh mục nhóm nhiệm vụ phục vụ cộng đồng
CREATE TABLE danh_muc_nhom_nhiem_vu (
    id_nhom_nv INT           IDENTITY(1,1) PRIMARY KEY,
    ma_nhom    NVARCHAR(20)  NOT NULL,
    ten_nhom   NVARCHAR(200) NOT NULL,
    thu_tu     INT           DEFAULT 0,
    trang_thai BIT           DEFAULT 1,
    CONSTRAINT uq_ma_nhom_nv UNIQUE (ma_nhom)
);
GO

-- 4.4. Nhiệm vụ phục vụ cộng đồng (KPI Nhóm III – nhiều dòng, cộng dồn, tối đa 20đ)
CREATE TABLE nhiem_vu_cong_dong (
    id_nhiem_vu INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet INT           NOT NULL,   -- FK → chi_tiet_danh_gia (dòng tiêu chí nhóm III)
    ten_nhiem_vu NVARCHAR(500) NOT NULL,
    id_nhom_nv  INT           NOT NULL,   -- FK → danh_muc_nhom_nhiem_vu
    vai_tro     TINYINT       NOT NULL,   -- 1: Phối hợp (4đ), 2: Phối hợp chính (7đ), 3: Chủ trì (10đ)
    diem        DECIMAL(5,2)  NOT NULL,   -- Nhập theo vai_tro: 4 / 7 / 10
    mo_ta       NVARCHAR(500) NULL,
    CONSTRAINT fk_nvcm_chi_tiet FOREIGN KEY (id_chi_tiet) REFERENCES chi_tiet_danh_gia(id_chi_tiet) ON DELETE CASCADE,
    CONSTRAINT fk_nvcm_nhom     FOREIGN KEY (id_nhom_nv)  REFERENCES danh_muc_nhom_nhiem_vu(id_nhom_nv),
    CONSTRAINT chk_vai_tro      CHECK (vai_tro IN (1, 2, 3))
);
GO

-- 4.5. Minh chứng đính kèm (file upload)
CREATE TABLE minh_chung (
    id_minh_chung  INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet    INT           NOT NULL,
    ten_file       NVARCHAR(255) NOT NULL,
    ten_file_goc   NVARCHAR(255) NOT NULL,
    duong_dan      NVARCHAR(500) NOT NULL,
    loai_file      NVARCHAR(50)  NULL,
    kich_thuoc_kb  INT           NULL,
    nguoi_tai_len  INT           NOT NULL,
    ngay_tai_len   DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_mc_chi_tiet FOREIGN KEY (id_chi_tiet)   REFERENCES chi_tiet_danh_gia(id_chi_tiet) ON DELETE CASCADE,
    CONSTRAINT fk_mc_nguoi    FOREIGN KEY (nguoi_tai_len) REFERENCES nhan_vien(id_nhan_vien)
);
GO

-- 4.6. Minh chứng liên kết từ DueScienceDB (bridge table Nhóm B)
--   Bảng này giúp auto-populate điểm Nhóm B từ các bản ghi đã duyệt trong DueScienceDB:
--     B.6–B.7  : ProfileMentorings
--     B.8–B.10 : StudentResearches
--     B.14–B.16: ScientificArticles / ScientificArticlesMngt
--     B.17–B.20: Initiatives / InitiativeManagements
--   Quy trình: App query DueScienceDB → insert vào bảng này → cập nhật diem_chinh_thuc.
CREATE TABLE chung_minh_tu_science_db (
    id_cm_science      INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet        INT           NOT NULL,       -- FK → chi_tiet_danh_gia
    -- Tên bảng trong DueScienceDB (validation ở tầng application)
    bang_nguon         NVARCHAR(100) NOT NULL,
    -- ID bản ghi tương ứng trong DueScienceDB
    science_record_id  INT           NOT NULL,
    mo_ta              NVARCHAR(500) NULL,           -- Tiêu đề bài báo, tên NCS, v.v.
    diem_ap_dung       DECIMAL(5,2)  NULL,           -- Điểm được ghi nhận cho bản ghi này
    ngay_dong_bo       DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_cmsd_ct FOREIGN KEY (id_chi_tiet)
        REFERENCES chi_tiet_danh_gia(id_chi_tiet) ON DELETE CASCADE,
    -- bang_nguon phải là tên bảng hợp lệ trong DueScienceDB
    CONSTRAINT chk_bang_nguon CHECK (bang_nguon IN (
        N'ScientificArticles',    N'ScientificArticlesMngt',
        N'ScientificTopics',      N'ScientificProjects',
        N'Initiatives',           N'InitiativeManagements',
        N'StudentResearches',     N'ProfileMentorings',
        N'PublicationBooks',      N'BookPublications',
        N'PublicationOtherResearches'
    )),
    -- Mỗi bản ghi science chỉ được map 1 lần cho mỗi chi tiết đánh giá
    CONSTRAINT uq_cmsd_ct_loai_id UNIQUE (id_chi_tiet, bang_nguon, science_record_id)
);
GO

-- 4.7. Luồng phê duyệt
CREATE TABLE phe_duyet (
    id_phe_duyet  INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu      INT            NOT NULL,
    id_nguoi_duyet INT           NOT NULL,
    cap_duyet     TINYINT        NOT NULL,    -- 1: Trưởng BM, 2: Trưởng Khoa, 3: PHT, 4: HT
    trang_thai    TINYINT        DEFAULT 1,  -- 1: Chờ, 2: Đã duyệt, 3: Từ chối
    nhan_xet      NVARCHAR(1000) NULL,
    ly_do_tu_choi NVARCHAR(500)  NULL,
    ngay_duyet    DATETIME       NULL,
    ngay_tao      DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_pd_phieu  FOREIGN KEY (id_phieu)       REFERENCES phieu_danh_gia(id_phieu),
    CONSTRAINT fk_pd_nguoi  FOREIGN KEY (id_nguoi_duyet) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_cap_duyet      CHECK (cap_duyet  IN (1, 2, 3, 4)),
    CONSTRAINT chk_trang_thai_pd  CHECK (trang_thai IN (1, 2, 3)),
    CONSTRAINT uq_pd_phieu_cap    UNIQUE (id_phieu, cap_duyet)
);
GO


-- =============================================================================
-- 5. NHẬT KÝ
-- =============================================================================

CREATE TABLE nhat_ky (
    id_nhat_ky   BIGINT        IDENTITY(1,1) PRIMARY KEY,
    id_phieu     INT           NULL,
    id_nhan_vien INT           NOT NULL,
    hanh_dong    NVARCHAR(50)  NOT NULL,     -- CREATE, UPDATE, SUBMIT, APPROVE, REJECT, SYNC
    mo_ta        NVARCHAR(500) NULL,
    ngay_tao     DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_nk_phieu FOREIGN KEY (id_phieu)     REFERENCES phieu_danh_gia(id_phieu),
    CONSTRAINT fk_nk_nv    FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien)
);
GO


-- =============================================================================
-- 6. INDEXES
-- =============================================================================

-- nhan_vien
CREATE INDEX ix_nv_don_vi      ON nhan_vien(id_don_vi, trang_thai);
CREATE INDEX ix_nv_nhom_gv     ON nhan_vien(id_nhom_gv) WHERE id_nhom_gv IS NOT NULL;
CREATE INDEX ix_nv_science_uid ON nhan_vien(science_user_id) WHERE science_user_id IS NOT NULL;

-- don_vi
CREATE INDEX ix_dv_science_did ON don_vi(science_dept_id) WHERE science_dept_id IS NOT NULL;

-- cấu hình KPI
CREATE INDEX ix_tieu_chi_nhom ON tieu_chi_danh_gia(id_nhom, trang_thai);
CREATE INDEX ix_thang_diem_tc ON thang_diem(id_tieu_chi);
CREATE INDEX ix_dm_nhom_nam   ON dinh_muc_giang_vien(id_nhom_gv, id_nam);

-- dữ liệu nguồn
CREATE INDEX ix_gth_nv_nam  ON gio_thuc_hien_gv(id_nhan_vien, id_nam);
CREATE INDEX ix_vp_nv_nam   ON vi_pham_giang_day(id_nhan_vien, id_nam);
CREATE INDEX ix_phsv_nv_nam ON phan_hoi_sinh_vien(id_nhan_vien, id_nam);

-- phiếu và chi tiết đánh giá
CREATE INDEX ix_phieu_nam_nv    ON phieu_danh_gia(id_nam, id_nhan_vien);
CREATE INDEX ix_phieu_trang_thai ON phieu_danh_gia(trang_thai, id_nam);
CREATE INDEX ix_phieu_don_vi    ON phieu_danh_gia(id_don_vi, id_nam);
CREATE INDEX ix_ct_phieu        ON chi_tiet_danh_gia(id_phieu);
CREATE INDEX ix_nvcm_ct         ON nhiem_vu_cong_dong(id_chi_tiet);
CREATE INDEX ix_cmsd_ct         ON chung_minh_tu_science_db(id_chi_tiet);
CREATE INDEX ix_cmsd_src        ON chung_minh_tu_science_db(bang_nguon, science_record_id);
CREATE INDEX ix_mc_ct           ON minh_chung(id_chi_tiet);
CREATE INDEX ix_pd_phieu        ON phe_duyet(id_phieu, cap_duyet);
CREATE INDEX ix_pd_nguoi        ON phe_duyet(id_nguoi_duyet, trang_thai);
CREATE INDEX ix_nk_phieu        ON nhat_ky(id_phieu, ngay_tao DESC);
GO


-- =============================================================================
-- 7. SEED DATA
-- =============================================================================

-- Nhóm tiêu chí gốc
INSERT INTO nhom_tieu_chi (ten_nhom, id_nhom_cha, loai_nhom, diem_toi_da, thu_tu_hien_thi) VALUES
    (N'Nhóm A - Tiêu chí cơ bản',       NULL, 1, 100, 1),
    (N'Nhóm B - Thành tích vượt trội',  NULL, 2, 999, 2);
GO

-- Nhóm con của Nhóm A (id_nhom_cha = 1)
INSERT INTO nhom_tieu_chi (ten_nhom, id_nhom_cha, loai_nhom, diem_toi_da, thu_tu_hien_thi) VALUES
    (N'I. Đào tạo – Giảng dạy – Đảm bảo chất lượng', 1, 1, 40, 1),
    (N'II. Nghiên cứu khoa học',                       1, 1, 40, 2),
    (N'III. Phục vụ cộng đồng và các nhiệm vụ khác',  1, 1, 20, 3);
GO

-- Danh mục nhóm nhiệm vụ phục vụ cộng đồng
INSERT INTO danh_muc_nhom_nhiem_vu (ma_nhom, ten_nhom, thu_tu) VALUES
    (N'TVTS',   N'Công tác tư vấn tuyển sinh',                                              1),
    (N'DTCTDT', N'Công tác đào tạo, phát triển chương trình và hỗ trợ người học',           2),
    (N'DBCL',   N'Công tác đảm bảo chất lượng',                                             3),
    (N'HTQT',   N'Công tác hợp tác quốc tế',                                                4),
    (N'KNDNCĐ', N'Công tác kết nối doanh nghiệp, phục vụ cộng đồng và hoạt động phong trào', 5),
    (N'PTDN',   N'Công tác phát triển đội ngũ',                                              6),
    (N'CLKHOA', N'Các nhiệm vụ khác nhằm phát triển chiến lược của Khoa',                   7);
GO

-- Chức vụ mẫu
INSERT INTO chuc_vu (ma_chuc_vu, ten_chuc_vu, cap_bac) VALUES
    (N'GV',  N'Giảng viên',       1),
    (N'TBM', N'Trưởng bộ môn',   2),
    (N'TK',  N'Trưởng khoa',     3),
    (N'PHT', N'Phó hiệu trưởng', 4),
    (N'HT',  N'Hiệu trưởng',     5);
GO
