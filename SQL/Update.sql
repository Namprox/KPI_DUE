-- =============================================================================
-- SCRIPT SỬA LỖI UNIQUE CONSTRAINT CHO BẢNG NHÂN VIÊN
-- Tương thích hoàn toàn với SQL Server Management Studio v18
-- =============================================================================

USE DueKpiDB_Update; 
GO

-- Bước 1: Xóa ràng buộc UNIQUE cũ (ràng buộc đang gây ra lỗi trùng NULL)
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'uq_science_user')
BEGIN
    ALTER TABLE nhan_vien DROP CONSTRAINT uq_science_user;
    PRINT N'1. Đã xóa ràng buộc uq_science_user cũ thành công!';
END
ELSE
BEGIN
    PRINT N'1. Ràng buộc uq_science_user không tồn tại hoặc đã được xóa.';
END
GO

-- Bước 2: Tạo Filtered Index mới (Cho phép nhiều giá trị NULL)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_uq_science_user' AND object_id = OBJECT_ID('nhan_vien'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ix_uq_science_user 
    ON nhan_vien(science_user_id) 
    WHERE science_user_id IS NOT NULL;
    PRINT N'2. Đã tạo Filtered Index ix_uq_science_user mới thành công!';
END
ELSE
BEGIN
    PRINT N'2. Index ix_uq_science_user đã tồn tại.';
END
GO