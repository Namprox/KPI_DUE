import React from "react";

/** Khung minh chứng chung; việc tải và lưu tệp vẫn do từng phiếu xử lý. */
const TieuChiMinhChung = ({
  children,
  soMinhChung = 0,
}) => {
  return (
    <div className="pl2-evidence">
      <div className="pl2-evidence-content">
        <div className="pl2-evidence-heading">
          <span className="pl2-field-label">Tệp minh chứng</span>
          <span className="pl2-evidence-count">
            {soMinhChung > 0
              ? `${soMinhChung} minh chứng đã đính kèm`
              : "Chưa có tệp"}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
};

export default TieuChiMinhChung;
