import React, { useState, useMemo } from "react";
import DanhGiaNhanVienForm from "../../components/DanhGia/DanhGiaNhanVien/DanhGiaNhanVienForm";
import "../../css/Pages.css";

const MOCK_CRITERIA_FULL = [
  { IdTieuChi: 101, TenTieuChi: "Hoàn thành công việc theo đúng kế hoạch, nhiệm vụ được phân công đối với từng vị trí việc làm và đảm bảo độ chính xác trong công việc", DiemToiDa: 70, LoaiNhom: 1, TenNhomCha: "I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản", MoTa: "- Đúng kế hoạch, không trễ hạn, báo cáo đầy đủ: 70 điểm.\n- Vi phạm trễ hạn: trừ tối thiểu 5 điểm/lần.\n- Sai sót trong quá trình thực hiện: trừ tối thiểu 10 điểm/lần.\n- Vi phạm không hoàn thành: trừ tối thiểu 20 điểm/lần." },
  { IdTieuChi: 102, TenTieuChi: "Tuân thủ các quy định về giờ giấc, tác phong làm việc", DiemToiDa: 30, LoaiNhom: 1, TenNhomCha: "I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản", MoTa: "- Tuân thủ nghiêm túc,đầy đủ: 30 điểm.\n- Đi làm muộn: trừ 01 điểm/lần.\n- Tự ý nghỉ làm và không có Đơn xin phép: trừ 5 điểm/lần.\n- Làm hư hỏng tài sản (không đền bù): trừ tối thiểu 5 điểm/lần.\n- Vi phạm về đạo đức/thái độ: trừ 5 đến 10 điểm/lần." },
  { IdTieuChi: 201, TenTieuChi: "Có sáng kiến, cải tiến công việc được công nhận", DiemToiDa: 20, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "- Sáng kiến cấp Bộ trở lên: 20 điểm/sáng kiến.\n- Sáng kiến cấp Trường: 10 điểm/sáng kiến.\n- Cải tiến công việc tại đơn vị: 5 điểm/lần." },
  { IdTieuChi: 202, TenTieuChi: "Được khen thưởng đột xuất vì thành tích (thi đua, đổi mới, sáng tạo, cống hiến…)", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "- Khen thưởng từ cấp Bộ trở lên: 15 điểm.\n- Khen thưởng cấp ĐHĐN, thành phố: 10 điểm.\n- Khen thưởng cấp Trường: 5 điểm." },
  { IdTieuChi: 203, TenTieuChi: "Hoàn thành chương trình đào tạo, bồi dưỡng chuyên môn, nâng chuẩn năng lực số, ngoại ngữ, tin học…", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "- Khóa học <1 tuần: 2 điểm/minh chứng.\n- Khóa học >1 tháng: 5 điểm/minh chứng.\n- Khóa học dài ngày >1 năm: 10 điểm/minh chứng.\n- Tổ chức workshop chia sẻ kiến thức: 5 điểm/workshop." },
  { IdTieuChi: 204, TenTieuChi: "Tham gia hoặc tổ chức chương trình, phong trào của Trường; Góp phần quảng bá hình ảnh, giá trị tốt đẹp của Nhà trường đến xã hội", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "- Thành phần Ban Tổ chức: 5 điểm/lần; tham gia: 2 điểm/lần.\n- Không tham gia khi được yêu cầu: Trừ 5 điểm/lần.\n- Được truyền thông, biểu dương: 5 điểm/lần." },
  { IdTieuChi: 301, TenTieuChi: "Chính trị, tư tưởng (chấp hành chủ trương, đường lối, chính sách của Đảng và pháp luật của Nhà nước)", DiemToiDa: 0, LoaiNhom: 3, TenNhomCha: "III. Chấp hành quy định", MoTa: "Vi phạm trong việc chấp hành chủ trương, đường lối, quy định của Đảng, chính sách, pháp luật của Nhà nước: bị trừ tối thiểu 10 điểm/lần." },
];

const DanhGiaNhanVien = () => {
  const [formData, setFormData] = useState({});

  const handleScoreChange = (idTieuChi, score) => {
    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: { ...prev[idTieuChi], DiemTuDanhGia: score },
    }));
  };

  const handleTextChange = (idTieuChi, text) => {
    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: { ...prev[idTieuChi], MoTaHoanThanh: text },
    }));
  };

  const tongDiem = useMemo(() => {
    return Object.values(formData).reduce((sum, item) => sum + (Number(item.DiemTuDanhGia) || 0), 0);
  }, [formData]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
          ĐÁNH GIÁ KPI VIÊN CHỨC / NGƯỜI LAO ĐỘNG
        </h2>
        <span className="breadcrumb">Phụ lục 3 - Chế độ dùng thử (Mock Data Đầy đủ)</span>
      </div>

      <div className="phu-luc-2-content">
        <DanhGiaNhanVienForm
          criteriaList={MOCK_CRITERIA_FULL}
          formData={formData}
          tongDiemTichLuy={tongDiem}
          onScoreChange={handleScoreChange}
          onTextChange={handleTextChange}
        />
      </div>

      <div style={{ padding: "20px", display: "flex", justifyContent: "center", gap: "10px", backgroundColor: "#fff", marginTop: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <button className="btn-cancel"><i className="fa-solid fa-floppy-disk"></i> Lưu nháp (Mock)</button>
        <button className="btn-submit"><i className="fa-solid fa-paper-plane"></i> Nộp phiếu (Mock)</button>
      </div>
    </div>
  );
};

export default DanhGiaNhanVien;