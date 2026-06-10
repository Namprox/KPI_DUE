CREATE DATABASE DueKpiDB
GO

USE DueKpiDB
GO

------------------------------------------------------------
-- TABLE
------------------------------------------------------------

CREATE TABLE [dbo].[nhat_ky_dang_nhap](
    [id]              [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]    [int] NULL,
    [email_dang_nhap] [nvarchar](150) NOT NULL,
    [dia_chi_ip]      [varchar](45) NOT NULL,
    [thanh_cong]      [bit] NOT NULL,
    [ly_do_that_bai]  [nvarchar](100) NULL,
    [thoi_gian_tao]   [datetimeoffset](7) NOT NULL DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [pk_nhat_ky_dang_nhap] PRIMARY KEY CLUSTERED ([id] ASC)
);
GO

CREATE TABLE [dbo].[nhom_tieu_chi](
    [id_nhom]         [int] IDENTITY(1,1) NOT NULL,
    [ten_nhom]        [nvarchar](200) NOT NULL,
    [id_nhom_cha]     [int] NULL,
    [loai_nhom]       [tinyint] NOT NULL DEFAULT ((1)),
    [diem_toi_da]     [decimal](5, 2) NULL DEFAULT ((100)),
    [thu_tu_hien_thi] [int] NULL DEFAULT ((0)),
    [trang_thai]      [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_nhom_tieu_chi] PRIMARY KEY CLUSTERED ([id_nhom] ASC)
);
GO

CREATE TABLE [dbo].[danh_muc_nhom_nhiem_vu](
    [id_nhom_nv]  [int] IDENTITY(1,1) NOT NULL,
    [ten_nhom]    [nvarchar](200) NOT NULL,
    [thu_tu]      [int] NULL DEFAULT ((0)),
    [trang_thai]  [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_danh_muc_nhom_nhiem_vu] PRIMARY KEY CLUSTERED ([id_nhom_nv] ASC)
);
GO

CREATE TABLE [dbo].[chuc_vu](
    [id_chuc_vu]            [int] IDENTITY(1,1) NOT NULL,
    [ma_chuc_vu]            [nvarchar](20) NOT NULL,
    [ten_chuc_vu]           [nvarchar](100) NOT NULL,
    [trang_thai]            [bit] NULL DEFAULT ((1)),
    [ty_le_dinh_muc_giang]  [decimal](5, 4) NULL,
    [ghi_chu_dieu_kien]     [nvarchar](500) NULL,
    [ty_le_dinh_muc_nckh]   [decimal](5, 4) NULL,
    CONSTRAINT [pk_chuc_vu] PRIMARY KEY CLUSTERED ([id_chuc_vu] ASC),
    CONSTRAINT [uq_ma_chuc_vu] UNIQUE NONCLUSTERED ([ma_chuc_vu] ASC)
);
GO

CREATE TABLE [dbo].[chuc_danh_nghe_nghiep](
    [id_chuc_danh]  [int] IDENTITY(1,1) NOT NULL,
    [ma_chuc_danh]  [nvarchar](20) NOT NULL,
    [ten_chuc_danh] [nvarchar](200) NOT NULL,
    [mo_ta]         [nvarchar](500) NULL,
    [trang_thai]    [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_chuc_danh_nghe_nghiep] PRIMARY KEY CLUSTERED ([id_chuc_danh] ASC),
    CONSTRAINT [uq_ma_chuc_danh] UNIQUE NONCLUSTERED ([ma_chuc_danh] ASC)
);
GO

CREATE TABLE [dbo].[nam_danh_gia](
    [id_nam]                   [int] NOT NULL,
    [ngay_bat_dau]             [date] NOT NULL,
    [ngay_ket_thuc]            [date] NOT NULL,
    [ngay_mo_tu_danh_gia]      [date] NULL,
    [ngay_dong_tu_danh_gia]    [date] NULL,
    [ngay_mo_danh_gia_cap_tren]  [date] NULL,
    [ngay_dong_danh_gia_cap_tren] [date] NULL,
    [trang_thai]               [tinyint] NULL DEFAULT ((1)),
    [ghi_chu]                  [nvarchar](500) NULL,
    CONSTRAINT [pk_nam_danh_gia] PRIMARY KEY CLUSTERED ([id_nam] ASC)
);
GO

CREATE TABLE [dbo].[don_vi](
    [id_don_vi]     [int] IDENTITY(1,1) NOT NULL,
    [ma_don_vi]     [nvarchar](20) NOT NULL,
    [ten_don_vi]    [nvarchar](200) NOT NULL,
    [id_don_vi_cha] [int] NULL,
    [cap_don_vi]    [tinyint] NOT NULL,
    [trang_thai]    [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_don_vi] PRIMARY KEY CLUSTERED ([id_don_vi] ASC),
    CONSTRAINT [uq_ma_don_vi] UNIQUE NONCLUSTERED ([ma_don_vi] ASC)
);
GO

CREATE TABLE [dbo].[dinh_muc_giang_vien](
    [id_dinh_muc]        [int] IDENTITY(1,1) NOT NULL,
    [id_chuc_danh]       [int] NOT NULL,
    [id_nam]             [int] NOT NULL,
    [gio_giang_ly_thuyet][decimal](8, 2) NOT NULL,
    [gio_nckh]           [decimal](8, 2) NOT NULL,
    [mo_ta]              [nvarchar](500) NULL,
    [gio_pvcd]           [decimal](8, 2) NOT NULL DEFAULT ((0)),
    CONSTRAINT [pk_dinh_muc_giang_vien] PRIMARY KEY CLUSTERED ([id_dinh_muc] ASC),
    CONSTRAINT [uq_dinh_muc_chuc_danh_nam] UNIQUE NONCLUSTERED ([id_chuc_danh] ASC, [id_nam] ASC)
);
GO

CREATE TABLE [dbo].[danh_muc_vai_tro_pvcd](
    [id_vai_tro]    [int] IDENTITY(1,1) NOT NULL,
    [id_don_vi]     [int] NULL,
    [id_nam]        [int] NULL,
    [ma_vai_tro]    [nvarchar](30) NOT NULL,
    [ten_vai_tro]   [nvarchar](200) NOT NULL,
    [diem_quy_doi]  [decimal](5, 2) NOT NULL,
    [thu_tu]        [int] NULL DEFAULT ((0)),
    [trang_thai]    [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_danh_muc_vai_tro_pvcd] PRIMARY KEY CLUSTERED ([id_vai_tro] ASC),
    CONSTRAINT [uq_vtpvcd] UNIQUE NONCLUSTERED ([id_don_vi] ASC, [id_nam] ASC, [ma_vai_tro] ASC)
);
GO

