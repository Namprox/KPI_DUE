-- =============================================================================
-- SCHEMA KPI — nguồn sự thật cấu trúc DB (DDL).
-- Mô tả / giải thích nghiệp vụ của từng bảng: xem App_Data/schema_ghi_chu.md
-- (số mục trong đó trùng với số mục ở đây).
-- =============================================================================

-- =============================================================================
-- 1. BẢNG THAM CHIẾU
-- =============================================================================

-- 1.1. Đơn vị (Trường → Khoa → Bộ môn)
CREATE TABLE don_vi (
    id_don_vi       INT          IDENTITY(1,1) PRIMARY KEY,
    ma_don_vi       NVARCHAR(20) NOT NULL,
    ten_don_vi      NVARCHAR(200) NOT NULL,
    id_don_vi_cha   INT          NULL,
    cap_don_vi      TINYINT      NOT NULL,    -- 1: Trường, 2: Khoa/Phòng, 3: Bộ môn
    trang_thai      BIT          DEFAULT 1,
    CONSTRAINT uq_ma_don_vi   UNIQUE (ma_don_vi),
    CONSTRAINT fk_don_vi_cha  FOREIGN KEY (id_don_vi_cha) REFERENCES don_vi(id_don_vi),
    CONSTRAINT chk_cap_don_vi CHECK (cap_don_vi IN (1, 2, 3))
);
GO

-- 1.2. Chức vụ kiêm nhiệm
CREATE TABLE chuc_vu (
    id_chuc_vu           INT           IDENTITY(1,1) PRIMARY KEY,
    ma_chuc_vu           NVARCHAR(20)  NOT NULL,
    ten_chuc_vu          NVARCHAR(100) NOT NULL,
    ty_le_dinh_muc_giang DECIMAL(5,4)  NULL,    -- 0.0000 - 1.0000 (giờ giảng dạy)
    ty_le_dinh_muc_nckh  DECIMAL(5,4)  NULL,    -- 0.0000 - 1.0000 (giờ NCKH)
    ghi_chu_dieu_kien    NVARCHAR(500) NULL,    -- VD: 'Khoa ≥40 GV hoặc ≥800 SV'
    trang_thai           BIT           DEFAULT 1,
    CONSTRAINT uq_ma_chuc_vu         UNIQUE (ma_chuc_vu),
    CONSTRAINT chk_chuc_vu_tldm      CHECK (ty_le_dinh_muc_giang IS NULL
                                        OR (ty_le_dinh_muc_giang >= 0 AND ty_le_dinh_muc_giang <= 1)),
    CONSTRAINT chk_chuc_vu_tldm_nckh CHECK (ty_le_dinh_muc_nckh IS NULL
                                        OR (ty_le_dinh_muc_nckh >= 0 AND ty_le_dinh_muc_nckh <= 1))
);
GO

-- 1.3. Chức danh nghề nghiệp
CREATE TABLE chuc_danh_nghe_nghiep (
    id_chuc_danh  INT           IDENTITY(1,1) PRIMARY KEY,
    ma_chuc_danh  NVARCHAR(20)  NOT NULL,
    ten_chuc_danh NVARCHAR(200) NOT NULL,
    mo_ta         NVARCHAR(500) NULL,
    trang_thai    BIT           DEFAULT 1,
    CONSTRAINT uq_ma_chuc_danh UNIQUE (ma_chuc_danh)
);
GO

-- 1.4. Giảng viên / Nhân viên
CREATE TABLE nhan_vien (
    id_nhan_vien           INT           IDENTITY(1,1) PRIMARY KEY,
    ma_nhan_vien           NVARCHAR(20)  NOT NULL,
    ho_ten                 NVARCHAR(100) NOT NULL,
    email                  NVARCHAR(150) NULL,
    mat_khau               NVARCHAR(255) NOT NULL,
    so_lan_dang_nhap_sai   TINYINT       NOT NULL DEFAULT 0,
    khoa_dang_nhap_den     DATETIME2     NULL,
    id_don_vi              INT           NOT NULL,
    id_chuc_vu             INT           NULL,        -- Denormalize: chức vụ áp dụng hiện tại
    id_chuc_danh           INT           NULL,        -- NULL nếu không phải giảng viên
    gioi_tinh              TINYINT       NULL,        -- 1: Nam, 2: Nữ, 3: Khác ???
    ngay_sinh              DATE          NULL,
    -- ID tương ứng trong hệ thống NCKH (đồng bộ qua API)
    science_user_id        INT           NULL,
    trang_thai             BIT           DEFAULT 1,
    ngay_tao               DATETIME      DEFAULT GETDATE(),
    refresh_token_hash     VARCHAR(64),
    refresh_token_het_han  DATETIME2,
    CONSTRAINT uq_ma_nhan_vien   UNIQUE (ma_nhan_vien),
    CONSTRAINT fk_nv_don_vi      FOREIGN KEY (id_don_vi)            REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_nv_chuc_vu     FOREIGN KEY (id_chuc_vu)           REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT fk_nv_chuc_danh   FOREIGN KEY (id_chuc_danh)         REFERENCES chuc_danh_nghe_nghiep(id_chuc_danh),
    CONSTRAINT chk_nv_gioi_tinh     CHECK (gioi_tinh IS NULL OR gioi_tinh IN (1, 2, 3))
);
GO

-- 1.5. Lịch sử chức vụ kiêm nhiệm (1 GV ↔ N chức vụ theo thời gian)
CREATE TABLE nhan_vien_chuc_vu (
    id_nv_chuc_vu INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien  INT           NOT NULL,
    id_chuc_vu    INT           NOT NULL,
    tu_ngay       DATE          NOT NULL,
    den_ngay      DATE          NULL,
    ghi_chu       NVARCHAR(500) NULL,
    ngay_tao      DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_nvcv_nv     FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_nvcv_cv     FOREIGN KEY (id_chuc_vu)   REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT chk_nvcv_ngay  CHECK (den_ngay IS NULL OR den_ngay >= tu_ngay)
);
GO

-- 1.5b. Lịch sử chức danh nghề nghiệp (1 GV ↔ N chức danh theo thời gian)
CREATE TABLE nhan_vien_chuc_danh (
    id_nv_chuc_danh INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien    INT           NOT NULL,
    id_chuc_danh    INT           NOT NULL,
    tu_ngay         DATE          NOT NULL,
    den_ngay        DATE          NULL,
    ghi_chu         NVARCHAR(500) NULL,
    ngay_tao        DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_nvcd_nv    FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_nvcd_cd    FOREIGN KEY (id_chuc_danh) REFERENCES chuc_danh_nghe_nghiep(id_chuc_danh),
    CONSTRAINT chk_nvcd_ngay CHECK (den_ngay IS NULL OR den_ngay >= tu_ngay)
);
GO