CREATE TABLE [dbo].[mau_danh_gia](
    [id_mau]     [int] IDENTITY(1,1) NOT NULL,
    [ten_mau]    [nvarchar](200) NOT NULL,
    [id_nam]     [int] NOT NULL,
    [mo_ta]      [nvarchar](500) NULL,
    [trang_thai] [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_mau_danh_gia] PRIMARY KEY CLUSTERED ([id_mau] ASC)
);
GO

CREATE TABLE [dbo].[tieu_chi_danh_gia](
    [id_tieu_chi]       [int] IDENTITY(1,1) NOT NULL,
    [ten_tieu_chi]      [nvarchar](500) NOT NULL,
    [id_nhom]           [int] NOT NULL,
    [id_nam]            [int] NULL,
    [mo_ta]             [nvarchar](1000) NULL,
    [diem_toi_da]       [decimal](5, 2) NOT NULL,
    [loai_thang_diem]   [tinyint] NULL DEFAULT ((1)),
    [cap_danh_gia]      [tinyint] NULL,
    [cong_thuc_tinh_diem][nvarchar](500) NULL,
    [bat_buoc_minh_chung][bit] NULL DEFAULT ((0)),
    [thu_tu_hien_thi]   [int] NULL DEFAULT ((0)),
    [trang_thai]        [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_tieu_chi_danh_gia] PRIMARY KEY CLUSTERED ([id_tieu_chi] ASC)
);
GO

CREATE TABLE [dbo].[nhan_vien](
    [id_nhan_vien]          [int] IDENTITY(1,1) NOT NULL,
    [ma_nhan_vien]          [nvarchar](20) NOT NULL,
    [ho_ten]                [nvarchar](100) NOT NULL,
    [email]                 [nvarchar](150) NULL,
    [mat_khau]              [nvarchar](255) NOT NULL,
    [id_don_vi]             [int] NOT NULL,
    [id_chuc_vu]            [int] NULL,
    [id_quan_ly_truc_tiep]  [int] NULL,
    [id_chuc_danh]          [int] NULL,
    [science_user_id]       [int] NULL,
    [trang_thai]            [bit] NULL DEFAULT ((1)),
    [ngay_tao]              [datetime] NULL DEFAULT (getdate()),
    [refresh_token_hash]    [varchar](64) NULL,
    [refresh_token_het_han] [datetime2](7) NULL,
    [so_lan_dang_nhap_sai]  [tinyint] NOT NULL DEFAULT ((0)),
    [khoa_dang_nhap_den]    [datetime2](7) NULL,
    [gioi_tinh]             [tinyint] NULL,
    [ngay_sinh]             [date] NULL,
    [he_so_phu_cap]         [decimal](3, 2) NULL,
    CONSTRAINT [pk_nhan_vien] PRIMARY KEY CLUSTERED ([id_nhan_vien] ASC),
    CONSTRAINT [uq_ma_nhan_vien] UNIQUE NONCLUSTERED ([ma_nhan_vien] ASC)
);
GO

CREATE TABLE [dbo].[vi_pham_giang_day](
    [id_vi_pham]        [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]      [int] NOT NULL,
    [id_nam]            [int] NOT NULL,
    [mo_ta]             [nvarchar](500) NOT NULL,
    [la_nghiem_trong]   [bit] NULL DEFAULT ((0)),
    [ngay_vi_pham]      [date] NULL,
    [id_nguoi_ghi_nhan] [int] NOT NULL,
    [ngay_ghi_nhan]     [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_vi_pham_giang_day] PRIMARY KEY CLUSTERED ([id_vi_pham] ASC)
);
GO

CREATE TABLE [dbo].[phan_hoi_sinh_vien](
    [id_phan_hoi]         [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]        [int] NOT NULL,
    [id_nam]              [int] NOT NULL,
    [diem_trung_binh]     [decimal](4, 2) NOT NULL,
    [so_hoc_phan_danh_gia][int] NULL DEFAULT ((0)),
    [he_thong_nguon]      [nvarchar](200) NULL,
    [ngay_cap_nhat]       [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_phan_hoi_sinh_vien] PRIMARY KEY CLUSTERED ([id_phan_hoi] ASC),
    CONSTRAINT [uq_phsv_nv_nam] UNIQUE NONCLUSTERED ([id_nhan_vien] ASC, [id_nam] ASC)
);
GO

CREATE TABLE [dbo].[nhan_vien_chuc_vu](
    [id_nv_chuc_vu] [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]  [int] NOT NULL,
    [id_chuc_vu]    [int] NOT NULL,
    [tu_ngay]       [date] NOT NULL,
    [den_ngay]      [date] NULL,
    [ghi_chu]       [nvarchar](500) NULL,
    [ngay_tao]      [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_nhan_vien_chuc_vu] PRIMARY KEY CLUSTERED ([id_nv_chuc_vu] ASC)
);
GO

CREATE TABLE [dbo].[gio_thuc_hien_gv](
    [id_gio_thuc_hien]  [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]      [int] NOT NULL,
    [id_nam]            [int] NOT NULL,
    [gio_giang_thuc_te] [decimal](8, 2) NOT NULL DEFAULT ((0)),
    [gio_nckh_thuc_te]  [decimal](8, 2) NOT NULL DEFAULT ((0)),
    [nguon]             [tinyint] NOT NULL DEFAULT ((1)),
    [ngay_cap_nhat]     [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_gio_thuc_hien_gv] PRIMARY KEY CLUSTERED ([id_gio_thuc_hien] ASC),
    CONSTRAINT [uq_gth_nv_nam] UNIQUE NONCLUSTERED ([id_nhan_vien] ASC, [id_nam] ASC)
);
GO

CREATE TABLE [dbo].[ngoai_le_dinh_muc](
    [id_ngoai_le]       [int] IDENTITY(1,1) NOT NULL,
    [id_nhan_vien]      [int] NOT NULL,
    [id_nam]            [int] NOT NULL,
    [loai_ngoai_le]     [tinyint] NOT NULL,
    [he_so_giam_giang]  [decimal](4, 3) NULL,
    [so_gio_giam_giang] [decimal](8, 2) NULL,
    [he_so_nckh]        [decimal](4, 3) NULL,
    [he_so_giam_nckh]   [decimal](4, 3) NULL,
    [so_gio_them_nckh]  [decimal](8, 2) NULL,
    [he_so_giam_pvcd]   [decimal](4, 3) NULL,
    [mien_nckh]         [bit] NULL DEFAULT ((0)),
    [tu_ngay]           [date] NULL,
    [den_ngay]          [date] NULL,
    [ly_do]             [nvarchar](500) NULL,
    [minh_chung_url]    [nvarchar](500) NULL,
    [id_nguoi_tao]      [int] NOT NULL,
    [ngay_tao]          [datetime] NULL DEFAULT (getdate()),
    [trang_thai]        [bit] NULL DEFAULT ((1)),
    CONSTRAINT [pk_ngoai_le_dinh_muc] PRIMARY KEY CLUSTERED ([id_ngoai_le] ASC)
);
GO

CREATE TABLE [dbo].[thang_diem](
    [id_thang_diem]   [int] IDENTITY(1,1) NOT NULL,
    [id_tieu_chi]     [int] NOT NULL,
    [gia_tri_diem]    [decimal](5, 2) NOT NULL,
    [dieu_kien_diem]  [nvarchar](500) NULL,
    [thu_tu_hien_thi] [int] NULL DEFAULT ((0)),
    CONSTRAINT [pk_thang_diem] PRIMARY KEY CLUSTERED ([id_thang_diem] ASC)
);
GO

CREATE TABLE [dbo].[phieu_danh_gia](
    [id_phieu]                   [int] IDENTITY(1,1) NOT NULL,
    [id_nam]                     [int] NOT NULL,
    [id_nhan_vien]               [int] NOT NULL,
    [id_don_vi]                  [int] NOT NULL,
    [id_mau]                     [int] NULL,
    [lan_danh_gia]               [tinyint] NOT NULL DEFAULT ((1)),
    [trang_thai]                 [tinyint] NULL DEFAULT ((1)),
    [id_nguoi_dg_khoa]           [int] NULL,
    [ngay_khoa_duyet]            [datetime] NULL,
    [nhan_xet_khoa]              [nvarchar](2000) NULL,
    [id_nguoi_dg_truong]         [int] NULL,
    [ngay_truong_duyet]          [datetime] NULL,
    [nhan_xet_truong]            [nvarchar](2000) NULL,
    [tong_diem_co_ban]           [decimal](6, 2) NULL,
    [tong_diem_vuot_troi]        [decimal](6, 2) NULL,
    [tong_diem_tich_luy]         [decimal](6, 2) NULL,
    [id_nguoi_chot]              [int] NULL,
    [ngay_chot_ket_qua]          [datetime] NULL,
    [lan_mo_lai]                 [tinyint] NOT NULL DEFAULT ((0)),
    [ngay_mo_lai_gan_nhat]       [datetime] NULL,
    [id_nguoi_mo_lai]            [int] NULL,
    [ly_do_mo_lai]               [nvarchar](1000) NULL,
    [ngay_gui]                   [datetime] NULL,
    [ngay_tao]                   [datetime] NULL DEFAULT (getdate()),
    [ngay_cap_nhat]              [datetime] NULL,
    [da_xoa]                     [bit] NULL DEFAULT ((0)),
    [ngay_xoa]                   [datetime] NULL,
    [id_chuc_vu]                 [int] NULL,
    [id_chuc_danh]               [int] NULL,
    [row_version]                [timestamp] NOT NULL,
    [xep_loai]                   [tinyint] NULL,
    [ghi_chu_xep_loai]           [nvarchar](1000) NULL,
    [du_dinh_muc_gio_nckh]       [bit] NULL,
    [khong_vi_pham_phap_luat]    [bit] NULL,
    [muc_nckhcn_qd838]           [tinyint] NULL,
    [gio_giang_dinh_muc_ap_dung] [decimal](8, 2) NULL,
    [gio_nckh_dinh_muc_ap_dung]  [decimal](8, 2) NULL,
    [gio_pvcd_dinh_muc_ap_dung]  [decimal](8, 2) NULL,
    [he_so_nckh_ap_dung]         [decimal](3, 2) NULL DEFAULT ((1.00)),
    [gio_giang_thuc_te_snapshot] [decimal](8, 2) NULL,
    [gio_nckh_thuc_te_snapshot]  [decimal](8, 2) NULL,
    [ly_do_dieu_chinh_dinh_muc]  [nvarchar](500) NULL,
    CONSTRAINT [pk_phieu_danh_gia] PRIMARY KEY CLUSTERED ([id_phieu] ASC),
    CONSTRAINT [uq_phieu_unique] UNIQUE NONCLUSTERED ([id_nam] ASC, [id_nhan_vien] ASC)
);
GO

CREATE TABLE [dbo].[chi_tiet_mau_danh_gia](
    [id_chi_tiet_mau] [int] IDENTITY(1,1) NOT NULL,
    [id_mau]          [int] NOT NULL,
    [id_tieu_chi]     [int] NOT NULL,
    CONSTRAINT [pk_chi_tiet_mau_danh_gia] PRIMARY KEY CLUSTERED ([id_chi_tiet_mau] ASC),
    CONSTRAINT [uq_mau_tieu_chi] UNIQUE NONCLUSTERED ([id_mau] ASC, [id_tieu_chi] ASC)
);
GO

CREATE TABLE [dbo].[chi_tiet_danh_gia](
    [id_chi_tiet]            [int] IDENTITY(1,1) NOT NULL,
    [id_phieu]               [int] NOT NULL,
    [id_tieu_chi]            [int] NOT NULL,
    [cap_danh_gia_snapshot]  [tinyint] NULL,
    [diem_tu_danh_gia]       [decimal](5, 2) NULL,
    [nhan_xet_tu_danh_gia]   [nvarchar](1000) NULL,
    [ngay_tu_danh_gia]       [datetime] NULL,
    [id_thang_diem_chon]     [int] NULL,
    [diem_khoa]              [decimal](5, 2) NULL,
    [nhan_xet_khoa]          [nvarchar](1000) NULL,
    [id_nguoi_dg_khoa]       [int] NULL,
    [ngay_dg_khoa]           [datetime] NULL,
    [diem_truong]            [decimal](5, 2) NULL,
    [nhan_xet_truong]        [nvarchar](1000) NULL,
    [id_nguoi_dg_truong]     [int] NULL,
    [ngay_dg_truong]         [datetime] NULL,
    [diem_chinh_thuc]        [decimal](5, 2) NULL,
    [mo_ta_hoan_thanh]       [nvarchar](2000) NULL,
    [la_truong_hop_dac_biet] [bit] NULL DEFAULT ((0)),
    [ly_do_dac_biet]         [nvarchar](500) NULL,
    [ngay_tao]               [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_chi_tiet_danh_gia] PRIMARY KEY CLUSTERED ([id_chi_tiet] ASC),
    CONSTRAINT [uq_chi_tiet_unique] UNIQUE NONCLUSTERED ([id_phieu] ASC, [id_tieu_chi] ASC)
);
GO