-- 1.6. Nhật ký đăng nhập
CREATE TABLE nhat_ky_dang_nhap (
    id                  INT IDENTITY PRIMARY KEY,
    id_nhan_vien        INT NULL,
    email_dang_nhap     NVARCHAR(150) NOT NULL,
    dia_chi_ip          VARCHAR(45) NOT NULL,
    thanh_cong          BIT NOT NULL,
    ly_do_that_bai      NVARCHAR(100) NULL,
    thoi_gian_tao       DATETIMEOFFSET(7) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO


-- =============================================================================
-- 2. CẤU HÌNH KPI
-- =============================================================================

-- 2.1. Năm đánh giá
CREATE TABLE nam_danh_gia (
    id_nam                      INT          PRIMARY KEY,  -- VD: 2026
    ngay_bat_dau                DATE         NOT NULL,
    ngay_ket_thuc               DATE         NOT NULL,
    ngay_mo_tu_danh_gia         DATE         NULL,
    ngay_dong_tu_danh_gia       DATE         NULL,
    ngay_mo_danh_gia_cap_tren   DATE         NULL,
    ngay_dong_danh_gia_cap_tren DATE         NULL,
    trang_thai                  TINYINT      DEFAULT 1,    -- 1: Chuẩn bị, 2: Đang mở, 3: Đã đóng
    ghi_chu                     NVARCHAR(500) NULL,
    CONSTRAINT chk_ngay_nam       CHECK (ngay_bat_dau < ngay_ket_thuc),
    CONSTRAINT chk_trang_thai_nam CHECK (trang_thai IN (1, 2, 3))
);
GO

-- 2.2. Định mức theo chức danh và năm
CREATE TABLE dinh_muc_giang_vien (
    id_dinh_muc          INT           IDENTITY(1,1) PRIMARY KEY,
    id_chuc_danh         INT           NOT NULL,
    id_nam               INT           NOT NULL,
    gio_giang_ly_thuyet  DECIMAL(8,2)  NOT NULL,        -- Giờ giảng LT chuẩn/năm
    gio_nckh             DECIMAL(8,2)  NOT NULL,        -- Giờ NCKH quy đổi/năm
    gio_pvcd             DECIMAL(8,2)  NOT NULL DEFAULT 0,  -- Giờ PVCĐ + NV khác/năm
    mo_ta                NVARCHAR(500) NULL,
    CONSTRAINT fk_dm_chuc_danh           FOREIGN KEY (id_chuc_danh) REFERENCES chuc_danh_nghe_nghiep(id_chuc_danh),
    CONSTRAINT fk_dm_nam                 FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT uq_dinh_muc_chuc_danh_nam UNIQUE (id_chuc_danh, id_nam),
    CONSTRAINT chk_dm_gio_giang          CHECK (gio_giang_ly_thuyet >= 0),
    CONSTRAINT chk_dm_gio_nckh           CHECK (gio_nckh >= 0),
    CONSTRAINT chk_dm_gio_pvcd           CHECK (gio_pvcd >= 0)
);
GO

-- 2.3. Nhóm tiêu chí (cây phân cấp)
CREATE TABLE nhom_tieu_chi (
    id_nhom          INT           IDENTITY(1,1) PRIMARY KEY,
    ten_nhom         NVARCHAR(200) NOT NULL,
    id_nhom_cha      INT           NULL,
    loai_nhom        TINYINT       NOT NULL DEFAULT 1,  -- 1: Cơ bản (A), 2: Vượt trội (B)
    diem_toi_da      DECIMAL(5,2)  DEFAULT 100,
    thu_tu_hien_thi  INT           DEFAULT 0,
    trang_thai       BIT           DEFAULT 1,
    CONSTRAINT fk_nhom_cha   FOREIGN KEY (id_nhom_cha) REFERENCES nhom_tieu_chi(id_nhom),
    CONSTRAINT chk_loai_nhom CHECK (loai_nhom IN (1, 2))
);
GO

-- 2.4. Tiêu chí đánh giá
CREATE TABLE tieu_chi_danh_gia (
    id_tieu_chi            INT            IDENTITY(1,1) PRIMARY KEY,
    ten_tieu_chi           NVARCHAR(500)  NOT NULL,
    id_nhom                INT            NOT NULL,
    mo_ta                  NVARCHAR(1000) NULL,
    diem_toi_da            DECIMAL(5,2)   NOT NULL,
    loai_thang_diem        TINYINT        DEFAULT 1,     -- 1: Rời rạc, 2: Liên tục, 3: Có/Không, 4: Công thức
    -- "Ai chấm tiêu chí này" KHÔNG khai báo ở đây — xem tieu_chi_don_vi_cham (2.8),
    -- nguồn duy nhất. Cột cap_danh_gia cũ đã bị bỏ (xem update_database.sql).
    cong_thuc_tinh_diem    NVARCHAR(500)  NULL,          -- Chỉ dùng khi loai_thang_diem = 4
    loai_doi_tuong         TINYINT        NOT NULL DEFAULT 1,  -- 1: Giảng viên, 2: Viên chức/NLĐ, 3: Đơn vị
    loai_nguon_diem        TINYINT        NOT NULL DEFAULT 1,  -- 1: Chấm thủ công, 2: Tự động tổng hợp từ KPI thành viên
    cong_thuc_tong_hop     NVARCHAR(200)  NULL,          -- Mã công thức tổng hợp (chỉ khi loai_nguon_diem = 2)
    bat_buoc_minh_chung    BIT            DEFAULT 0,
    thu_tu_hien_thi        INT            DEFAULT 0,
    trang_thai             BIT            DEFAULT 1,
    CONSTRAINT fk_tieu_chi_nhom FOREIGN KEY (id_nhom)   REFERENCES nhom_tieu_chi(id_nhom),
    CONSTRAINT chk_diem_toi_da_tc  CHECK (diem_toi_da > 0),
    CONSTRAINT chk_loai_thang_diem CHECK (loai_thang_diem IN (1, 2, 3, 4)),
    CONSTRAINT chk_tieu_chi_loai_doi_tuong  CHECK (loai_doi_tuong  IN (1, 2, 3)),
    CONSTRAINT chk_tieu_chi_loai_nguon_diem CHECK (loai_nguon_diem IN (1, 2))
);
GO

-- 2.5. Thang điểm (mức điểm rời rạc cho từng tiêu chí)
CREATE TABLE thang_diem (
    id_thang_diem   INT           IDENTITY(1,1) PRIMARY KEY,
    id_tieu_chi     INT           NOT NULL,
    gia_tri_diem    DECIMAL(5,2)  NOT NULL,
    dieu_kien_diem  NVARCHAR(500) NULL,        -- VD: 'Hoàn thành 100%', 'Không vi phạm'
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
    loai_doi_tuong TINYINT   NOT NULL DEFAULT 1,  -- 1: Giảng viên, 2: Viên chức/NLĐ, 3: Đơn vị
    CONSTRAINT fk_mau_nam FOREIGN KEY (id_nam) REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT chk_mau_loai_doi_tuong CHECK (loai_doi_tuong IN (1, 2, 3))
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


-- 2.8. Phân quyền đơn vị chấm tiêu chí (NGUỒN DUY NHẤT quyết định ai chấm tiêu chí nào)
CREATE TABLE tieu_chi_don_vi_cham (
    id_phan_quyen INT      IDENTITY(1,1) PRIMARY KEY,
    id_tieu_chi   INT      NOT NULL,
    id_don_vi     INT      NOT NULL,
    ngay_tao      DATETIME DEFAULT GETDATE(),
    CONSTRAINT uq_tcdvc          UNIQUE (id_tieu_chi, id_don_vi),
    CONSTRAINT fk_tcdvc_tieu_chi FOREIGN KEY (id_tieu_chi) REFERENCES tieu_chi_danh_gia(id_tieu_chi),
    CONSTRAINT fk_tcdvc_don_vi   FOREIGN KEY (id_don_vi)   REFERENCES don_vi(id_don_vi)
);
GO

-- 2.9. Gia hạn tự đánh giá cá nhân (1 dòng hiệu lực / (năm, nhân viên); da_xoa = 1 là lịch sử)
--   Hạn tự đánh giá hiệu lực = MAX(nam_danh_gia.ngay_dong_tu_danh_gia, han_moi).
CREATE TABLE gia_han_danh_gia (
    id_gia_han    INT            IDENTITY(1,1) PRIMARY KEY,
    id_nam        INT            NOT NULL,
    id_nhan_vien  INT            NOT NULL,
    han_moi       DATE           NOT NULL,      -- Hạn tự đánh giá mới (thay ngay_dong_tu_danh_gia)
    ly_do         NVARCHAR(500)  NULL,
    id_nguoi_cap  INT            NOT NULL,      -- HT / ADMIN cấp gia hạn
    ngay_cap      DATETIME       NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME       NULL,          -- Lần cấp lại gần nhất (ghi đè hạn cũ)
    da_xoa        BIT            NOT NULL DEFAULT 0,
    ngay_xoa      DATETIME       NULL,
    CONSTRAINT fk_ghdg_nam       FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_ghdg_nv        FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ghdg_nguoi_cap FOREIGN KEY (id_nguoi_cap) REFERENCES nhan_vien(id_nhan_vien)
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
    gio_giang_thuc_te   DECIMAL(8,2) NOT NULL DEFAULT 0,   -- Giờ giảng LT thực tế trong năm
    gio_nckh_thuc_te    DECIMAL(8,2) NOT NULL DEFAULT 0,   -- Giờ NCKH quy đổi thực tế
    nguon               TINYINT      NOT NULL DEFAULT 1,   -- 1: Nhập tay, 2: Đồng bộ qua API
    ngay_cap_nhat       DATETIME     DEFAULT GETDATE(),
    CONSTRAINT fk_gth_nv      FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_gth_nam     FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT uq_gth_nv_nam  UNIQUE (id_nhan_vien, id_nam),
    CONSTRAINT chk_nguon_gth  CHECK (nguon IN (1, 2)),
    CONSTRAINT chk_gio_giang  CHECK (gio_giang_thuc_te >= 0),
    CONSTRAINT chk_gio_nckh   CHECK (gio_nckh_thuc_te  >= 0)
);
GO

-- 3.2.a. Nhóm nội dung công việc trong quy định tính điểm trừ KPI (6 nhóm)
CREATE TABLE nhom_vi_pham (
    id_nhom_vp      INT           IDENTITY(1,1) PRIMARY KEY,
    ten_nhom        NVARCHAR(200) NOT NULL,
    thu_tu_hien_thi INT           NOT NULL DEFAULT 0,
    trang_thai      BIT           NOT NULL DEFAULT 1
);
GO

-- 3.2.b. Danh mục "việc chưa tuân thủ" (15 nội dung, mặc định 1 điểm / 1 nội dung)
CREATE TABLE loai_vi_pham (
    id_loai_vi_pham        INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhom_vp             INT           NOT NULL,
    ma_loai_vi_pham        NVARCHAR(50)  NOT NULL,
    noi_dung               NVARCHAR(500) NOT NULL,
    diem_tru_mac_dinh      DECIMAL(5,2)  NOT NULL DEFAULT 1,
    ho_so_kem_theo         NVARCHAR(200) NULL,   -- Biên bản / email thông báo / hồ sơ theo dõi
    cho_phep_khoa_chu_quan BIT           NOT NULL DEFAULT 0,
    cho_phep_moi_don_vi    BIT           NOT NULL DEFAULT 0,
    ghi_chu                NVARCHAR(500) NULL,
    thu_tu_hien_thi        INT           NOT NULL DEFAULT 0,
    trang_thai             BIT           NOT NULL DEFAULT 1,
    CONSTRAINT uq_loai_vi_pham_ma    UNIQUE (ma_loai_vi_pham),
    CONSTRAINT fk_loai_vi_pham_nhom  FOREIGN KEY (id_nhom_vp) REFERENCES nhom_vi_pham(id_nhom_vp),
    CONSTRAINT chk_loai_vi_pham_diem CHECK (diem_tru_mac_dinh >= 0)
);
GO

-- 3.2.c. Phân quyền đơn vị ghi nhận vi phạm (mirror tieu_chi_don_vi_cham)
CREATE TABLE loai_vi_pham_don_vi_ghi_nhan (
    id_phan_quyen   INT      IDENTITY(1,1) PRIMARY KEY,
    id_loai_vi_pham INT      NOT NULL,
    id_don_vi       INT      NOT NULL,
    ngay_tao        DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_lvpdvgn        UNIQUE (id_loai_vi_pham, id_don_vi),
    CONSTRAINT fk_lvpdvgn_loai   FOREIGN KEY (id_loai_vi_pham) REFERENCES loai_vi_pham(id_loai_vi_pham),
    CONSTRAINT fk_lvpdvgn_don_vi FOREIGN KEY (id_don_vi)       REFERENCES don_vi(id_don_vi)
);
GO

-- 3.2. Vi phạm giảng dạy (điểm trừ KPI; chỉ GV thuộc Khoa)
CREATE TABLE vi_pham_giang_day (
    id_vi_pham         INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien       INT           NOT NULL,
    id_nam             INT           NOT NULL,
    id_loai_vi_pham    INT           NULL,          -- NULL: dòng cũ tạo trước khi có danh mục
    mo_ta              NVARCHAR(500) NOT NULL,
    diem_tru           DECIMAL(5,2)  NULL,          -- Snapshot từ loai_vi_pham.diem_tru_mac_dinh
    bi_ky_luat         BIT           NOT NULL DEFAULT 0,  -- 1 = đã bị kỷ luật (chỉ lưu; DB thật: cột nằm cuối bảng)
    ngay_vi_pham       DATE          NULL,
    id_nguoi_ghi_nhan  INT           NOT NULL,      -- Lấy từ JWT, không nhận từ body
    id_don_vi_ghi_nhan INT           NULL,          -- Snapshot đơn vị của người ghi lúc ghi
    ngay_ghi_nhan      DATETIME      DEFAULT GETDATE(),
    ngay_cap_nhat      DATETIME      NULL,
    -- Minh chứng PDF: tối đa 1 file / vi phạm, DB chỉ giữ metadata
    mc_ten_file_goc    NVARCHAR(255) NULL,          -- Tên file người dùng tải lên
    mc_duong_dan       NVARCHAR(500) NULL,          -- Path tương đối dưới App_Data (luôn .pdf)
    mc_kich_thuoc_kb   INT           NULL,
    mc_nguoi_tai_len   INT           NULL,
    mc_ngay_tai_len    DATETIME      NULL,
    CONSTRAINT fk_vp_nv              FOREIGN KEY (id_nhan_vien)       REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_vp_nam             FOREIGN KEY (id_nam)             REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_vp_nguoi           FOREIGN KEY (id_nguoi_ghi_nhan)  REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_vp_loai_vi_pham    FOREIGN KEY (id_loai_vi_pham)    REFERENCES loai_vi_pham(id_loai_vi_pham),
    CONSTRAINT fk_vp_don_vi_ghi_nhan FOREIGN KEY (id_don_vi_ghi_nhan) REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_vp_mc_nguoi        FOREIGN KEY (mc_nguoi_tai_len)   REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_vp_diem_tru       CHECK (diem_tru IS NULL OR diem_tru >= 0),
    CONSTRAINT chk_vp_mc_kich_thuoc  CHECK (mc_kich_thuoc_kb IS NULL OR mc_kich_thuoc_kb > 0),
    -- Metadata minh chứng: hoặc rỗng hoàn toàn, hoặc đủ tên file + path + người tải
    CONSTRAINT chk_vp_minh_chung     CHECK (
        (mc_duong_dan IS NULL AND mc_ten_file_goc IS NULL AND mc_nguoi_tai_len IS NULL)
     OR (mc_duong_dan IS NOT NULL AND mc_ten_file_goc IS NOT NULL AND mc_nguoi_tai_len IS NOT NULL)
    ),
    -- Chỉ chấp nhận PDF
    CONSTRAINT chk_vp_mc_pdf         CHECK (mc_duong_dan IS NULL OR mc_duong_dan LIKE '%.pdf')
);
GO

-- 3.3. Phản hồi sinh viên (thang Likert 1-5, lưu thô từng lượt) → nguồn cho KPI I.3
CREATE TABLE phan_hoi_sinh_vien (
    id_phan_hoi      INT           IDENTITY(1,1) PRIMARY KEY,
    mssv             NVARCHAR(20)  NULL,               -- co the NULL neu khao sat an danh
    ma_can_bo        NVARCHAR(20)  NOT NULL,           -- ma can bo (giang vien) tu file, khong hard-FK
    ho_ten_gv        NVARCHAR(150) NULL,
    ma_hoc_phan      NVARCHAR(20)  NULL,
    khoa_quan_ly_hp  NVARCHAR(200) NULL,               -- chi luu thong tin, khong doi chieu ma_don_vi
    ky_hoc           SMALLINT      NOT NULL,           -- nam_hoc*10 + {1,2,3} (vd 261/262/263)
    cau_hoi          TINYINT       NOT NULL,           -- so thu tu cau hoi khao sat
    danh_gia         TINYINT       NOT NULL,           -- diem Likert 1 luot tra loi (1-5)
    id_don_vi        INT           NULL,               -- resolve tu ma_don_vi, stamp ca lo import
    id_nguoi_import  INT           NULL,
    ngay_import      DATETIME      DEFAULT GETDATE(),
    CONSTRAINT fk_phsv_don_vi       FOREIGN KEY (id_don_vi)       REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_phsv_nguoi_import FOREIGN KEY (id_nguoi_import) REFERENCES nhan_vien(id_nhan_vien)
);
GO

-- TVP dung cho sp_phan_hoi_sinh_vien_import_raw (streaming tung dong tho tu Excel qua SqlDataRecord).
IF TYPE_ID(N'dbo.PhanHoiSinhVienRawRow') IS NOT NULL
    DROP TYPE dbo.PhanHoiSinhVienRawRow;
GO
CREATE TYPE dbo.PhanHoiSinhVienRawRow AS TABLE (
    mssv             NVARCHAR(20)  NULL,
    ma_can_bo        NVARCHAR(20)  NOT NULL,
    ho_ten_gv        NVARCHAR(150) NULL,
    ma_hoc_phan      NVARCHAR(20)  NULL,
    khoa_quan_ly_hp  NVARCHAR(200) NULL,
    ky_hoc           SMALLINT      NOT NULL,
    cau_hoi          TINYINT       NOT NULL,
    danh_gia         TINYINT       NOT NULL
);
GO

-- 3.3b. Điểm TB phản hồi sinh viên (1 dòng = điểm TB cả năm của 1 GV; chốt lại = ghi đè)
CREATE TABLE diem_tb_phan_hoi_sinh_vien (
    id_diem_tb        INT           IDENTITY(1,1) PRIMARY KEY,
    id_nam            INT           NOT NULL,
    id_nhan_vien      INT           NOT NULL,
    ma_can_bo         NVARCHAR(20)  NOT NULL,          -- snapshot ma tai thoi diem chot
    id_don_vi         INT           NULL,               -- snapshot don vi cua GV tai thoi diem chot
    diem_trung_binh   DECIMAL(5,2)  NOT NULL,
    so_luot_danh_gia  INT           NOT NULL DEFAULT 0, -- so dong phan_hoi_sinh_vien gop vao
    id_nguoi_chot     INT           NOT NULL,           -- ai chot (lap lai moi dong GV cua nam)
    ngay_chot         DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_dtbpsv_nam        FOREIGN KEY (id_nam)        REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_dtbpsv_nhan_vien  FOREIGN KEY (id_nhan_vien)  REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_dtbpsv_don_vi     FOREIGN KEY (id_don_vi)     REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_dtbpsv_nguoi_chot FOREIGN KEY (id_nguoi_chot) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT uq_dtbpsv_nam_gv     UNIQUE (id_nam, id_nhan_vien),   -- 1 GV / 1 nam
    CONSTRAINT chk_dtbpsv_diem      CHECK (diem_trung_binh BETWEEN 1 AND 5)
);
GO

-- 3.4. Ngoại lệ định mức (Điều 7 QĐ ĐHKT)
CREATE TABLE ngoai_le_dinh_muc (
    id_ngoai_le         INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhan_vien        INT           NOT NULL,
    id_nam              INT           NOT NULL,
    loai_ngoai_le       TINYINT       NOT NULL,
    he_so_giam_giang    DECIMAL(4,3)  NULL,        -- 0.000 - 1.000 (tỷ lệ giảm)
    so_gio_giam_giang   DECIMAL(8,2)  NULL,        -- Số giờ chuẩn giảm tuyệt đối
    he_so_nckh          DECIMAL(4,3)  NULL,        -- Multiplier áp với giờ NCKH (default 1.0)
    he_so_giam_nckh     DECIMAL(4,3)  NULL,        -- 0.000 - 1.000 (tỷ lệ giảm)
    so_gio_them_nckh    DECIMAL(8,2)  NULL,        -- Cộng thêm vào giờ NCKH thực tế
    he_so_giam_pvcd     DECIMAL(4,3)  NULL,
    mien_nckh           BIT           DEFAULT 0,   -- 1 = bỏ qua điều kiện đủ NCKH (tập sự)
    tu_ngay             DATE          NULL,
    den_ngay            DATE          NULL,
    ly_do               NVARCHAR(500) NULL,
    minh_chung_url      NVARCHAR(500) NULL,        -- Link/QĐ hỗ trợ
    id_nguoi_tao        INT           NOT NULL,
    ngay_tao            DATETIME      DEFAULT GETDATE(),
    trang_thai          BIT           DEFAULT 1,   -- 0: Đã huỷ
    CONSTRAINT fk_nldm_nv    FOREIGN KEY (id_nhan_vien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_nldm_nam   FOREIGN KEY (id_nam)       REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_nldm_nguoi FOREIGN KEY (id_nguoi_tao) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_nldm_loai     CHECK (loai_ngoai_le BETWEEN 1 AND 8),
    CONSTRAINT chk_nldm_hsgg     CHECK (he_so_giam_giang IS NULL OR (he_so_giam_giang >= 0 AND he_so_giam_giang <= 1)),
    CONSTRAINT chk_nldm_hsgn     CHECK (he_so_giam_nckh  IS NULL OR (he_so_giam_nckh  >= 0 AND he_so_giam_nckh  <= 1)),
    CONSTRAINT chk_nldm_hsgp     CHECK (he_so_giam_pvcd  IS NULL OR (he_so_giam_pvcd  >= 0 AND he_so_giam_pvcd  <= 1)),
    CONSTRAINT chk_nldm_hsn      CHECK (he_so_nckh       IS NULL OR he_so_nckh >= 0),
    CONSTRAINT chk_nldm_sggg     CHECK (so_gio_giam_giang IS NULL OR so_gio_giam_giang >= 0),
    CONSTRAINT chk_nldm_sgtn     CHECK (so_gio_them_nckh  IS NULL OR so_gio_them_nckh  >= 0),
    CONSTRAINT chk_nldm_ngay     CHECK (tu_ngay IS NULL OR den_ngay IS NULL OR den_ngay >= tu_ngay)
);
GO


-- 3.5. Giờ giảng import (bảng phụ, nhập từ file Excel theo kỳ học)
CREATE TABLE gio_giang_import (
    id_gio_giang_import INT           IDENTITY(1,1) PRIMARY KEY,
    ho_ten              NVARCHAR(150) NOT NULL,
    chuc_danh           NVARCHAR(100) NULL,
    tong_gio_giang_day  DECIMAL(10,2) NOT NULL DEFAULT 0,
    tong_gio_cvk        DECIMAL(10,2) NOT NULL DEFAULT 0,
    tong_gio_qui_doi    DECIMAL(10,2) NOT NULL DEFAULT 0,
    dinh_muc_gio_chuan  DECIMAL(10,2) NOT NULL DEFAULT 0,
    tong_gio_thuc_linh  DECIMAL(10,2) NOT NULL DEFAULT 0,
    ky_hoc              SMALLINT      NOT NULL,
    ngay_import         DATETIME      DEFAULT GETDATE(),
    id_nguoi_import     INT           NULL,
    ten_khoa            NVARCHAR(200) NULL,
    CONSTRAINT fk_gio_giang_import_nguoi   FOREIGN KEY (id_nguoi_import) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_gio_giang_import_ky_hoc CHECK (ky_hoc >= 100 AND (ky_hoc % 10) IN (1, 2, 3))
);
GO

-- 3.6. Dữ liệu NCKH đồng bộ từ API nghiên cứu khoa học (map qua EMAIL, refresh theo năm)

-- 3.6.1. Hồ sơ người dùng NCKH (PK = UserId từ API)
CREATE TABLE nckh_ho_so (
    ma_nguoi_dung_nckh  INT           NOT NULL PRIMARY KEY,   -- = UserId từ API NCKH
    ho_ten              NVARCHAR(255) NULL,
    email               NVARCHAR(255) NULL,
    ten_don_vi          NVARCHAR(255) NULL,
    thoi_gian_nhap      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- 3.6.2. Bài báo → nguồn cho TC 18/19/20 (WoS/Scopus, Q1/Q2)
CREATE TABLE nckh_bai_bao (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_bai_bao_nguon    INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    ten_tap_chi         NVARCHAR(500)   NULL,
    issn_isbn           NVARCHAR(100)   NULL,
    loai_tap_chi        NVARCHAR(100)   NULL,
    danh_muc_tap_chi    NVARCHAR(100)   NULL,   -- SSCI / SCIE / Scopus ...
    diem_tap_chi        DECIMAL(18,4)   NULL,
    xep_hang_q          NVARCHAR(10)    NULL,   -- Q1 / Q2 / Q3 / Q4 → phân biệt TC Q1/Q2
    so_phat_hanh        NVARCHAR(50)    NULL,
    nha_xuat_ban        NVARCHAR(500)   NULL,
    ngay_xuat_ban       DATE            NULL,
    tong_so_tac_gia     INT             NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    CONSTRAINT pk_bai_bao_nckh PRIMARY KEY (ma_nguoi_dung_nckh, ma_bai_bao_nguon),
    CONSTRAINT fk_bai_bao_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh)
);
GO

-- 3.6.3. Đề tài → nguồn cho TC 40/41/42 (cấp Nhà nước / Bộ, Tỉnh / Cơ sở)
CREATE TABLE nckh_de_tai (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_de_tai_nguon     INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    ma_de_tai           NVARCHAR(100)   NULL,
    cap_de_tai          NVARCHAR(200)   NULL,   -- Nhà nước / Bộ, Tỉnh / Cơ sở ...
    ngay_bat_dau        DATE            NULL,
    ngay_ket_thuc       DATE            NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    la_chu_nhiem        BIT             NOT NULL DEFAULT 0,  -- GV là Chủ nhiệm đề tài này (bóc từ MembersJSON)
    CONSTRAINT pk_de_tai_nckh PRIMARY KEY (ma_nguoi_dung_nckh, ma_de_tai_nguon),
    CONSTRAINT fk_de_tai_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh)
);
GO

-- 3.6.4. Sách → nguồn cho TC 32-37 (phụ thuộc ĐỒNG THỜI loại sách + vai trò)
CREATE TABLE nckh_sach (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_sach_nguon       INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    nha_xuat_ban        NVARCHAR(500)   NULL,
    ngay_xuat_ban       DATE            NULL,
    noi_xuat_ban        NVARCHAR(255)   NULL,
    isbn                NVARCHAR(100)   NULL,
    loai_sach           NVARCHAR(100)   NULL,   -- Sách chuyên khảo / giáo trình / tham khảo
    tong_so_tac_gia     INT             NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    la_chu_bien         BIT             NOT NULL DEFAULT 0,  -- GV là Chủ biên sách này (bóc từ MembersJSON)
    CONSTRAINT pk_sach_nckh PRIMARY KEY (ma_nguoi_dung_nckh, ma_sach_nguon),
    CONSTRAINT fk_sach_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh)
);
GO

-- 3.6.5. Kê khai khác → nguồn cho các "Nội dung NCKH" (mảng OtherDeclarations)
CREATE TABLE nckh_ke_khai_khac (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_ke_khai_nguon    INT             NOT NULL,   -- = Id từ API
    ten_noi_dung        NVARCHAR(1000)  NULL,       -- ContentName
    ngay_ap_dung        DATE            NULL,       -- ApplyDate
    so_luong            INT             NULL,       -- Quantity
    so_thanh_vien       INT             NULL,       -- MemberCount
    trang_thai          NVARCHAR(100)   NULL,       -- Status (vd "Đã duyệt")
    CONSTRAINT pk_ke_khai_khac_nckh PRIMARY KEY (ma_nguoi_dung_nckh, ma_ke_khai_nguon),
    CONSTRAINT fk_ke_khai_khac_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh)
);
GO

-- 3.6.6. Tổng hợp NCKH theo năm — 11 cờ boolean tự tính từ các bảng chi tiết
CREATE TABLE nckh_tong_hop (
    ma_nguoi_dung_nckh            INT       NOT NULL,
    id_nam                        INT       NOT NULL,   -- năm đánh giá (vd 2026)
    co_bai_wos_scopus_q1_q2       BIT       NOT NULL DEFAULT 0,  -- 1. có ≥1 bài WoS/Scopus thuộc Q1/Q2
    co_bai_wos_scopus             BIT       NOT NULL DEFAULT 0,  -- 2. có ≥1 bài WoS/Scopus
    chu_bien_sach_chuyen_khao     BIT       NOT NULL DEFAULT 0,  -- 3
    thanh_vien_sach_chuyen_khao   BIT       NOT NULL DEFAULT 0,  -- 4
    chu_bien_sach_giao_trinh      BIT       NOT NULL DEFAULT 0,  -- 5
    thanh_vien_sach_giao_trinh    BIT       NOT NULL DEFAULT 0,  -- 6
    chu_bien_sach_tham_khao       BIT       NOT NULL DEFAULT 0,  -- 7
    thanh_vien_sach_tham_khao     BIT       NOT NULL DEFAULT 0,  -- 8
    chu_nhiem_de_tai_nha_nuoc     BIT       NOT NULL DEFAULT 0,  -- 9  chủ nhiệm cấp Nhà nước & tương đương
    chu_nhiem_de_tai_bo_tinh      BIT       NOT NULL DEFAULT 0,  -- 10 chủ nhiệm cấp Bộ, Tỉnh & tương đương
    de_tai_cap_co_so              BIT       NOT NULL DEFAULT 0,  -- 11 đề tài cấp cơ sở (Tỉnh/Trường), mọi vai trò
    id_nguoi_dong_bo              INT       NULL,                -- nhân viên kích hoạt đồng bộ
    thoi_gian_dong_bo             DATETIME  NOT NULL DEFAULT GETDATE(),
    CONSTRAINT pk_tong_hop_nckh PRIMARY KEY (ma_nguoi_dung_nckh, id_nam),
    CONSTRAINT fk_tong_hop_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh),
    CONSTRAINT fk_tong_hop_nckh_nam   FOREIGN KEY (id_nam)           REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_tong_hop_nckh_nguoi FOREIGN KEY (id_nguoi_dong_bo) REFERENCES nhan_vien(id_nhan_vien)
);
GO

-- 3.6.7. Phân loại NCKH (⚠️ số liệu TOÀN THỜI GIAN dù có id_nam — xem schema_ghi_chu.md)
CREATE TABLE nckh_phan_loai (
    id_phan_loai        INT           IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung_nckh  INT           NOT NULL,
    id_nam              INT           NOT NULL,
    loai                TINYINT       NOT NULL,   -- 1: Sách, 2: Đề tài/Dự án
    phan_loai_text      NVARCHAR(300) NOT NULL,   -- key của dictionary từ API
    so_luong            INT           NOT NULL DEFAULT 0,
    CONSTRAINT uq_phan_loai_nckh UNIQUE (ma_nguoi_dung_nckh, id_nam, loai, phan_loai_text),
    CONSTRAINT fk_phan_loai_nckh_ho_so FOREIGN KEY (ma_nguoi_dung_nckh)
        REFERENCES nckh_ho_so(ma_nguoi_dung_nckh),
    CONSTRAINT fk_phan_loai_nckh_nam   FOREIGN KEY (id_nam) REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT chk_phan_loai_nckh_loai CHECK (loai IN (1, 2))
);
GO

-- TVP dùng cho sp_nckh_dong_bo (streaming từng dòng qua SqlDataRecord, không giữ bản sao trong RAM).
-- 2 type snapshot KHÔNG chứa id_nam — truyền scalar @id_nam để tránh lặp trên mỗi dòng.
IF TYPE_ID(N'dbo.HoSoNckhRow') IS NOT NULL
    DROP TYPE dbo.HoSoNckhRow;
GO
CREATE TYPE dbo.HoSoNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT           NOT NULL PRIMARY KEY,
    ho_ten              NVARCHAR(255) NULL,
    email               NVARCHAR(255) NULL,
    ten_don_vi          NVARCHAR(255) NULL
);
GO

IF TYPE_ID(N'dbo.BaiBaoNckhRow') IS NOT NULL
    DROP TYPE dbo.BaiBaoNckhRow;
GO
CREATE TYPE dbo.BaiBaoNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_bai_bao_nguon    INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    ten_tap_chi         NVARCHAR(500)   NULL,
    issn_isbn           NVARCHAR(100)   NULL,
    loai_tap_chi        NVARCHAR(100)   NULL,
    danh_muc_tap_chi    NVARCHAR(100)   NULL,
    diem_tap_chi        DECIMAL(18,4)   NULL,
    xep_hang_q          NVARCHAR(10)    NULL,
    so_phat_hanh        NVARCHAR(50)    NULL,
    nha_xuat_ban        NVARCHAR(500)   NULL,
    ngay_xuat_ban       DATE            NULL,
    tong_so_tac_gia     INT             NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    PRIMARY KEY (ma_nguoi_dung_nckh, ma_bai_bao_nguon)
);
GO

IF TYPE_ID(N'dbo.DeTaiNckhRow') IS NOT NULL
    DROP TYPE dbo.DeTaiNckhRow;
GO
CREATE TYPE dbo.DeTaiNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_de_tai_nguon     INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    ma_de_tai           NVARCHAR(100)   NULL,
    cap_de_tai          NVARCHAR(200)   NULL,
    ngay_bat_dau        DATE            NULL,
    ngay_ket_thuc       DATE            NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    la_chu_nhiem        BIT             NOT NULL,
    PRIMARY KEY (ma_nguoi_dung_nckh, ma_de_tai_nguon)
);
GO

IF TYPE_ID(N'dbo.SachNckhRow') IS NOT NULL
    DROP TYPE dbo.SachNckhRow;
GO
CREATE TYPE dbo.SachNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_sach_nguon       INT             NOT NULL,
    tieu_de             NVARCHAR(1000)  NULL,
    nha_xuat_ban        NVARCHAR(500)   NULL,
    ngay_xuat_ban       DATE            NULL,
    noi_xuat_ban        NVARCHAR(255)   NULL,
    isbn                NVARCHAR(100)   NULL,
    loai_sach           NVARCHAR(100)   NULL,
    tong_so_tac_gia     INT             NULL,
    trang_thai          NVARCHAR(100)   NULL,
    members_json        NVARCHAR(MAX)   NULL,
    la_chu_bien         BIT             NOT NULL,
    PRIMARY KEY (ma_nguoi_dung_nckh, ma_sach_nguon)
);
GO

IF TYPE_ID(N'dbo.KeKhaiKhacNckhRow') IS NOT NULL
    DROP TYPE dbo.KeKhaiKhacNckhRow;
GO
CREATE TYPE dbo.KeKhaiKhacNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT             NOT NULL,
    ma_ke_khai_nguon    INT             NOT NULL,
    ten_noi_dung        NVARCHAR(1000)  NULL,
    ngay_ap_dung        DATE            NULL,
    so_luong            INT             NULL,
    so_thanh_vien       INT             NULL,
    trang_thai          NVARCHAR(100)   NULL,
    PRIMARY KEY (ma_nguoi_dung_nckh, ma_ke_khai_nguon)
);
GO

-- (TongHopNckhRow đã bỏ: nckh_tong_hop nay do sp_nckh_dong_bo TỰ TÍNH theo năm, không nhận TVP.)

IF TYPE_ID(N'dbo.PhanLoaiNckhRow') IS NOT NULL
    DROP TYPE dbo.PhanLoaiNckhRow;
GO
CREATE TYPE dbo.PhanLoaiNckhRow AS TABLE (
    ma_nguoi_dung_nckh  INT           NOT NULL,
    loai                TINYINT       NOT NULL,
    phan_loai_text      NVARCHAR(300) NOT NULL,
    so_luong            INT           NOT NULL
);
GO