CREATE TABLE [dbo].[lich_su_trang_thai_phieu](
    [id]                [bigint] IDENTITY(1,1) NOT NULL,
    [id_phieu]          [int] NOT NULL,
    [lan_danh_gia]      [tinyint] NOT NULL,
    [trang_thai_truoc]  [tinyint] NULL,
    [trang_thai_sau]    [tinyint] NOT NULL,
    [hanh_dong]         [tinyint] NOT NULL,
    [cap_thuc_hien]     [tinyint] NULL,
    [id_nguoi_thuc_hien][int] NOT NULL,
    [ly_do]             [nvarchar](1000) NULL,
    [nhan_xet]          [nvarchar](1000) NULL,
    [ngay_thuc_hien]    [datetime] NOT NULL DEFAULT (getdate()),
    CONSTRAINT [pk_lich_su_trang_thai_phieu] PRIMARY KEY CLUSTERED ([id] ASC)
);
GO

CREATE TABLE [dbo].[phe_duyet](
    [id_phe_duyet]        [int] IDENTITY(1,1) NOT NULL,
    [id_phieu]            [int] NOT NULL,
    [lan_danh_gia]        [tinyint] NOT NULL,
    [cap_duyet]           [tinyint] NOT NULL,
    [id_nguoi_duyet]      [int] NOT NULL,
    [id_chuc_vu_snapshot] [int] NULL,
    [trang_thai]          [tinyint] NULL DEFAULT ((1)),
    [nhan_xet]            [nvarchar](1000) NULL,
    [ly_do_tu_choi]       [nvarchar](500) NULL,
    [ngay_duyet]          [datetime] NULL,
    [ngay_tao]            [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_phe_duyet] PRIMARY KEY CLUSTERED ([id_phe_duyet] ASC),
    CONSTRAINT [uq_pd_phieu_lan_cap] UNIQUE NONCLUSTERED ([id_phieu] ASC, [lan_danh_gia] ASC, [cap_duyet] ASC)
);
GO

CREATE TABLE [dbo].[nhat_ky](
    [id_nhat_ky]   [bigint] IDENTITY(1,1) NOT NULL,
    [id_phieu]     [int] NULL,
    [id_nhan_vien] [int] NOT NULL,
    [hanh_dong]    [nvarchar](50) NOT NULL,
    [mo_ta]        [nvarchar](500) NULL,
    [ngay_tao]     [datetime] NULL DEFAULT (getdate()),
    CONSTRAINT [pk_nhat_ky] PRIMARY KEY CLUSTERED ([id_nhat_ky] ASC)
);
GO

CREATE TABLE [dbo].[nhiem_vu_cong_dong](
    [id_nhiem_vu]    [int] IDENTITY(1,1) NOT NULL,
    [id_chi_tiet]    [int] NOT NULL,
    [ten_nhiem_vu]   [nvarchar](500) NOT NULL,
    [id_nhom_nv]     [int] NOT NULL,
    [id_vai_tro]     [int] NOT NULL,
    [diem_snapshot]  [decimal](5, 2) NOT NULL,
    [mo_ta]          [nvarchar](500) NULL,
    [ngay_tao]       [datetime] NULL DEFAULT (getdate()),
    [da_xoa]         [bit] NOT NULL DEFAULT ((0)),
    [ngay_xoa]       [datetime] NULL,
    CONSTRAINT [pk_nhiem_vu_cong_dong] PRIMARY KEY CLUSTERED ([id_nhiem_vu] ASC)
);
GO

CREATE TABLE [dbo].[minh_chung](
    [id_minh_chung]   [int] IDENTITY(1,1) NOT NULL,
    [id_chi_tiet]     [int] NOT NULL,
    [loai_minh_chung] [tinyint] NOT NULL DEFAULT ((1)),
    [ten_hien_thi]    [nvarchar](255) NOT NULL,
    [ten_file_goc]    [nvarchar](255) NULL,
    [duong_dan]       [nvarchar](500) NOT NULL,
    [loai_file]       [nvarchar](50) NULL,
    [kich_thuoc_kb]   [int] NULL,
    [nguoi_tai_len]   [int] NOT NULL,
    [ngay_tai_len]    [datetime] NULL DEFAULT (getdate()),
    [da_xoa]          [bit] NULL DEFAULT ((0)),
    [ngay_xoa]        [datetime] NULL,
    CONSTRAINT [pk_minh_chung] PRIMARY KEY CLUSTERED ([id_minh_chung] ASC)
);
GO

CREATE TABLE [dbo].[lich_su_cham_diem](
    [id_lich_su]        [bigint] IDENTITY(1,1) NOT NULL,
    [id_chi_tiet]       [int] NOT NULL,
    [id_phieu]          [int] NOT NULL,
    [lan_danh_gia]      [tinyint] NOT NULL,
    [cap]               [tinyint] NOT NULL,
    [hanh_dong]         [tinyint] NOT NULL,
    [diem]              [decimal](5, 2) NULL,
    [nhan_xet]          [nvarchar](1000) NULL,
    [id_nguoi_thuc_hien][int] NOT NULL,
    [ngay_thuc_hien]    [datetime] NOT NULL DEFAULT (getdate()),
    CONSTRAINT [pk_lich_su_cham_diem] PRIMARY KEY CLUSTERED ([id_lich_su] ASC)
);
GO

------------------------------------------------------------
-- CHECK CONSTRAINTS
------------------------------------------------------------

ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [chk_ct_cap_snap]    CHECK (([cap_danh_gia_snapshot] IS NULL OR [cap_danh_gia_snapshot] IN (1,2)));
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [chk_ct_diem_ct]     CHECK (([diem_chinh_thuc] >= 0));
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [chk_ct_diem_khoa]   CHECK (([diem_khoa] >= 0));
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [chk_ct_diem_tdg]    CHECK (([diem_tu_danh_gia] >= 0));
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [chk_ct_diem_truong] CHECK (([diem_truong] >= 0));