-- =============================================================================
-- 4. DỮ LIỆU ĐÁNH GIÁ
--    Quy trình 4 giai đoạn. HAI trục trạng thái song song:
--      phieu_danh_gia.trang_thai      : 1 NHAP → 2 THAM_DINH → 3 CHO_TK_DUYET
--                                       → 4 TK_DA_DUYET → 5 HOAN_TAT
--      chi_tiet_danh_gia.trang_thai_dong : 1 KE_KHAI → 2 CHO_THAM_DINH → 3 DA_CHOT
--    Phiếu ở trạng thái 2 BAO TRÙM cả lúc GV đang sửa dòng bị trả về — chỉ DÒNG
--    tụt về KE_KHAI, các dòng khác giữ nguyên tiến độ.
--    State machine chi tiết (trigger 2↔3 tự động, trả về từng dòng, hủy nộp,
--    mở lại, hạn tự đánh giá, hạn ngạch 20%): xem schema_ghi_chu.md mục 4 và 8.
-- =============================================================================

-- 4.0. Lookup: nhóm vai trò PVCĐ theo đơn vị (NULL = default toàn trường / mọi năm)
CREATE TABLE danh_muc_vai_tro_pvcd (
    id_vai_tro    INT           IDENTITY(1,1) PRIMARY KEY,
    id_don_vi     INT           NULL,       -- NULL = default toàn trường
    id_nam        INT           NULL,       -- NULL = mọi năm
    ma_vai_tro    NVARCHAR(30)  NOT NULL,
    ten_vai_tro   NVARCHAR(200) NOT NULL,   -- VD: 'Chủ trì', 'Phối hợp chính'
    diem_quy_doi  DECIMAL(5,2)  NOT NULL,
    thu_tu        INT           DEFAULT 0,
    trang_thai    BIT           DEFAULT 1,
    CONSTRAINT fk_vtpvcd_don_vi FOREIGN KEY (id_don_vi) REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_vtpvcd_nam    FOREIGN KEY (id_nam)    REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT chk_vtpvcd_diem  CHECK (diem_quy_doi >= 0),
    CONSTRAINT uq_vtpvcd        UNIQUE (id_don_vi, id_nam, ma_vai_tro)
);
GO

-- Seed 3 vai trò mặc định toàn trường
INSERT INTO danh_muc_vai_tro_pvcd (ma_vai_tro, ten_vai_tro, diem_quy_doi, thu_tu) VALUES
    (N'PH',  N'Phối hợp',        4,  1),
    (N'PHC', N'Phối hợp chính',  7,  2),
    (N'CT',  N'Chủ trì',        10,  3);
GO

-- 4.1. Phiếu đánh giá (Header – 1 phiếu duy nhất / GV / năm; luật xếp loại: xem schema_ghi_chu.md 4.1)
CREATE TABLE phieu_danh_gia (
    id_phieu              INT            IDENTITY(1,1) PRIMARY KEY,
    id_nam                INT            NOT NULL,
    id_nhan_vien          INT            NOT NULL,
    id_don_vi             INT            NOT NULL,   -- Snapshot đơn vị tại thời điểm đánh giá
    id_chuc_vu            INT            NULL,       -- Snapshot chức vụ áp dụng (mức thấp nhất)
    id_chuc_danh          INT            NULL,       -- Snapshot chức danh tại thời điểm đánh giá
    id_mau                INT            NULL,
    loai_doi_tuong        TINYINT        NOT NULL DEFAULT 1,   -- 1: Giảng viên, 2: Viên chức/NLĐ

    -- Versioning: tăng +1 mỗi khi phiếu bị trả lại & GV submit lại,
    -- hoặc khi Trường mở lại phiếu HOAN_TAT.
    lan_danh_gia          TINYINT        NOT NULL DEFAULT 1,

    -- Row version để kiểm soát xung đột (race condition)
    row_version           ROWVERSION     NOT NULL,

    trang_thai            TINYINT        DEFAULT 1,

    -- Khoa ─────────────────────────────────────
    id_nguoi_dg_khoa      INT            NULL,
    ngay_khoa_duyet       DATETIME       NULL,
    nhan_xet_khoa         NVARCHAR(2000) NULL,

    -- Trường ───────────────────────────────────
    id_nguoi_dg_truong    INT            NULL,
    ngay_truong_duyet     DATETIME       NULL,
    nhan_xet_truong       NVARCHAR(2000) NULL,

    -- Điểm tổng ────────────────────────────────
    tong_diem_co_ban      DECIMAL(6,2)   NULL,   -- Tổng điểm Nhóm A (tối đa 100)
    tong_diem_vuot_troi   DECIMAL(6,2)   NULL,   -- Tổng điểm Nhóm B (điểm cộng)
    tong_diem_tich_luy    DECIMAL(6,2)   NULL,   -- = co_ban + vuot_troi

    -- Xếp loại & các điều kiện kết luận ────────
    -- xep_loai = KẾT QUẢ CUỐI CÙNG, chỉ ghi ở bước đóng gói tờ trình Khoa.
    -- Trưởng khoa chọn xep_loai_khoa (1/2/3); mức 4 do hạn ngạch 20% nâng lên.
    xep_loai              TINYINT        NULL,   -- 1/2/3/4 (xem chú thích trên)
    ghi_chu_xep_loai      NVARCHAR(1000) NULL,
    id_to_trinh           INT            NULL,   -- Gói KPI Khoa, gán lúc đóng gói
    xep_loai_khoa         TINYINT        NULL,   -- Trưởng khoa chọn tay, chỉ 1/2/3
    xep_loai_de_xuat      TINYINT        NULL,   -- Hệ thống gợi ý (XepLoaiCalculator), chỉ để đối chiếu
    id_nguoi_xep_loai     INT            NULL,
    ngay_xep_loai         DATETIME       NULL,
    ly_do_xep_loai        NVARCHAR(1000) NULL,   -- Bắt buộc khi TK chọn khác mức đề xuất
    uu_tien_xuat_sac      BIT            NOT NULL DEFAULT 0,  -- TK chỉ định khi đồng hạng ở ranh giới hạn ngạch
    hang_trong_khoa       INT            NULL,   -- Thứ hạng trong Khoa, snapshot lúc đóng gói
    ly_do_ht_tra_ve       NVARCHAR(1000) NULL,   -- Ghi chú chỉ đạo khi HT trả riêng hồ sơ này về TK
    du_dinh_muc_gio_nckh    BIT          NULL,   -- 1 = đạt, 0 = không đạt định mức giờ NCKH
    khong_vi_pham_phap_luat BIT          NULL,   -- 1 = không vi phạm, 0 = có vi phạm
    muc_nckhcn_qd838        TINYINT      NULL,   -- 0: Chưa/Không đạt, 1: HT Tốt KHCN, 2: HT Xuất sắc KHCN
                                                 -- NULL khi năm học < 2025-2026 (QĐ 838 chưa áp dụng)

    -- Snapshot định mức áp dụng (sau khi áp dụng ngoại lệ) ─
    gio_giang_dinh_muc_ap_dung DECIMAL(8,2)  NULL,   -- Giờ chuẩn giảng dạy yêu cầu
    gio_nckh_dinh_muc_ap_dung  DECIMAL(8,2)  NULL,   -- Giờ NCKH yêu cầu
    gio_pvcd_dinh_muc_ap_dung  DECIMAL(8,2)  NULL,   -- Giờ PVCĐ yêu cầu
    he_so_nckh_ap_dung         DECIMAL(3,2)  NULL DEFAULT 1.00,  -- VD: 1.20 (nữ)
    -- Snapshot số giờ thực tế tại thời điểm chốt (tránh thay đổi sau khi chốt)
    gio_giang_thuc_te_snapshot DECIMAL(8,2)  NULL,
    gio_nckh_thuc_te_snapshot  DECIMAL(8,2)  NULL,
    ly_do_dieu_chinh_dinh_muc  NVARCHAR(500) NULL,   -- Tổng hợp các ngoại lệ đã áp dụng

    -- Chốt cuối ────────────────────────────────
    id_nguoi_chot         INT            NULL,
    ngay_chot_ket_qua     DATETIME       NULL,

    -- Tracking mở lại sau HOAN_TAT
    lan_mo_lai            TINYINT        NOT NULL DEFAULT 0,
    ngay_mo_lai_gan_nhat  DATETIME       NULL,
    id_nguoi_mo_lai       INT            NULL,
    ly_do_mo_lai          NVARCHAR(1000) NULL,

    ngay_gui              DATETIME       NULL,
    ngay_tao              DATETIME       DEFAULT GETDATE(),
    ngay_cap_nhat         DATETIME       NULL,
    da_xoa                BIT            DEFAULT 0,
    ngay_xoa              DATETIME       NULL,

    CONSTRAINT fk_phieu_nam        FOREIGN KEY (id_nam)             REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_phieu_nv         FOREIGN KEY (id_nhan_vien)       REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_don_vi     FOREIGN KEY (id_don_vi)          REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_phieu_mau        FOREIGN KEY (id_mau)             REFERENCES mau_danh_gia(id_mau),
    CONSTRAINT fk_phieu_nguoi_kh   FOREIGN KEY (id_nguoi_dg_khoa)   REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_nguoi_tr   FOREIGN KEY (id_nguoi_dg_truong) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_nguoi_chot FOREIGN KEY (id_nguoi_chot)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_nguoi_mol  FOREIGN KEY (id_nguoi_mo_lai)    REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phieu_chuc_vu    FOREIGN KEY (id_chuc_vu)         REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT fk_phieu_chuc_danh  FOREIGN KEY (id_chuc_danh)       REFERENCES chuc_danh_nghe_nghiep(id_chuc_danh),
    CONSTRAINT fk_phieu_nguoi_xl   FOREIGN KEY (id_nguoi_xep_loai)  REFERENCES nhan_vien(id_nhan_vien),
    -- FK id_to_trinh → to_trinh_kpi_khoa nằm ở mục 8.3 (ALTER TABLE): bảng đó
    -- khai báo sau nên không tham chiếu inline được.

    CONSTRAINT chk_trang_thai_phieu    CHECK (trang_thai IN (1,2,3,4,5)),
    CONSTRAINT chk_phieu_xep_loai_khoa     CHECK (xep_loai_khoa    IS NULL OR xep_loai_khoa    IN (1,2,3)),
    CONSTRAINT chk_phieu_xep_loai_de_xuat  CHECK (xep_loai_de_xuat IS NULL OR xep_loai_de_xuat IN (1,2,3,4)),
    CONSTRAINT chk_phieu_loai_doi_tuong CHECK (loai_doi_tuong IN (1, 2)),
    CONSTRAINT chk_tong_diem_co_ban    CHECK (tong_diem_co_ban    >= 0),
    CONSTRAINT chk_tong_diem_vuot_troi CHECK (tong_diem_vuot_troi >= 0),
    CONSTRAINT chk_tong_diem_tich_luy  CHECK (tong_diem_tich_luy  >= 0),
    CONSTRAINT chk_lan_danh_gia        CHECK (lan_danh_gia >= 1),
    CONSTRAINT chk_xep_loai            CHECK (xep_loai          IS NULL OR xep_loai          IN (1, 2, 3, 4)),
    CONSTRAINT chk_muc_qd838           CHECK (muc_nckhcn_qd838  IS NULL OR muc_nckhcn_qd838  IN (0, 1, 2)),
    CONSTRAINT chk_he_so_nckh_ap_dung  CHECK (he_so_nckh_ap_dung IS NULL OR he_so_nckh_ap_dung >= 0),
    CONSTRAINT chk_gio_giang_dm_ap     CHECK (gio_giang_dinh_muc_ap_dung IS NULL OR gio_giang_dinh_muc_ap_dung >= 0),
    CONSTRAINT chk_gio_nckh_dm_ap      CHECK (gio_nckh_dinh_muc_ap_dung  IS NULL OR gio_nckh_dinh_muc_ap_dung  >= 0),
    CONSTRAINT chk_gio_pvcd_dm_ap      CHECK (gio_pvcd_dinh_muc_ap_dung  IS NULL OR gio_pvcd_dinh_muc_ap_dung  >= 0),
    -- Mỗi GV chỉ có 1 phiếu / năm
    CONSTRAINT uq_phieu_unique         UNIQUE (id_nam, id_nhan_vien)
);
GO