ALTER TABLE [dbo].[chuc_vu] ADD CONSTRAINT [chk_chuc_vu_tldm]      CHECK (([ty_le_dinh_muc_giang] IS NULL OR ([ty_le_dinh_muc_giang] >= 0 AND [ty_le_dinh_muc_giang] <= 1)));
ALTER TABLE [dbo].[chuc_vu] ADD CONSTRAINT [chk_chuc_vu_tldm_nckh] CHECK (([ty_le_dinh_muc_nckh] IS NULL OR ([ty_le_dinh_muc_nckh] >= 0 AND [ty_le_dinh_muc_nckh] <= 1)));

ALTER TABLE [dbo].[danh_muc_vai_tro_pvcd] ADD CONSTRAINT [chk_vtpvcd_diem] CHECK (([diem_quy_doi] >= 0));

ALTER TABLE [dbo].[dinh_muc_giang_vien] ADD CONSTRAINT [chk_dm_gio_giang] CHECK (([gio_giang_ly_thuyet] >= 0));
ALTER TABLE [dbo].[dinh_muc_giang_vien] ADD CONSTRAINT [chk_dm_gio_nckh]  CHECK (([gio_nckh] >= 0));
ALTER TABLE [dbo].[dinh_muc_giang_vien] ADD CONSTRAINT [chk_dm_gio_pvcd]  CHECK (([gio_pvcd] >= 0));

ALTER TABLE [dbo].[don_vi] ADD CONSTRAINT [chk_cap_don_vi] CHECK (([cap_don_vi] IN (1,2,3)));

ALTER TABLE [dbo].[gio_thuc_hien_gv] ADD CONSTRAINT [chk_gio_giang] CHECK (([gio_giang_thuc_te] >= 0));
ALTER TABLE [dbo].[gio_thuc_hien_gv] ADD CONSTRAINT [chk_gio_nckh]  CHECK (([gio_nckh_thuc_te] >= 0));
ALTER TABLE [dbo].[gio_thuc_hien_gv] ADD CONSTRAINT [chk_nguon_gth] CHECK (([nguon] IN (1,2)));

ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [chk_lscd_cap]  CHECK (([cap] IN (1,2,3)));
ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [chk_lscd_diem] CHECK (([diem] IS NULL OR [diem] >= 0));
ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [chk_lscd_hd]   CHECK (([hanh_dong] IN (1,2,3)));

ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [chk_lstt_cap]      CHECK (([cap_thuc_hien] IS NULL OR [cap_thuc_hien] IN (1,2,3)));
ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [chk_lstt_hd]       CHECK (([hanh_dong] IN (1,2,3,4,5)));
ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [chk_lstt_tt_sau]   CHECK (([trang_thai_sau] IN (1,2,3,4,5)));
ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [chk_lstt_tt_truoc] CHECK (([trang_thai_truoc] IS NULL OR [trang_thai_truoc] IN (1,2,3,4,5)));

ALTER TABLE [dbo].[minh_chung] ADD CONSTRAINT [chk_mc_consistent] CHECK ((([loai_minh_chung] = 1 AND [ten_file_goc] IS NOT NULL AND [loai_file] IS NOT NULL) OR [loai_minh_chung] IN (2,3)));
ALTER TABLE [dbo].[minh_chung] ADD CONSTRAINT [chk_mc_kich_thuoc] CHECK (([kich_thuoc_kb] IS NULL OR [kich_thuoc_kb] > 0));
ALTER TABLE [dbo].[minh_chung] ADD CONSTRAINT [chk_mc_loai]       CHECK (([loai_minh_chung] IN (1,2,3)));

ALTER TABLE [dbo].[nam_danh_gia] ADD CONSTRAINT [chk_ngay_nam]        CHECK (([ngay_bat_dau] < [ngay_ket_thuc]));
ALTER TABLE [dbo].[nam_danh_gia] ADD CONSTRAINT [chk_trang_thai_nam]  CHECK (([trang_thai] IN (1,2,3)));

ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_hsgg] CHECK (([he_so_giam_giang] IS NULL OR ([he_so_giam_giang] >= 0 AND [he_so_giam_giang] <= 1)));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_hsgn] CHECK (([he_so_giam_nckh] IS NULL OR ([he_so_giam_nckh] >= 0 AND [he_so_giam_nckh] <= 1)));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_hsgp] CHECK (([he_so_giam_pvcd] IS NULL OR ([he_so_giam_pvcd] >= 0 AND [he_so_giam_pvcd] <= 1)));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_hsn]  CHECK (([he_so_nckh] IS NULL OR [he_so_nckh] >= 0));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_loai] CHECK (([loai_ngoai_le] >= 1 AND [loai_ngoai_le] <= 8));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_ngay] CHECK (([tu_ngay] IS NULL OR [den_ngay] IS NULL OR [den_ngay] >= [tu_ngay]));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_sggg] CHECK (([so_gio_giam_giang] IS NULL OR [so_gio_giam_giang] >= 0));
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [chk_nldm_sgtn] CHECK (([so_gio_them_nckh] IS NULL OR [so_gio_them_nckh] >= 0));

ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [chk_nv_gioi_tinh]    CHECK (([gioi_tinh] IS NULL OR [gioi_tinh] IN (1,2,3)));
ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [chk_nv_he_so_phu_cap] CHECK (([he_so_phu_cap] IS NULL OR [he_so_phu_cap] >= 0));

ALTER TABLE [dbo].[nhan_vien_chuc_vu] ADD CONSTRAINT [chk_nvcv_ngay] CHECK (([den_ngay] IS NULL OR [den_ngay] >= [tu_ngay]));

ALTER TABLE [dbo].[nhiem_vu_cong_dong] ADD CONSTRAINT [chk_nvcd_diem] CHECK (([diem_snapshot] >= 0));

ALTER TABLE [dbo].[nhom_tieu_chi] ADD CONSTRAINT [chk_loai_nhom] CHECK (([loai_nhom] IN (1,2)));

ALTER TABLE [dbo].[phan_hoi_sinh_vien] ADD CONSTRAINT [chk_diem_phan_hoi] CHECK (([diem_trung_binh] >= 1.00 AND [diem_trung_binh] <= 5.00));