-- 4.2. Chi tiết đánh giá (Detail – 1 dòng = 1 tiêu chí; mỗi cấp có bộ cột điểm riêng)
CREATE TABLE chi_tiet_danh_gia (
    id_chi_tiet           INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu              INT            NOT NULL,
    id_tieu_chi           INT            NOT NULL,

    -- Tự đánh giá (cap = 1)
    diem_tu_danh_gia      DECIMAL(5,2)   NULL,
    nhan_xet_tu_danh_gia  NVARCHAR(1000) NULL,
    ngay_tu_danh_gia      DATETIME       NULL,
    id_thang_diem_chon    INT            NULL,    -- Mức thang điểm GV chọn

    -- Khoa đánh giá (cap = 2)
    diem_khoa             DECIMAL(5,2)   NULL,
    nhan_xet_khoa         NVARCHAR(1000) NULL,
    id_nguoi_dg_khoa      INT            NULL,
    ngay_dg_khoa          DATETIME       NULL,

    -- Trường đánh giá (cap = 3)
    diem_truong           DECIMAL(5,2)   NULL,
    nhan_xet_truong       NVARCHAR(1000) NULL,
    id_nguoi_dg_truong    INT            NULL,
    ngay_dg_truong        DATETIME       NULL,

    -- Điểm chính thức (chốt bởi Trường ở HOAN_TAT)
    diem_chinh_thuc       DECIMAL(5,2)   NULL,

    -- Chấm điểm tự động (điểm KHÓA CỨNG — engine ghi thẳng diem_chinh_thuc)
    loai_nguon_diem       TINYINT        NOT NULL DEFAULT 1,   -- 1: thủ công, 2: tự động tổng hợp
    cong_thuc_snapshot    NVARCHAR(200)  NULL,                 -- mã công thức snapshot lúc tạo phiếu
    diem_tu_dong          DECIMAL(5,2)   NULL,                 -- điểm hệ thống tính (audit / re-run)
    id_nguoi_tu_dong      INT            NULL,                 -- người kích hoạt tổng hợp tự động
    ngay_tu_dong          DATETIME       NULL,

    -- Mô tả & ngoại lệ
    mo_ta_hoan_thanh       NVARCHAR(2000) NULL,    -- VD: "Hoàn thành 320/300 giờ giảng"
    la_truong_hop_dac_biet BIT            DEFAULT 0,
    ly_do_dac_biet         NVARCHAR(500)  NULL,
    ngay_tao               DATETIME       DEFAULT GETDATE(),

    -- Trạng thái THEO TỪNG DÒNG (thẩm định độc lập từng tiêu chí) ─────────────
    trang_thai_dong        TINYINT        NOT NULL DEFAULT 1,
        -- 1: KE_KHAI       — chủ phiếu sửa được (kê khai lần đầu HOẶC đang sửa sau khi bị trả về)
        -- 2: CHO_THAM_DINH — đơn vị được giao trong tieu_chi_don_vi_cham chấm được
        -- 3: DA_CHOT       — đã chốt điểm, diem_chinh_thuc đã ghi, khóa cứng
    nguon_tra_ve           TINYINT        NULL,    -- Yêu cầu trả về ĐANG MỞ; NULL = không có
        -- 2: chuyên viên thẩm định trả về cho GV   3: Trưởng khoa trả về cho đơn vị thẩm định
    ly_do_tra_ve           NVARCHAR(1000) NULL,
    id_nguoi_tra_ve        INT            NULL,
    ngay_tra_ve            DATETIME       NULL,
    so_lan_tra_ve          TINYINT        NOT NULL DEFAULT 0,   -- Cộng dồn, KHÔNG reset khi nộp lại
    id_don_vi_tham_dinh    INT            NULL,    -- Snapshot đơn vị đã thẩm định dòng này

    CONSTRAINT fk_ct_phieu      FOREIGN KEY (id_phieu)           REFERENCES phieu_danh_gia(id_phieu) ON DELETE CASCADE,
    CONSTRAINT fk_ct_tieu_chi   FOREIGN KEY (id_tieu_chi)        REFERENCES tieu_chi_danh_gia(id_tieu_chi),
    CONSTRAINT fk_ct_thang_diem FOREIGN KEY (id_thang_diem_chon) REFERENCES thang_diem(id_thang_diem),
    CONSTRAINT fk_ct_nguoi_kh   FOREIGN KEY (id_nguoi_dg_khoa)   REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ct_nguoi_tr   FOREIGN KEY (id_nguoi_dg_truong) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ct_nguoi_td   FOREIGN KEY (id_nguoi_tu_dong)   REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ctdg_nguoi_tra_ve     FOREIGN KEY (id_nguoi_tra_ve)     REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ctdg_don_vi_tham_dinh FOREIGN KEY (id_don_vi_tham_dinh) REFERENCES don_vi(id_don_vi),

    CONSTRAINT chk_ct_diem_tdg     CHECK (diem_tu_danh_gia >= 0),
    CONSTRAINT chk_ct_diem_khoa    CHECK (diem_khoa        >= 0),
    CONSTRAINT chk_ct_diem_truong  CHECK (diem_truong      >= 0),
    CONSTRAINT chk_ct_diem_ct      CHECK (diem_chinh_thuc  >= 0),
    CONSTRAINT chk_ct_diem_td      CHECK (diem_tu_dong     >= 0),
    CONSTRAINT chk_ct_nguon_diem   CHECK (loai_nguon_diem IN (1,2)),
    CONSTRAINT chk_ctdg_trang_thai_dong CHECK (trang_thai_dong IN (1,2,3)),
    CONSTRAINT chk_ctdg_nguon_tra_ve    CHECK (nguon_tra_ve IS NULL OR nguon_tra_ve IN (2,3)),
    CONSTRAINT uq_chi_tiet_unique  UNIQUE (id_phieu, id_tieu_chi)
);
GO

-- 4.3. Danh mục nhóm nhiệm vụ phục vụ cộng đồng
CREATE TABLE danh_muc_nhom_nhiem_vu (
    id_nhom_nv INT           IDENTITY(1,1) PRIMARY KEY,
    ten_nhom   NVARCHAR(200) NOT NULL,
    thu_tu     INT           DEFAULT 0,
    trang_thai BIT           DEFAULT 1
);
GO

-- 4.4. Nhiệm vụ phục vụ cộng đồng (KPI Nhóm III – cộng dồn, trần 20đ enforce ở API)
CREATE TABLE nhiem_vu_cong_dong (
    id_nhiem_vu   INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet   INT           NOT NULL,   -- FK → chi_tiet_danh_gia
    ten_nhiem_vu  NVARCHAR(500) NOT NULL,
    id_nhom_nv    INT           NOT NULL,
    id_vai_tro    INT           NOT NULL,   -- FK → danh_muc_vai_tro_pvcd
    diem_snapshot DECIMAL(5,2)  NOT NULL,   -- Snapshot từ danh_muc_vai_tro_pvcd.diem_quy_doi lúc nhập
    mo_ta         NVARCHAR(500) NULL,
    ngay_tao      DATETIME      DEFAULT GETDATE(),
    da_xoa        BIT           NOT NULL DEFAULT 0,
    ngay_xoa      DATETIME      NULL,
    CONSTRAINT fk_nvcd_chi_tiet FOREIGN KEY (id_chi_tiet) REFERENCES chi_tiet_danh_gia(id_chi_tiet) ON DELETE CASCADE,
    CONSTRAINT fk_nvcd_nhom     FOREIGN KEY (id_nhom_nv)  REFERENCES danh_muc_nhom_nhiem_vu(id_nhom_nv),
    CONSTRAINT fk_nvcd_vai_tro  FOREIGN KEY (id_vai_tro)  REFERENCES danh_muc_vai_tro_pvcd(id_vai_tro),
    CONSTRAINT chk_nvcd_diem    CHECK (diem_snapshot >= 0)
);
GO

-- 4.5. Minh chứng đính kèm (file / link)
CREATE TABLE minh_chung (
    id_minh_chung   INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet     INT           NOT NULL,
    loai_minh_chung TINYINT       NOT NULL DEFAULT 1,  -- 1: File, 2: Link, 3: DOI/URL học thuật
    ten_hien_thi    NVARCHAR(255) NOT NULL,            -- Dùng chung cho cả file & link
    ten_file_goc    NVARCHAR(255) NULL,                -- Chỉ áp dụng khi là File
    duong_dan       NVARCHAR(500) NOT NULL,            -- Path file hoặc URL
    loai_file       NVARCHAR(50)  NULL,                -- Chỉ áp dụng khi là File (extension/MIME)
    kich_thuoc_kb   INT           NULL,                -- Chỉ áp dụng khi là File
    nguoi_tai_len   INT           NOT NULL,
    ngay_tai_len    DATETIME      DEFAULT GETDATE(),
    da_xoa          BIT           DEFAULT 0,
    ngay_xoa        DATETIME      NULL,
    CONSTRAINT fk_mc_chi_tiet    FOREIGN KEY (id_chi_tiet)   REFERENCES chi_tiet_danh_gia(id_chi_tiet) ON DELETE CASCADE,
    CONSTRAINT fk_mc_nguoi       FOREIGN KEY (nguoi_tai_len) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_mc_loai       CHECK (loai_minh_chung IN (1, 2, 3)),
    CONSTRAINT chk_mc_kich_thuoc CHECK (kich_thuoc_kb IS NULL OR kich_thuoc_kb > 0),
    -- File phải có ten_file_goc và loai_file; Link/URL thì không bắt buộc
    CONSTRAINT chk_mc_consistent CHECK (
        (loai_minh_chung = 1 AND ten_file_goc IS NOT NULL AND loai_file IS NOT NULL)
     OR (loai_minh_chung IN (2, 3))
    )
);
GO

-- 4.6. Luồng phê duyệt
CREATE TABLE phe_duyet (
    id_phe_duyet        INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu            INT            NOT NULL,
    lan_danh_gia        TINYINT        NOT NULL,    -- Phê duyệt thuộc vòng đánh giá nào
    cap_duyet           TINYINT        NOT NULL,    -- 1: Tự ĐG, 2: Khoa, 3: Trường
    id_nguoi_duyet      INT            NOT NULL,
    id_chuc_vu_snapshot INT            NULL,        -- Snapshot chức vụ tại thời điểm duyệt
    trang_thai          TINYINT        DEFAULT 1,   -- 1: Chờ, 2: Đã duyệt, 3: Từ chối, 4: Trả lại
    nhan_xet            NVARCHAR(1000) NULL,
    ly_do_tu_choi       NVARCHAR(500)  NULL,
    ngay_duyet          DATETIME       NULL,
    ngay_tao            DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_pd_phieu          FOREIGN KEY (id_phieu)            REFERENCES phieu_danh_gia(id_phieu) ON DELETE CASCADE,
    CONSTRAINT fk_pd_nguoi          FOREIGN KEY (id_nguoi_duyet)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pd_chuc_vu_snap   FOREIGN KEY (id_chuc_vu_snapshot) REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT chk_cap_duyet        CHECK (cap_duyet IN (1, 2, 3)),
    CONSTRAINT chk_trang_thai_pd    CHECK (trang_thai IN (1, 2, 3, 4)),
    -- Mỗi vòng, mỗi cấp duyệt chỉ có 1 bản ghi phê duyệt active
    CONSTRAINT uq_pd_phieu_lan_cap  UNIQUE (id_phieu, lan_danh_gia, cap_duyet)
);
GO

-- 4.7. Lịch sử chấm điểm chi tiết (audit trail; cascade qua fk_lscd_phieu, KHÔNG qua fk_lscd_ct)
CREATE TABLE lich_su_cham_diem (
    id_lich_su         BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet        INT            NOT NULL,
    id_phieu           INT            NOT NULL,        -- Denormalize cho query nhanh
    lan_danh_gia       TINYINT        NOT NULL,        -- Snapshot từ phieu.lan_danh_gia
    cap                TINYINT        NOT NULL,        -- 1: Tự ĐG, 2: Đơn vị thẩm định, 3: Trường/HT, 4: Trưởng khoa
    hanh_dong          TINYINT        NOT NULL,
        -- 1: Chấm   2: Sửa   3: Chốt điểm chính thức
        -- 4: Duyệt giữ nguyên điểm (thẩm định đồng ý với điểm GV tự kê khai)
        -- 5: Trả về dòng
    diem               DECIMAL(5,2)   NULL,
    nhan_xet           NVARCHAR(1000) NULL,
    id_nguoi_thuc_hien INT            NOT NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lscd_ct    FOREIGN KEY (id_chi_tiet)        REFERENCES chi_tiet_danh_gia(id_chi_tiet),
    CONSTRAINT fk_lscd_phieu FOREIGN KEY (id_phieu)           REFERENCES phieu_danh_gia(id_phieu) ON DELETE CASCADE,
    CONSTRAINT fk_lscd_nguoi FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lscd_cap  CHECK (cap IN (1, 2, 3, 4)),
    CONSTRAINT chk_lscd_hd   CHECK (hanh_dong IN (1, 2, 3, 4, 5)),
    CONSTRAINT chk_lscd_diem CHECK (diem IS NULL OR diem >= 0)
);
GO

-- 4.8. Lịch sử trạng thái phiếu (state-machine audit; mỗi row = 1 transition)
CREATE TABLE lich_su_trang_thai_phieu (
    id                 BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_phieu           INT            NOT NULL,
    lan_danh_gia       TINYINT        NOT NULL,
    trang_thai_truoc   TINYINT        NULL,         -- NULL = lần đầu tạo phiếu
    trang_thai_sau     TINYINT        NOT NULL,
    hanh_dong          TINYINT        NOT NULL,
        -- 1: Gửi đi (submit)
        -- 2: Duyệt & chuyển tiếp (lên cấp cao hơn)
        -- 3: Trả lại (về cấp thấp hơn)
        -- 4: Chốt (vào HOAN_TAT)
        -- 5: Mở lại (từ HOAN_TAT về 1/2/3)
        -- 6: Hủy nộp (GV tự rút, 2 → 1, giữ nguyên lan_danh_gia)
        -- 7: Nộp lại sau khi bị trả về DÒNG (giữ nguyên lan_danh_gia — khác hẳn "trả lại phiếu")
        -- 8: Trưởng khoa chốt hồ sơ cá nhân
        -- 9: Hiệu trưởng trả riêng hồ sơ về Trưởng khoa
    cap_thuc_hien      TINYINT        NULL,         -- 1: GV, 2: Đơn vị thẩm định, 3: Trường/HT, 4: Trưởng khoa (NULL khi do hệ thống)
    id_nguoi_thuc_hien INT            NOT NULL,
    ly_do              NVARCHAR(1000) NULL,         -- BẮT BUỘC (ở tầng API) khi hanh_dong IN (3, 5)
    nhan_xet           NVARCHAR(1000) NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lstt_phieu     FOREIGN KEY (id_phieu)           REFERENCES phieu_danh_gia(id_phieu) ON DELETE CASCADE,
    CONSTRAINT fk_lstt_nv        FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lstt_tt_sau   CHECK (trang_thai_sau   IN (1,2,3,4,5)),
    CONSTRAINT chk_lstt_tt_truoc CHECK (trang_thai_truoc IS NULL OR trang_thai_truoc IN (1,2,3,4,5)),
    CONSTRAINT chk_lstt_hd       CHECK (hanh_dong IN (1, 2, 3, 4, 5, 6, 7, 8, 9)),
    CONSTRAINT chk_lstt_cap      CHECK (cap_thuc_hien IS NULL OR cap_thuc_hien IN (1, 2, 3, 4))
);
GO


-- =============================================================================
-- 4.9 → 4.14. ĐÁNH GIÁ ĐƠN VỊ (KHOA / PHÒNG) — mirror luồng người, khoá theo
--    id_phieu_dv / id_chi_tiet_dv. Quy trình & trạng thái: xem schema_ghi_chu.md.
-- =============================================================================