ALTER TABLE [dbo].[phe_duyet] ADD CONSTRAINT [chk_cap_duyet]    CHECK (([cap_duyet] IN (1,2,3)));
ALTER TABLE [dbo].[phe_duyet] ADD CONSTRAINT [chk_trang_thai_pd] CHECK (([trang_thai] IN (1,2,3,4)));

ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_gio_giang_dm_ap]      CHECK (([gio_giang_dinh_muc_ap_dung] IS NULL OR [gio_giang_dinh_muc_ap_dung] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_gio_nckh_dm_ap]       CHECK (([gio_nckh_dinh_muc_ap_dung] IS NULL OR [gio_nckh_dinh_muc_ap_dung] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_gio_pvcd_dm_ap]       CHECK (([gio_pvcd_dinh_muc_ap_dung] IS NULL OR [gio_pvcd_dinh_muc_ap_dung] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_he_so_nckh_ap_dung]   CHECK (([he_so_nckh_ap_dung] IS NULL OR [he_so_nckh_ap_dung] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_lan_danh_gia]         CHECK (([lan_danh_gia] >= 1));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_muc_qd838]            CHECK (([muc_nckhcn_qd838] IS NULL OR [muc_nckhcn_qd838] IN (0,1,2)));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_tong_diem_co_ban]     CHECK (([tong_diem_co_ban] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_tong_diem_tich_luy]   CHECK (([tong_diem_tich_luy] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_tong_diem_vuot_troi]  CHECK (([tong_diem_vuot_troi] >= 0));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_trang_thai_phieu]     CHECK (([trang_thai] IN (1,2,3,4,5)));
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [chk_xep_loai]             CHECK (([xep_loai] IS NULL OR [xep_loai] IN (1,2,3,4)));

ALTER TABLE [dbo].[thang_diem] ADD CONSTRAINT [chk_gia_tri_diem] CHECK (([gia_tri_diem] >= 0));

ALTER TABLE [dbo].[tieu_chi_danh_gia] ADD CONSTRAINT [chk_diem_toi_da_tc]    CHECK (([diem_toi_da] > 0));
ALTER TABLE [dbo].[tieu_chi_danh_gia] ADD CONSTRAINT [chk_loai_thang_diem]   CHECK (([loai_thang_diem] IN (1,2,3,4)));
GO

------------------------------------------------------------
-- FOREIGN KEYS
------------------------------------------------------------

ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [fk_ct_nguoi_kh]   FOREIGN KEY([id_nguoi_dg_khoa])   REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [fk_ct_nguoi_tr]   FOREIGN KEY([id_nguoi_dg_truong]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [fk_ct_phieu]      FOREIGN KEY([id_phieu])           REFERENCES [dbo].[phieu_danh_gia]([id_phieu]) ON DELETE CASCADE;
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [fk_ct_thang_diem] FOREIGN KEY([id_thang_diem_chon]) REFERENCES [dbo].[thang_diem]([id_thang_diem]);
ALTER TABLE [dbo].[chi_tiet_danh_gia] ADD CONSTRAINT [fk_ct_tieu_chi]   FOREIGN KEY([id_tieu_chi])        REFERENCES [dbo].[tieu_chi_danh_gia]([id_tieu_chi]);

ALTER TABLE [dbo].[chi_tiet_mau_danh_gia] ADD CONSTRAINT [fk_ct_mau_mau]      FOREIGN KEY([id_mau])      REFERENCES [dbo].[mau_danh_gia]([id_mau]) ON DELETE CASCADE;
ALTER TABLE [dbo].[chi_tiet_mau_danh_gia] ADD CONSTRAINT [fk_ct_mau_tieu_chi] FOREIGN KEY([id_tieu_chi]) REFERENCES [dbo].[tieu_chi_danh_gia]([id_tieu_chi]);

ALTER TABLE [dbo].[danh_muc_vai_tro_pvcd] ADD CONSTRAINT [fk_vtpvcd_don_vi] FOREIGN KEY([id_don_vi]) REFERENCES [dbo].[don_vi]([id_don_vi]);
ALTER TABLE [dbo].[danh_muc_vai_tro_pvcd] ADD CONSTRAINT [fk_vtpvcd_nam]    FOREIGN KEY([id_nam])    REFERENCES [dbo].[nam_danh_gia]([id_nam]);

ALTER TABLE [dbo].[dinh_muc_giang_vien] ADD CONSTRAINT [fk_dm_chuc_danh] FOREIGN KEY([id_chuc_danh]) REFERENCES [dbo].[chuc_danh_nghe_nghiep]([id_chuc_danh]);
ALTER TABLE [dbo].[dinh_muc_giang_vien] ADD CONSTRAINT [fk_dm_nam]       FOREIGN KEY([id_nam])       REFERENCES [dbo].[nam_danh_gia]([id_nam]);

ALTER TABLE [dbo].[don_vi] ADD CONSTRAINT [fk_don_vi_cha] FOREIGN KEY([id_don_vi_cha]) REFERENCES [dbo].[don_vi]([id_don_vi]);

ALTER TABLE [dbo].[gio_thuc_hien_gv] ADD CONSTRAINT [fk_gth_nam] FOREIGN KEY([id_nam])       REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[gio_thuc_hien_gv] ADD CONSTRAINT [fk_gth_nv]  FOREIGN KEY([id_nhan_vien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [fk_lscd_ct]    FOREIGN KEY([id_chi_tiet])        REFERENCES [dbo].[chi_tiet_danh_gia]([id_chi_tiet]);
ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [fk_lscd_nguoi] FOREIGN KEY([id_nguoi_thuc_hien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[lich_su_cham_diem] ADD CONSTRAINT [fk_lscd_phieu] FOREIGN KEY([id_phieu])           REFERENCES [dbo].[phieu_danh_gia]([id_phieu]) ON DELETE CASCADE;

ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [fk_lstt_nv]    FOREIGN KEY([id_nguoi_thuc_hien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[lich_su_trang_thai_phieu] ADD CONSTRAINT [fk_lstt_phieu] FOREIGN KEY([id_phieu])           REFERENCES [dbo].[phieu_danh_gia]([id_phieu]) ON DELETE CASCADE;

ALTER TABLE [dbo].[mau_danh_gia] ADD CONSTRAINT [fk_mau_nam] FOREIGN KEY([id_nam]) REFERENCES [dbo].[nam_danh_gia]([id_nam]);

ALTER TABLE [dbo].[minh_chung] ADD CONSTRAINT [fk_mc_chi_tiet] FOREIGN KEY([id_chi_tiet])  REFERENCES [dbo].[chi_tiet_danh_gia]([id_chi_tiet]) ON DELETE CASCADE;
ALTER TABLE [dbo].[minh_chung] ADD CONSTRAINT [fk_mc_nguoi]    FOREIGN KEY([nguoi_tai_len]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [fk_nldm_nam]   FOREIGN KEY([id_nam])       REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [fk_nldm_nguoi] FOREIGN KEY([id_nguoi_tao]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[ngoai_le_dinh_muc] ADD CONSTRAINT [fk_nldm_nv]    FOREIGN KEY([id_nhan_vien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [fk_nv_chuc_danh] FOREIGN KEY([id_chuc_danh])        REFERENCES [dbo].[chuc_danh_nghe_nghiep]([id_chuc_danh]);
ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [fk_nv_chuc_vu]   FOREIGN KEY([id_chuc_vu])          REFERENCES [dbo].[chuc_vu]([id_chuc_vu]);
ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [fk_nv_don_vi]    FOREIGN KEY([id_don_vi])           REFERENCES [dbo].[don_vi]([id_don_vi]);
ALTER TABLE [dbo].[nhan_vien] ADD CONSTRAINT [fk_nv_quan_ly]   FOREIGN KEY([id_quan_ly_truc_tiep]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[nhan_vien_chuc_vu] ADD CONSTRAINT [fk_nvcv_cv] FOREIGN KEY([id_chuc_vu])    REFERENCES [dbo].[chuc_vu]([id_chuc_vu]);
ALTER TABLE [dbo].[nhan_vien_chuc_vu] ADD CONSTRAINT [fk_nvcv_nv] FOREIGN KEY([id_nhan_vien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[nhat_ky] ADD CONSTRAINT [fk_nk_nv]    FOREIGN KEY([id_nhan_vien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[nhat_ky] ADD CONSTRAINT [fk_nk_phieu] FOREIGN KEY([id_phieu])     REFERENCES [dbo].[phieu_danh_gia]([id_phieu]);

ALTER TABLE [dbo].[nhiem_vu_cong_dong] ADD CONSTRAINT [fk_nvcd_chi_tiet] FOREIGN KEY([id_chi_tiet]) REFERENCES [dbo].[chi_tiet_danh_gia]([id_chi_tiet]) ON DELETE CASCADE;
ALTER TABLE [dbo].[nhiem_vu_cong_dong] ADD CONSTRAINT [fk_nvcd_nhom]     FOREIGN KEY([id_nhom_nv])  REFERENCES [dbo].[danh_muc_nhom_nhiem_vu]([id_nhom_nv]);
ALTER TABLE [dbo].[nhiem_vu_cong_dong] ADD CONSTRAINT [fk_nvcd_vai_tro]  FOREIGN KEY([id_vai_tro])  REFERENCES [dbo].[danh_muc_vai_tro_pvcd]([id_vai_tro]);

ALTER TABLE [dbo].[nhom_tieu_chi] ADD CONSTRAINT [fk_nhom_cha] FOREIGN KEY([id_nhom_cha]) REFERENCES [dbo].[nhom_tieu_chi]([id_nhom]);

ALTER TABLE [dbo].[phan_hoi_sinh_vien] ADD CONSTRAINT [fk_phsv_nam] FOREIGN KEY([id_nam])       REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[phan_hoi_sinh_vien] ADD CONSTRAINT [fk_phsv_nv]  FOREIGN KEY([id_nhan_vien]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[phe_duyet] ADD CONSTRAINT [fk_pd_chuc_vu_snap] FOREIGN KEY([id_chuc_vu_snapshot]) REFERENCES [dbo].[chuc_vu]([id_chuc_vu]);
ALTER TABLE [dbo].[phe_duyet] ADD CONSTRAINT [fk_pd_nguoi]        FOREIGN KEY([id_nguoi_duyet])      REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[phe_duyet] ADD CONSTRAINT [fk_pd_phieu]        FOREIGN KEY([id_phieu])            REFERENCES [dbo].[phieu_danh_gia]([id_phieu]) ON DELETE CASCADE;

ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_chuc_danh]  FOREIGN KEY([id_chuc_danh])       REFERENCES [dbo].[chuc_danh_nghe_nghiep]([id_chuc_danh]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_chuc_vu]    FOREIGN KEY([id_chuc_vu])         REFERENCES [dbo].[chuc_vu]([id_chuc_vu]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_don_vi]     FOREIGN KEY([id_don_vi])          REFERENCES [dbo].[don_vi]([id_don_vi]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_mau]        FOREIGN KEY([id_mau])             REFERENCES [dbo].[mau_danh_gia]([id_mau]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nam]        FOREIGN KEY([id_nam])             REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nguoi_chot] FOREIGN KEY([id_nguoi_chot])      REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nguoi_kh]   FOREIGN KEY([id_nguoi_dg_khoa])   REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nguoi_mol]  FOREIGN KEY([id_nguoi_mo_lai])    REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nguoi_tr]   FOREIGN KEY([id_nguoi_dg_truong]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[phieu_danh_gia] ADD CONSTRAINT [fk_phieu_nv]         FOREIGN KEY([id_nhan_vien])       REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);

ALTER TABLE [dbo].[thang_diem] ADD CONSTRAINT [fk_thang_diem_tieu_chi] FOREIGN KEY([id_tieu_chi]) REFERENCES [dbo].[tieu_chi_danh_gia]([id_tieu_chi]) ON DELETE CASCADE;

ALTER TABLE [dbo].[tieu_chi_danh_gia] ADD CONSTRAINT [fk_tieu_chi_nam]  FOREIGN KEY([id_nam])  REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[tieu_chi_danh_gia] ADD CONSTRAINT [fk_tieu_chi_nhom] FOREIGN KEY([id_nhom]) REFERENCES [dbo].[nhom_tieu_chi]([id_nhom]);

ALTER TABLE [dbo].[vi_pham_giang_day] ADD CONSTRAINT [fk_vp_nam]   FOREIGN KEY([id_nam])            REFERENCES [dbo].[nam_danh_gia]([id_nam]);
ALTER TABLE [dbo].[vi_pham_giang_day] ADD CONSTRAINT [fk_vp_nguoi] FOREIGN KEY([id_nguoi_ghi_nhan]) REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
ALTER TABLE [dbo].[vi_pham_giang_day] ADD CONSTRAINT [fk_vp_nv]    FOREIGN KEY([id_nhan_vien])      REFERENCES [dbo].[nhan_vien]([id_nhan_vien]);
GO

------------------------------------------------------------
-- INDEX
------------------------------------------------------------

CREATE NONCLUSTERED INDEX [ix_dm_chuc_danh_nam] ON [dbo].[dinh_muc_giang_vien]([id_chuc_danh] ASC, [id_nam] ASC);

CREATE NONCLUSTERED INDEX [ix_vtpvcd_don_vi_nam] ON [dbo].[danh_muc_vai_tro_pvcd]([id_don_vi] ASC, [id_nam] ASC) WHERE ([trang_thai] = 1);

CREATE NONCLUSTERED INDEX [ix_tieu_chi_nhom] ON [dbo].[tieu_chi_danh_gia]([id_nhom] ASC, [trang_thai] ASC);

CREATE NONCLUSTERED INDEX [ix_nv_chuc_danh] ON [dbo].[nhan_vien]([id_chuc_danh] ASC) WHERE ([id_chuc_danh] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_nv_chuc_vu]   ON [dbo].[nhan_vien]([id_chuc_vu] ASC)   WHERE ([id_chuc_vu] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_nv_don_vi]    ON [dbo].[nhan_vien]([id_don_vi] ASC, [trang_thai] ASC);
CREATE NONCLUSTERED INDEX [ix_nv_science_uid] ON [dbo].[nhan_vien]([science_user_id] ASC) WHERE ([science_user_id] IS NOT NULL);
CREATE UNIQUE NONCLUSTERED INDEX [ux_nhan_vien_science_user_not_null] ON [dbo].[nhan_vien]([science_user_id] ASC) WHERE ([science_user_id] IS NOT NULL);

CREATE NONCLUSTERED INDEX [ix_vp_nv_nam] ON [dbo].[vi_pham_giang_day]([id_nhan_vien] ASC, [id_nam] ASC);

CREATE NONCLUSTERED INDEX [ix_phsv_nv_nam] ON [dbo].[phan_hoi_sinh_vien]([id_nhan_vien] ASC, [id_nam] ASC);

CREATE NONCLUSTERED INDEX [ix_nvcv_chuc_vu] ON [dbo].[nhan_vien_chuc_vu]([id_chuc_vu] ASC);
CREATE NONCLUSTERED INDEX [ix_nvcv_nv_ngay] ON [dbo].[nhan_vien_chuc_vu]([id_nhan_vien] ASC, [tu_ngay] ASC, [den_ngay] ASC);

CREATE NONCLUSTERED INDEX [ix_gth_nv_nam] ON [dbo].[gio_thuc_hien_gv]([id_nhan_vien] ASC, [id_nam] ASC);

CREATE NONCLUSTERED INDEX [ix_nldm_loai]   ON [dbo].[ngoai_le_dinh_muc]([loai_ngoai_le] ASC)                WHERE ([trang_thai] = 1);
CREATE NONCLUSTERED INDEX [ix_nldm_nv_nam] ON [dbo].[ngoai_le_dinh_muc]([id_nhan_vien] ASC, [id_nam] ASC)   WHERE ([trang_thai] = 1);

CREATE NONCLUSTERED INDEX [ix_thang_diem_tc] ON [dbo].[thang_diem]([id_tieu_chi] ASC);

CREATE NONCLUSTERED INDEX [ix_phieu_chuc_vu]    ON [dbo].[phieu_danh_gia]([id_chuc_vu] ASC)         WHERE ([id_chuc_vu] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_phieu_don_vi]     ON [dbo].[phieu_danh_gia]([id_don_vi] ASC, [id_nam] ASC);
CREATE NONCLUSTERED INDEX [ix_phieu_nam_nv]     ON [dbo].[phieu_danh_gia]([id_nam] ASC, [id_nhan_vien] ASC);
CREATE NONCLUSTERED INDEX [ix_phieu_nguoi_kh]   ON [dbo].[phieu_danh_gia]([id_nguoi_dg_khoa] ASC)   WHERE ([id_nguoi_dg_khoa] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_phieu_nguoi_tr]   ON [dbo].[phieu_danh_gia]([id_nguoi_dg_truong] ASC) WHERE ([id_nguoi_dg_truong] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_phieu_trang_thai] ON [dbo].[phieu_danh_gia]([trang_thai] ASC, [id_nam] ASC);
CREATE NONCLUSTERED INDEX [ix_phieu_xep_loai]   ON [dbo].[phieu_danh_gia]([id_nam] ASC, [xep_loai] ASC) WHERE ([xep_loai] IS NOT NULL);

CREATE NONCLUSTERED INDEX [ix_ct_phieu]    ON [dbo].[chi_tiet_danh_gia]([id_phieu] ASC);
CREATE NONCLUSTERED INDEX [ix_ct_tieu_chi] ON [dbo].[chi_tiet_danh_gia]([id_tieu_chi] ASC);

CREATE NONCLUSTERED INDEX [ix_lstt_phieu] ON [dbo].[lich_su_trang_thai_phieu]([id_phieu] ASC, [ngay_thuc_hien] DESC);

CREATE NONCLUSTERED INDEX [ix_pd_nguoi] ON [dbo].[phe_duyet]([id_nguoi_duyet] ASC, [trang_thai] ASC);
CREATE NONCLUSTERED INDEX [ix_pd_phieu] ON [dbo].[phe_duyet]([id_phieu] ASC, [lan_danh_gia] ASC, [cap_duyet] ASC);

CREATE NONCLUSTERED INDEX [ix_nk_phieu] ON [dbo].[nhat_ky]([id_phieu] ASC, [ngay_tao] DESC);

CREATE NONCLUSTERED INDEX [ix_nvcd_chi_tiet_active] ON [dbo].[nhiem_vu_cong_dong]([id_chi_tiet] ASC) WHERE ([da_xoa] = 0);
CREATE NONCLUSTERED INDEX [ix_nvcd_ct]       ON [dbo].[nhiem_vu_cong_dong]([id_chi_tiet] ASC);
CREATE NONCLUSTERED INDEX [ix_nvcd_vai_tro]  ON [dbo].[nhiem_vu_cong_dong]([id_vai_tro] ASC);

CREATE NONCLUSTERED INDEX [ix_mc_ct] ON [dbo].[minh_chung]([id_chi_tiet] ASC) WHERE ([da_xoa] = 0);

CREATE NONCLUSTERED INDEX [ix_lscd_ct_lan] ON [dbo].[lich_su_cham_diem]([id_chi_tiet] ASC, [lan_danh_gia] ASC, [ngay_thuc_hien] ASC);
CREATE NONCLUSTERED INDEX [ix_lscd_phieu]  ON [dbo].[lich_su_cham_diem]([id_phieu] ASC, [lan_danh_gia] ASC);
GO