-- 4.9. Phiếu đánh giá đơn vị (Header – 1 phiếu / đơn vị / năm)
CREATE TABLE phieu_danh_gia_don_vi (
    id_phieu_dv          INT            IDENTITY(1,1) PRIMARY KEY,
    id_nam               INT            NOT NULL,
    id_don_vi            INT            NOT NULL,   -- Đơn vị (khoa/phòng) ĐƯỢC đánh giá
    id_mau               INT            NULL,       -- Mẫu đánh giá loai_doi_tuong = 3
    lan_danh_gia         TINYINT        NOT NULL DEFAULT 1,
    row_version          ROWVERSION     NOT NULL,   -- Chống xung đột (race condition)
    trang_thai           TINYINT        DEFAULT 1,

    -- Cấp 1: Thư ký Khoa/Phòng (TKK/TKP) nhập ──────
    id_nguoi_nhap        INT            NULL,
    ngay_nhap            DATETIME       NULL,

    -- Cấp 2: Trưởng Khoa/Phòng (TK/TKL/TP) duyệt ───
    id_nguoi_duyet_dv    INT            NULL,
    ngay_dv_duyet        DATETIME       NULL,
    nhan_xet_dv          NVARCHAR(2000) NULL,

    -- Cấp 3: Hiệu trưởng (HT) duyệt & chốt ─────────
    id_nguoi_dg_truong   INT            NULL,
    ngay_truong_duyet    DATETIME       NULL,
    nhan_xet_truong      NVARCHAR(2000) NULL,
    id_nguoi_chot        INT            NULL,
    ngay_chot            DATETIME       NULL,

    -- Điểm tổng & xếp loại ─────────────────────────
    tong_diem_co_ban     DECIMAL(6,2)   NULL,
    tong_diem_vuot_troi  DECIMAL(6,2)   NULL,
    tong_diem_tich_luy   DECIMAL(6,2)   NULL,
    xep_loai             TINYINT        NULL,
    ghi_chu_xep_loai     NVARCHAR(1000) NULL,

    -- Tracking mở lại sau HOAN_TAT ─────────────────
    lan_mo_lai           TINYINT        NOT NULL DEFAULT 0,
    ngay_mo_lai_gan_nhat DATETIME       NULL,
    id_nguoi_mo_lai      INT            NULL,
    ly_do_mo_lai         NVARCHAR(1000) NULL,

    ngay_gui             DATETIME       NULL,
    ngay_tao             DATETIME       DEFAULT GETDATE(),
    ngay_cap_nhat        DATETIME       NULL,
    da_xoa               BIT            DEFAULT 0,
    ngay_xoa             DATETIME       NULL,

    CONSTRAINT fk_pdv_nam         FOREIGN KEY (id_nam)             REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_pdv_don_vi      FOREIGN KEY (id_don_vi)          REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_pdv_mau         FOREIGN KEY (id_mau)             REFERENCES mau_danh_gia(id_mau),
    CONSTRAINT fk_pdv_nguoi_nhap  FOREIGN KEY (id_nguoi_nhap)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pdv_nguoi_dv    FOREIGN KEY (id_nguoi_duyet_dv)  REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pdv_nguoi_tr    FOREIGN KEY (id_nguoi_dg_truong) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pdv_nguoi_chot  FOREIGN KEY (id_nguoi_chot)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pdv_nguoi_mol   FOREIGN KEY (id_nguoi_mo_lai)    REFERENCES nhan_vien(id_nhan_vien),

    CONSTRAINT chk_pdv_trang_thai    CHECK (trang_thai IN (1,2,3,4,5)),
    CONSTRAINT chk_pdv_tong_co_ban   CHECK (tong_diem_co_ban    >= 0),
    CONSTRAINT chk_pdv_tong_vuot     CHECK (tong_diem_vuot_troi >= 0),
    CONSTRAINT chk_pdv_tong_tich_luy CHECK (tong_diem_tich_luy  >= 0),
    CONSTRAINT chk_pdv_lan_danh_gia  CHECK (lan_danh_gia >= 1),
    CONSTRAINT chk_pdv_xep_loai      CHECK (xep_loai IS NULL OR xep_loai IN (1,2,3,4)),
    -- Mỗi đơn vị chỉ có 1 phiếu / năm
    CONSTRAINT uq_phieu_dv           UNIQUE (id_nam, id_don_vi)
);
GO

-- 4.10. Chi tiết đánh giá đơn vị (Detail – 1 dòng = 1 tiêu chí)
CREATE TABLE chi_tiet_danh_gia_don_vi (
    id_chi_tiet_dv       INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu_dv          INT            NOT NULL,
    id_tieu_chi          INT            NOT NULL,

    -- Nguồn điểm & công thức tổng hợp (snapshot từ tiêu chí lúc tạo chi tiết)
    loai_nguon_diem      TINYINT        NOT NULL DEFAULT 1,
    cong_thuc_snapshot   NVARCHAR(500)  NULL,

    -- Cấp 1: TKK/TKP nhập tay (loai_nguon_diem=1) hoặc hệ thống tổng hợp (=2)
    diem_nhap            DECIMAL(5,2)   NULL,
    diem_tong_hop        DECIMAL(5,2)   NULL,
    nhan_xet_nhap        NVARCHAR(1000) NULL,
    id_nguoi_nhap        INT            NULL,
    ngay_nhap            DATETIME       NULL,

    -- Cấp 2: Trưởng Khoa/Phòng duyệt
    diem_duyet_dv        DECIMAL(5,2)   NULL,
    nhan_xet_duyet_dv    NVARCHAR(1000) NULL,
    id_nguoi_duyet_dv    INT            NULL,
    ngay_duyet_dv        DATETIME       NULL,

    -- Cấp 3: Hiệu trưởng duyệt
    diem_truong          DECIMAL(5,2)   NULL,
    nhan_xet_truong      NVARCHAR(1000) NULL,
    id_nguoi_dg_truong   INT            NULL,
    ngay_dg_truong       DATETIME       NULL,

    -- Điểm chính thức (chốt bởi HT ở HOAN_TAT)
    diem_chinh_thuc      DECIMAL(5,2)   NULL,

    ngay_tao             DATETIME       DEFAULT GETDATE(),

    CONSTRAINT fk_ctdv_phieu      FOREIGN KEY (id_phieu_dv)        REFERENCES phieu_danh_gia_don_vi(id_phieu_dv) ON DELETE CASCADE,
    CONSTRAINT fk_ctdv_tieu_chi   FOREIGN KEY (id_tieu_chi)        REFERENCES tieu_chi_danh_gia(id_tieu_chi),
    CONSTRAINT fk_ctdv_nguoi_nhap FOREIGN KEY (id_nguoi_nhap)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ctdv_nguoi_dv   FOREIGN KEY (id_nguoi_duyet_dv)  REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ctdv_nguoi_tr   FOREIGN KEY (id_nguoi_dg_truong) REFERENCES nhan_vien(id_nhan_vien),

    CONSTRAINT chk_ctdv_nguon     CHECK (loai_nguon_diem IN (1,2)),
    CONSTRAINT chk_ctdv_diem_nhap CHECK (diem_nhap       >= 0),
    CONSTRAINT chk_ctdv_diem_th   CHECK (diem_tong_hop   >= 0),
    CONSTRAINT chk_ctdv_diem_dv   CHECK (diem_duyet_dv   >= 0),
    CONSTRAINT chk_ctdv_diem_tr   CHECK (diem_truong     >= 0),
    CONSTRAINT chk_ctdv_diem_ct   CHECK (diem_chinh_thuc >= 0),
    CONSTRAINT uq_chi_tiet_dv     UNIQUE (id_phieu_dv, id_tieu_chi)
);
GO

-- 4.11. Luồng phê duyệt đơn vị (mirror phe_duyet)
CREATE TABLE phe_duyet_don_vi (
    id_phe_duyet_dv     INT            IDENTITY(1,1) PRIMARY KEY,
    id_phieu_dv         INT            NOT NULL,
    lan_danh_gia        TINYINT        NOT NULL,    -- Phê duyệt thuộc vòng đánh giá nào
    cap_duyet           TINYINT        NOT NULL,    -- 1: Nhập, 2: Trưởng ĐV, 3: Trường (HT)
    id_nguoi_duyet      INT            NOT NULL,
    id_chuc_vu_snapshot INT            NULL,        -- Snapshot chức vụ tại thời điểm duyệt
    trang_thai          TINYINT        DEFAULT 1,   -- 1: Chờ, 2: Đã duyệt, 3: Từ chối, 4: Trả lại
    nhan_xet            NVARCHAR(1000) NULL,
    ly_do_tu_choi       NVARCHAR(500)  NULL,
    ngay_duyet          DATETIME       NULL,
    ngay_tao            DATETIME       DEFAULT GETDATE(),
    CONSTRAINT fk_pddv_phieu         FOREIGN KEY (id_phieu_dv)         REFERENCES phieu_danh_gia_don_vi(id_phieu_dv) ON DELETE CASCADE,
    CONSTRAINT fk_pddv_nguoi         FOREIGN KEY (id_nguoi_duyet)      REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pddv_chuc_vu_snap  FOREIGN KEY (id_chuc_vu_snapshot) REFERENCES chuc_vu(id_chuc_vu),
    CONSTRAINT chk_pddv_cap_duyet    CHECK (cap_duyet IN (1,2,3)),
    CONSTRAINT chk_pddv_trang_thai   CHECK (trang_thai IN (1,2,3,4)),
    -- Mỗi vòng, mỗi cấp duyệt chỉ có 1 bản ghi
    CONSTRAINT uq_pddv_phieu_lan_cap UNIQUE (id_phieu_dv, lan_danh_gia, cap_duyet)
);
GO

-- 4.12. Lịch sử chấm điểm chi tiết đơn vị (mirror lich_su_cham_diem)
CREATE TABLE lich_su_cham_diem_don_vi (
    id_lich_su         BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet_dv     INT            NOT NULL,
    id_phieu_dv        INT            NOT NULL,        -- Denormalize cho query nhanh
    lan_danh_gia       TINYINT        NOT NULL,
    cap                TINYINT        NOT NULL,        -- 1: Nhập, 2: Trưởng ĐV, 3: Trường (HT)
    hanh_dong          TINYINT        NOT NULL,        -- 1: Chấm, 2: Sửa, 3: Chốt điểm chính thức
    diem               DECIMAL(5,2)   NULL,
    nhan_xet           NVARCHAR(1000) NULL,
    id_nguoi_thuc_hien INT            NOT NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lscddv_ct    FOREIGN KEY (id_chi_tiet_dv)     REFERENCES chi_tiet_danh_gia_don_vi(id_chi_tiet_dv),
    CONSTRAINT fk_lscddv_phieu FOREIGN KEY (id_phieu_dv)        REFERENCES phieu_danh_gia_don_vi(id_phieu_dv) ON DELETE CASCADE,
    CONSTRAINT fk_lscddv_nguoi FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lscddv_cap  CHECK (cap IN (1,2,3)),
    CONSTRAINT chk_lscddv_hd   CHECK (hanh_dong IN (1,2,3)),
    CONSTRAINT chk_lscddv_diem CHECK (diem IS NULL OR diem >= 0)
);
GO

-- 4.13. Lịch sử trạng thái phiếu đơn vị (mirror lich_su_trang_thai_phieu)
CREATE TABLE lich_su_trang_thai_phieu_don_vi (
    id                 BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_phieu_dv        INT            NOT NULL,
    lan_danh_gia       TINYINT        NOT NULL,
    trang_thai_truoc   TINYINT        NULL,         -- NULL = lần đầu tạo phiếu
    trang_thai_sau     TINYINT        NOT NULL,
    hanh_dong          TINYINT        NOT NULL,
        -- 1: Gửi đi (submit)
        -- 2: Duyệt & chuyển tiếp (lên cấp cao hơn)
        -- 3: Trả lại (về cấp thấp hơn)
        -- 4: Chốt (vào HOAN_TAT)
        -- 5: Mở lại (từ HOAN_TAT về 1/2/3)
    cap_thuc_hien      TINYINT        NULL,         -- 1: Nhập, 2: Trưởng ĐV, 3: Trường (HT); NULL = hệ thống
    id_nguoi_thuc_hien INT            NOT NULL,
    ly_do              NVARCHAR(1000) NULL,         -- BẮT BUỘC (tầng API) khi hanh_dong IN (3, 5)
    nhan_xet           NVARCHAR(1000) NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lsttdv_phieu     FOREIGN KEY (id_phieu_dv)        REFERENCES phieu_danh_gia_don_vi(id_phieu_dv) ON DELETE CASCADE,
    CONSTRAINT fk_lsttdv_nv        FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lsttdv_tt_sau   CHECK (trang_thai_sau   IN (1,2,3,4,5)),
    CONSTRAINT chk_lsttdv_tt_truoc CHECK (trang_thai_truoc IS NULL OR trang_thai_truoc IN (1,2,3,4,5)),
    CONSTRAINT chk_lsttdv_hd       CHECK (hanh_dong IN (1,2,3,4,5)),
    CONSTRAINT chk_lsttdv_cap      CHECK (cap_thuc_hien IS NULL OR cap_thuc_hien IN (1,2,3))
);
GO

-- 4.14. Minh chứng đính kèm đơn vị (mirror minh_chung)
CREATE TABLE minh_chung_don_vi (
    id_minh_chung_dv INT           IDENTITY(1,1) PRIMARY KEY,
    id_chi_tiet_dv   INT           NOT NULL,
    loai_minh_chung  TINYINT       NOT NULL DEFAULT 1,  -- 1: File, 2: Link, 3: DOI/URL học thuật
    ten_hien_thi     NVARCHAR(255) NOT NULL,            -- Dùng chung cho cả file & link
    ten_file_goc     NVARCHAR(255) NULL,                -- Chỉ áp dụng khi là File
    duong_dan        NVARCHAR(500) NOT NULL,            -- Path file hoặc URL
    loai_file        NVARCHAR(50)  NULL,                -- Chỉ áp dụng khi là File
    kich_thuoc_kb    INT           NULL,                -- Chỉ áp dụng khi là File
    nguoi_tai_len    INT           NOT NULL,
    ngay_tai_len     DATETIME      DEFAULT GETDATE(),
    da_xoa           BIT           DEFAULT 0,
    ngay_xoa         DATETIME      NULL,
    CONSTRAINT fk_mcdv_chi_tiet    FOREIGN KEY (id_chi_tiet_dv) REFERENCES chi_tiet_danh_gia_don_vi(id_chi_tiet_dv) ON DELETE CASCADE,
    CONSTRAINT fk_mcdv_nguoi       FOREIGN KEY (nguoi_tai_len)  REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_mcdv_loai       CHECK (loai_minh_chung IN (1, 2, 3)),
    CONSTRAINT chk_mcdv_kich_thuoc CHECK (kich_thuoc_kb IS NULL OR kich_thuoc_kb > 0),
    -- File phải có ten_file_goc và loai_file; Link/URL thì không bắt buộc
    CONSTRAINT chk_mcdv_consistent CHECK (
        (loai_minh_chung = 1 AND ten_file_goc IS NOT NULL AND loai_file IS NOT NULL)
     OR (loai_minh_chung IN (2, 3))
    )
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
CREATE INDEX ix_nv_chuc_danh   ON nhan_vien(id_chuc_danh) WHERE id_chuc_danh IS NOT NULL;
CREATE INDEX ix_nv_chuc_vu     ON nhan_vien(id_chuc_vu)   WHERE id_chuc_vu   IS NOT NULL;
CREATE INDEX ix_nv_science_uid ON nhan_vien(science_user_id) WHERE science_user_id IS NOT NULL;
-- Cho phép nhiều NULL, science_user_id đã gán phải duy nhất
CREATE UNIQUE INDEX ux_nhan_vien_science_user_not_null
    ON nhan_vien(science_user_id) WHERE science_user_id IS NOT NULL;

-- chức vụ kiêm nhiệm (resolve "chức vụ áp dụng" của 1 GV theo ngày)
CREATE INDEX ix_nvcv_nv_ngay   ON nhan_vien_chuc_vu(id_nhan_vien, tu_ngay, den_ngay);
CREATE INDEX ix_nvcv_chuc_vu   ON nhan_vien_chuc_vu(id_chuc_vu);

-- cấu hình KPI
CREATE INDEX ix_tieu_chi_nhom     ON tieu_chi_danh_gia(id_nhom, trang_thai);
CREATE INDEX ix_thang_diem_tc     ON thang_diem(id_tieu_chi);
CREATE INDEX ix_dm_chuc_danh_nam  ON dinh_muc_giang_vien(id_chuc_danh, id_nam);

-- gia hạn tự đánh giá: 1 dòng HIỆU LỰC / (năm, nhân viên); dòng đã thu hồi giữ làm lịch sử
CREATE UNIQUE INDEX ux_ghdg_nam_nv
    ON gia_han_danh_gia(id_nam, id_nhan_vien) WHERE da_xoa = 0;

-- dữ liệu nguồn
CREATE INDEX ix_gth_nv_nam     ON gio_thuc_hien_gv(id_nhan_vien, id_nam);
CREATE INDEX ix_vp_nv_nam      ON vi_pham_giang_day(id_nhan_vien, id_nam);
CREATE INDEX ix_vp_nam_loai    ON vi_pham_giang_day(id_nam, id_loai_vi_pham);
CREATE INDEX ix_vp_don_vi_ghi_nhan ON vi_pham_giang_day(id_don_vi_ghi_nhan);
CREATE INDEX ix_phsv_ky_hoc    ON phan_hoi_sinh_vien(ky_hoc);
CREATE INDEX ix_phsv_ma_can_bo ON phan_hoi_sinh_vien(ma_can_bo, ky_hoc);
CREATE INDEX ix_phsv_don_vi    ON phan_hoi_sinh_vien(id_don_vi);
CREATE INDEX ix_dtbpsv_nv      ON diem_tb_phan_hoi_sinh_vien(id_nhan_vien);
CREATE INDEX ix_nldm_nv_nam    ON ngoai_le_dinh_muc(id_nhan_vien, id_nam) WHERE trang_thai = 1;
CREATE INDEX ix_nldm_loai      ON ngoai_le_dinh_muc(loai_ngoai_le)        WHERE trang_thai = 1;

-- phiếu đánh giá
CREATE INDEX ix_phieu_nam_nv      ON phieu_danh_gia(id_nam, id_nhan_vien);
CREATE INDEX ix_phieu_trang_thai  ON phieu_danh_gia(trang_thai, id_nam);
CREATE INDEX ix_phieu_don_vi      ON phieu_danh_gia(id_don_vi, id_nam);
CREATE INDEX ix_phieu_chuc_vu     ON phieu_danh_gia(id_chuc_vu)         WHERE id_chuc_vu         IS NOT NULL;
CREATE INDEX ix_phieu_xep_loai    ON phieu_danh_gia(id_nam, xep_loai) WHERE xep_loai IS NOT NULL;
CREATE INDEX ix_phieu_nguoi_kh    ON phieu_danh_gia(id_nguoi_dg_khoa)   WHERE id_nguoi_dg_khoa   IS NOT NULL;
CREATE INDEX ix_phieu_nguoi_tr    ON phieu_danh_gia(id_nguoi_dg_truong) WHERE id_nguoi_dg_truong IS NOT NULL;
CREATE INDEX ix_phieu_to_trinh    ON phieu_danh_gia(id_to_trinh)        WHERE id_to_trinh        IS NOT NULL;

-- chi tiết đánh giá
CREATE INDEX ix_ct_phieu          ON chi_tiet_danh_gia(id_phieu);
CREATE INDEX ix_ct_tieu_chi       ON chi_tiet_danh_gia(id_tieu_chi);
-- hàng đợi thẩm định theo DÒNG + phép kiểm NOT EXISTS của trigger 2↔3
CREATE INDEX ix_ctdg_trang_thai_dong  ON chi_tiet_danh_gia(trang_thai_dong, id_phieu);
CREATE INDEX ix_ctdg_don_vi_tham_dinh ON chi_tiet_danh_gia(id_don_vi_tham_dinh, trang_thai_dong) WHERE id_don_vi_tham_dinh IS NOT NULL;

-- nhiệm vụ PVCĐ & minh chứng
CREATE INDEX ix_nvcd_ct           ON nhiem_vu_cong_dong(id_chi_tiet);
CREATE INDEX ix_nvcd_chi_tiet_active ON nhiem_vu_cong_dong(id_chi_tiet) WHERE da_xoa = 0;
CREATE INDEX ix_nvcd_vai_tro      ON nhiem_vu_cong_dong(id_vai_tro);
CREATE INDEX ix_mc_ct             ON minh_chung(id_chi_tiet) WHERE da_xoa = 0;

-- phê duyệt
CREATE INDEX ix_pd_phieu          ON phe_duyet(id_phieu, lan_danh_gia, cap_duyet);
CREATE INDEX ix_pd_nguoi          ON phe_duyet(id_nguoi_duyet, trang_thai);

-- lookup PVCĐ
CREATE INDEX ix_vtpvcd_don_vi_nam ON danh_muc_vai_tro_pvcd(id_don_vi, id_nam) WHERE trang_thai = 1;

-- lịch sử (sẽ là bảng dài nhất theo thời gian)
CREATE INDEX ix_lscd_ct_lan       ON lich_su_cham_diem(id_chi_tiet, lan_danh_gia, ngay_thuc_hien);
CREATE INDEX ix_lscd_phieu        ON lich_su_cham_diem(id_phieu, lan_danh_gia);
CREATE INDEX ix_lstt_phieu        ON lich_su_trang_thai_phieu(id_phieu, ngay_thuc_hien DESC);

-- nhật ký
CREATE INDEX ix_nk_phieu          ON nhat_ky(id_phieu, ngay_tao DESC);

-- đánh giá đơn vị (khoa/phòng)
CREATE INDEX ix_pdv_don_vi_nam    ON phieu_danh_gia_don_vi(id_don_vi, id_nam);
CREATE INDEX ix_pdv_trang_thai    ON phieu_danh_gia_don_vi(trang_thai, id_nam);
CREATE INDEX ix_ctdv_tieu_chi     ON chi_tiet_danh_gia_don_vi(id_tieu_chi);
CREATE INDEX ix_pddv_nguoi        ON phe_duyet_don_vi(id_nguoi_duyet, trang_thai);
CREATE INDEX ix_lscddv_ct_lan     ON lich_su_cham_diem_don_vi(id_chi_tiet_dv, lan_danh_gia, ngay_thuc_hien);
CREATE INDEX ix_lscddv_phieu      ON lich_su_cham_diem_don_vi(id_phieu_dv, lan_danh_gia);
CREATE INDEX ix_lsttdv_phieu      ON lich_su_trang_thai_phieu_don_vi(id_phieu_dv, ngay_thuc_hien DESC);
CREATE INDEX ix_mcdv_ct           ON minh_chung_don_vi(id_chi_tiet_dv) WHERE da_xoa = 0;

-- dữ liệu NCKH đồng bộ từ API (khi chấm điểm sẽ lọc theo năm; tra theo giảng viên đã được PK phủ)
CREATE INDEX ix_tong_hop_nckh_nam  ON nckh_tong_hop(id_nam);
CREATE INDEX ix_phan_loai_nckh_nam ON nckh_phan_loai(id_nam, loai);
GO

-- =============================================================================
-- 7. NHIỆM VỤ THEO PHÂN CÔNG CỦA KHOA (KPI Nhóm III)
--    Khoa phân công - giảng viên phản hồi. Thay thế luồng GV tự kê khai
--    (nhiem_vu_cong_dong). Mô tả nghiệp vụ: xem schema_ghi_chu.md mục 7.
-- =============================================================================

-- 7.1. Kỳ nhiệm vụ theo (năm × Khoa). Trạng thái duyệt gắn vào KỲ, không gắn
--      vào từng bản ghi phân công.
CREATE TABLE ky_nhiem_vu_khoa (
    id_ky         INT           IDENTITY(1,1) PRIMARY KEY,
    id_nam        INT           NOT NULL,
    id_don_vi     INT           NOT NULL,   -- Khoa (ma_don_vi LIKE 'K_%')
    trang_thai    TINYINT       NOT NULL DEFAULT 1,   -- 1: Đang mở, 2: Đã chốt
    han_phan_hoi  DATE          NULL,       -- Hết hạn KHÔNG khoá ghi, chỉ là nhãn
    id_nguoi_chot INT           NULL,
    ngay_chot     DATETIME      NULL,
    ghi_chu       NVARCHAR(500) NULL,
    ngay_tao      DATETIME      NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME      NULL,
    CONSTRAINT fk_kynvk_nam         FOREIGN KEY (id_nam)        REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_kynvk_don_vi      FOREIGN KEY (id_don_vi)     REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_kynvk_nguoi_chot  FOREIGN KEY (id_nguoi_chot) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT uq_kynvk             UNIQUE (id_nam, id_don_vi),
    CONSTRAINT chk_kynvk_trang_thai CHECK (trang_thai IN (1, 2))
);
GO

-- 7.2. Nhiệm vụ do Khoa đặt ra, thuộc 1 trong 7 nhóm công tác cố định
CREATE TABLE nhiem_vu_khoa (
    id_nhiem_vu_khoa INT            IDENTITY(1,1) PRIMARY KEY,
    id_ky            INT            NOT NULL,   -- mang sẵn cả id_nam + id_don_vi
    id_nhom_nv       INT            NOT NULL,
    ten_nhiem_vu     NVARCHAR(500)  NOT NULL,
    mo_ta            NVARCHAR(1000) NULL,
    id_nguoi_tao     INT            NOT NULL,
    ngay_tao         DATETIME       NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat    DATETIME       NULL,
    da_xoa           BIT            NOT NULL DEFAULT 0,
    ngay_xoa         DATETIME       NULL,
    CONSTRAINT fk_nvk_ky        FOREIGN KEY (id_ky)        REFERENCES ky_nhiem_vu_khoa(id_ky),
    CONSTRAINT fk_nvk_nhom      FOREIGN KEY (id_nhom_nv)   REFERENCES danh_muc_nhom_nhiem_vu(id_nhom_nv),
    CONSTRAINT fk_nvk_nguoi_tao FOREIGN KEY (id_nguoi_tao) REFERENCES nhan_vien(id_nhan_vien)
);
GO

-- 7.3. Phân công: nối nhiệm vụ với giảng viên, mang vai trò và ĐIỂM GHI CỨNG
--      (snapshot tại thời điểm gán — đổi mức điểm ở kỳ sau không làm đổi kỳ cũ)
CREATE TABLE phan_cong_nhiem_vu_khoa (
    id_phan_cong         INT           IDENTITY(1,1) PRIMARY KEY,
    id_nhiem_vu_khoa     INT           NOT NULL,
    id_nhan_vien         INT           NOT NULL,
    id_vai_tro           INT           NOT NULL,
    ma_vai_tro_snapshot  NVARCHAR(30)  NOT NULL,
    ten_vai_tro_snapshot NVARCHAR(200) NOT NULL,
    diem_snapshot        DECIMAL(5,2)  NOT NULL,
    la_chu_tri           BIT           NOT NULL DEFAULT 0,   -- 1 khi ma_vai_tro_snapshot = 'CT'
    ghi_chu              NVARCHAR(500) NULL,
    id_nguoi_gan         INT           NOT NULL,
    ngay_tao             DATETIME      NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat        DATETIME      NULL,
    CONSTRAINT fk_pcnvk_nhiem_vu FOREIGN KEY (id_nhiem_vu_khoa) REFERENCES nhiem_vu_khoa(id_nhiem_vu_khoa) ON DELETE CASCADE,
    CONSTRAINT fk_pcnvk_nv       FOREIGN KEY (id_nhan_vien)     REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_pcnvk_vai_tro  FOREIGN KEY (id_vai_tro)       REFERENCES danh_muc_vai_tro_pvcd(id_vai_tro),
    CONSTRAINT fk_pcnvk_nguoi    FOREIGN KEY (id_nguoi_gan)     REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT uq_pcnvk          UNIQUE (id_nhiem_vu_khoa, id_nhan_vien),
    CONSTRAINT chk_pcnvk_diem    CHECK (diem_snapshot >= 0)
);
GO

-- 7.4. Phản hồi của giảng viên (1: sai vai trò, 2: thiếu nhiệm vụ)
CREATE TABLE phan_hoi_nhiem_vu_khoa (
    id_phan_hoi      INT            IDENTITY(1,1) PRIMARY KEY,
    id_ky            INT            NOT NULL,
    id_nhan_vien     INT            NOT NULL,   -- người gửi
    loai_phan_hoi    TINYINT        NOT NULL,   -- 1: Sai vai trò, 2: Thiếu nhiệm vụ
    id_nhiem_vu_khoa INT            NULL,       -- bắt buộc khi loại = 1
    id_nhom_nv       INT            NULL,       -- gợi ý nhóm khi loại = 2
    noi_dung         NVARCHAR(1000) NOT NULL,
    trang_thai       TINYINT        NOT NULL DEFAULT 1,   -- 1: Chờ xử lý, 2: Đã xử lý
    ghi_chu_xu_ly    NVARCHAR(1000) NULL,
    id_nguoi_xu_ly   INT            NULL,
    ngay_xu_ly       DATETIME       NULL,
    ngay_tao         DATETIME       NOT NULL DEFAULT GETDATE(),
    da_xoa           BIT            NOT NULL DEFAULT 0,
    ngay_xoa         DATETIME       NULL,
    CONSTRAINT fk_phnvk_ky          FOREIGN KEY (id_ky)            REFERENCES ky_nhiem_vu_khoa(id_ky),
    CONSTRAINT fk_phnvk_nv          FOREIGN KEY (id_nhan_vien)     REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_phnvk_nhiem_vu    FOREIGN KEY (id_nhiem_vu_khoa) REFERENCES nhiem_vu_khoa(id_nhiem_vu_khoa),
    CONSTRAINT fk_phnvk_nhom        FOREIGN KEY (id_nhom_nv)       REFERENCES danh_muc_nhom_nhiem_vu(id_nhom_nv),
    CONSTRAINT fk_phnvk_nguoi_xl    FOREIGN KEY (id_nguoi_xu_ly)   REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_phnvk_trang_thai CHECK (trang_thai IN (1, 2)),
    CONSTRAINT chk_phnvk_loai CHECK (
        (loai_phan_hoi = 1 AND id_nhiem_vu_khoa IS NOT NULL)
     OR (loai_phan_hoi = 2 AND id_nhiem_vu_khoa IS NULL))
);
GO

-- 7.5. Minh chứng PDF HAI CẤP: 1 = cấp nhiệm vụ (dùng chung), 2 = cấp phản hồi
CREATE TABLE minh_chung_nhiem_vu_khoa (
    id_minh_chung_nvk INT           IDENTITY(1,1) PRIMARY KEY,
    cap_gan           TINYINT       NOT NULL,   -- 1: Nhiệm vụ, 2: Phản hồi
    id_nhiem_vu_khoa  INT           NULL,
    id_phan_hoi       INT           NULL,
    ten_hien_thi      NVARCHAR(255) NOT NULL,
    ten_file_goc      NVARCHAR(255) NOT NULL,
    duong_dan         NVARCHAR(500) NOT NULL,   -- tương đối với ~/App_Data
    loai_file         NVARCHAR(50)  NOT NULL,
    kich_thuoc_kb     INT           NULL,
    nguoi_tai_len     INT           NOT NULL,
    ngay_tai_len      DATETIME      NOT NULL DEFAULT GETDATE(),
    da_xoa            BIT           NOT NULL DEFAULT 0,
    ngay_xoa          DATETIME      NULL,
    CONSTRAINT fk_mcnvk_nhiem_vu FOREIGN KEY (id_nhiem_vu_khoa) REFERENCES nhiem_vu_khoa(id_nhiem_vu_khoa),
    CONSTRAINT fk_mcnvk_phan_hoi FOREIGN KEY (id_phan_hoi)      REFERENCES phan_hoi_nhiem_vu_khoa(id_phan_hoi),
    CONSTRAINT fk_mcnvk_nguoi    FOREIGN KEY (nguoi_tai_len)    REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_mcnvk_cap CHECK (
        (cap_gan = 1 AND id_nhiem_vu_khoa IS NOT NULL AND id_phan_hoi IS NULL)
     OR (cap_gan = 2 AND id_phan_hoi IS NOT NULL AND id_nhiem_vu_khoa IS NULL)),
    CONSTRAINT chk_mcnvk_pdf CHECK (duong_dan LIKE N'%.pdf'),
    CONSTRAINT chk_mcnvk_kb  CHECK (kich_thuoc_kb IS NULL OR kich_thuoc_kb > 0)
);
GO

-- 7.6. Nhật ký: mọi thay đổi vai trò, điểm và thao tác chốt kỳ
CREATE TABLE lich_su_nhiem_vu_khoa (
    id                 BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_ky              INT            NOT NULL,
    id_nhiem_vu_khoa   INT            NULL,
    id_nhan_vien       INT            NULL,   -- GV bị ảnh hưởng (dòng phân công)
    hanh_dong          TINYINT        NOT NULL,
        -- 1: Tạo nhiệm vụ    2: Sửa nhiệm vụ      3: Xoá nhiệm vụ
        -- 4: Thêm phân công  5: Đổi vai trò/điểm  6: Gỡ phân công
        -- 7: Chốt kỳ         8: Mở lại kỳ         9: Xử lý phản hồi
    vai_tro_truoc      NVARCHAR(30)   NULL,
    vai_tro_sau        NVARCHAR(30)   NULL,
    diem_truoc         DECIMAL(5,2)   NULL,
    diem_sau           DECIMAL(5,2)   NULL,
    mo_ta              NVARCHAR(1000) NULL,
    id_nguoi_thuc_hien INT            NOT NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_lsnvk_ky       FOREIGN KEY (id_ky)              REFERENCES ky_nhiem_vu_khoa(id_ky),
    CONSTRAINT fk_lsnvk_nhiem_vu FOREIGN KEY (id_nhiem_vu_khoa)   REFERENCES nhiem_vu_khoa(id_nhiem_vu_khoa),
    CONSTRAINT fk_lsnvk_nv       FOREIGN KEY (id_nhan_vien)       REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_lsnvk_nguoi    FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lsnvk_hd CHECK (hanh_dong IN (1,2,3,4,5,6,7,8,9))
);
GO

-- 7.7. TVP: danh sách phân công gửi lên trong 1 request (một form, một lần lưu)
CREATE TYPE dbo.PhanCongNhiemVuKhoaRow AS TABLE (
    id_nhan_vien INT           NOT NULL,
    id_vai_tro   INT           NOT NULL,
    ghi_chu      NVARCHAR(500) NULL,
    PRIMARY KEY (id_nhan_vien)
);
GO

-- 7.8. Index của module
CREATE INDEX ix_nvk_ky_active      ON nhiem_vu_khoa(id_ky) WHERE da_xoa = 0;
CREATE INDEX ix_nvk_nhom           ON nhiem_vu_khoa(id_nhom_nv);
CREATE INDEX ix_pcnvk_nhan_vien    ON phan_cong_nhiem_vu_khoa(id_nhan_vien);
-- BẤT BIẾN: mỗi nhiệm vụ tối đa MỘT chủ trì (chặn ở DB, kèm kiểm tường minh
-- trong sp_nhiem_vu_khoa_save để trả error_code TRUNG_CHU_TRI thay vì lỗi 2601)
CREATE UNIQUE INDEX ux_pcnvk_chu_tri ON phan_cong_nhiem_vu_khoa(id_nhiem_vu_khoa) WHERE la_chu_tri = 1;
CREATE INDEX ix_phnvk_ky_cho       ON phan_hoi_nhiem_vu_khoa(id_ky) WHERE da_xoa = 0 AND trang_thai = 1;
CREATE INDEX ix_phnvk_nv           ON phan_hoi_nhiem_vu_khoa(id_nhan_vien, id_ky) WHERE da_xoa = 0;
CREATE INDEX ix_mcnvk_nhiem_vu     ON minh_chung_nhiem_vu_khoa(id_nhiem_vu_khoa) WHERE da_xoa = 0;
CREATE INDEX ix_mcnvk_phan_hoi     ON minh_chung_nhiem_vu_khoa(id_phan_hoi) WHERE da_xoa = 0;
CREATE INDEX ix_lsnvk_ky           ON lich_su_nhiem_vu_khoa(id_ky, ngay_thuc_hien DESC);
CREATE INDEX ix_lsnvk_nhiem_vu     ON lich_su_nhiem_vu_khoa(id_nhiem_vu_khoa, ngay_thuc_hien DESC) WHERE id_nhiem_vu_khoa IS NOT NULL;
GO


-- =============================================================================
-- 8. TỜ TRÌNH KPI KHOA (gói hồ sơ Khoa trình Hiệu trưởng)
--    Nơi DUY NHẤT tính hạn ngạch 20% và nâng xếp loại lên mức 4.
--    Mô tả nghiệp vụ + luật hạn ngạch: xem schema_ghi_chu.md mục 8.
-- =============================================================================

-- 8.1. Tờ trình: 1 gói / (năm × đơn vị)
CREATE TABLE to_trinh_kpi_khoa (
    id_to_trinh        INT            IDENTITY(1,1) PRIMARY KEY,
    id_nam             INT            NOT NULL,
    id_don_vi          INT            NOT NULL,   -- Khoa / Phòng lập tờ trình
    trang_thai         TINYINT        NOT NULL DEFAULT 1,
        -- 1: DANG_TONG_HOP — chưa đủ 100% hồ sơ được Trưởng khoa chốt
        -- 2: DA_DONG_GOI   — đã tính hạn ngạch + nâng xuất sắc; mở nút "Trình Hiệu trưởng"
        -- 3: DA_TRINH      — chờ Hiệu trưởng duyệt
        -- 4: HT_DA_DUYET   — chốt số liệu toàn Khoa, khóa chiến dịch
        -- 5: HT_TRA_VE     — HT trả về ≥1 hồ sơ; TK xử lý rồi trình lại

    -- Snapshot hạn ngạch tại thời điểm đóng gói (quy định có thể đổi theo năm)
    so_giang_vien      INT            NULL,       -- Mẫu số: đếm loai_doi_tuong = 1
    ty_le_xuat_sac     DECIMAL(5,4)   NOT NULL DEFAULT 0.2000,
    han_ngach_xuat_sac INT            NULL,       -- FLOOR(so_giang_vien * ty_le_xuat_sac)
    so_dat_xuat_sac    INT            NULL,

    lan_trinh          TINYINT        NOT NULL DEFAULT 0,   -- +1 mỗi lần trình HT
    id_nguoi_dong_goi  INT            NULL,
    ngay_dong_goi      DATETIME       NULL,
    id_nguoi_trinh     INT            NULL,
    ngay_trinh         DATETIME       NULL,
    id_nguoi_duyet     INT            NULL,
    ngay_duyet         DATETIME       NULL,
    nhan_xet_ht        NVARCHAR(2000) NULL,
    ly_do_tra_ve       NVARCHAR(1000) NULL,

    row_version        ROWVERSION     NOT NULL,   -- Kiểm soát xung đột, đồng bộ với các SP mutation khác
    ngay_tao           DATETIME       NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat      DATETIME       NULL,

    CONSTRAINT fk_ttkk_nam      FOREIGN KEY (id_nam)            REFERENCES nam_danh_gia(id_nam),
    CONSTRAINT fk_ttkk_don_vi   FOREIGN KEY (id_don_vi)         REFERENCES don_vi(id_don_vi),
    CONSTRAINT fk_ttkk_nguoi_dg FOREIGN KEY (id_nguoi_dong_goi) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ttkk_nguoi_tr FOREIGN KEY (id_nguoi_trinh)    REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT fk_ttkk_nguoi_dt FOREIGN KEY (id_nguoi_duyet)    REFERENCES nhan_vien(id_nhan_vien),

    CONSTRAINT chk_ttkk_trang_thai CHECK (trang_thai IN (1,2,3,4,5)),
    CONSTRAINT chk_ttkk_ty_le      CHECK (ty_le_xuat_sac > 0 AND ty_le_xuat_sac <= 1),
    CONSTRAINT chk_ttkk_so_gv      CHECK (so_giang_vien      IS NULL OR so_giang_vien      >= 0),
    CONSTRAINT chk_ttkk_han_ngach  CHECK (han_ngach_xuat_sac IS NULL OR han_ngach_xuat_sac >= 0),
    CONSTRAINT chk_ttkk_so_dat     CHECK (so_dat_xuat_sac    IS NULL OR so_dat_xuat_sac    >= 0),
    -- Mỗi (năm, đơn vị) chỉ có 1 tờ trình
    CONSTRAINT uq_ttkk_nam_don_vi  UNIQUE (id_nam, id_don_vi)
);
GO

-- 8.2. Lịch sử tờ trình (mirror lich_su_trang_thai_phieu; mỗi row = 1 transition)
CREATE TABLE lich_su_to_trinh_kpi_khoa (
    id                 BIGINT         IDENTITY(1,1) PRIMARY KEY,
    id_to_trinh        INT            NOT NULL,
    lan_trinh          TINYINT        NOT NULL,
    trang_thai_truoc   TINYINT        NULL,        -- NULL = lần đầu tạo tờ trình
    trang_thai_sau     TINYINT        NOT NULL,
    hanh_dong          TINYINT        NOT NULL,
        -- 1: Đóng gói (tính hạn ngạch, nâng xuất sắc)
        -- 2: Trình Hiệu trưởng
        -- 3: Hiệu trưởng duyệt gói
        -- 4: Hiệu trưởng trả về (kèm danh sách hồ sơ bị trả)
        -- 5: Mở lại gói đã duyệt
    so_ho_so_tra_ve    INT            NULL,        -- Chỉ có nghĩa khi hanh_dong = 4
    id_nguoi_thuc_hien INT            NOT NULL,
    ly_do              NVARCHAR(1000) NULL,        -- BẮT BUỘC (ở tầng API) khi hanh_dong IN (4, 5)
    nhan_xet           NVARCHAR(1000) NULL,
    ngay_thuc_hien     DATETIME       NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_lsttkk_to_trinh FOREIGN KEY (id_to_trinh)        REFERENCES to_trinh_kpi_khoa(id_to_trinh) ON DELETE CASCADE,
    CONSTRAINT fk_lsttkk_nguoi    FOREIGN KEY (id_nguoi_thuc_hien) REFERENCES nhan_vien(id_nhan_vien),
    CONSTRAINT chk_lsttkk_tt_sau   CHECK (trang_thai_sau   IN (1,2,3,4,5)),
    CONSTRAINT chk_lsttkk_tt_truoc CHECK (trang_thai_truoc IS NULL OR trang_thai_truoc IN (1,2,3,4,5)),
    CONSTRAINT chk_lsttkk_hd       CHECK (hanh_dong IN (1,2,3,4,5))
);
GO

-- 8.3. FK phiếu → tờ trình. Đặt ở đây (không inline ở mục 4.1) vì phieu_danh_gia
--      khai báo TRƯỚC to_trinh_kpi_khoa. KHÔNG cascade: xóa tờ trình khi còn hồ
--      sơ gán vào phải báo lỗi, không được âm thầm gỡ liên kết.
ALTER TABLE phieu_danh_gia
    ADD CONSTRAINT fk_phieu_to_trinh FOREIGN KEY (id_to_trinh) REFERENCES to_trinh_kpi_khoa(id_to_trinh);
GO

-- 8.4. Index của module
CREATE INDEX ix_ttkk_trang_thai ON to_trinh_kpi_khoa(trang_thai, id_nam);
CREATE INDEX ix_lsttkk_to_trinh ON lich_su_to_trinh_kpi_khoa(id_to_trinh, ngay_thuc_hien DESC);
GO