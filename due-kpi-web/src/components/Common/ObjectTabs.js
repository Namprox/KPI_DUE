import React from "react";
import "../../css/ObjectTabs.css";

export const OBJECT_TYPES = [
  { key: "1", label: "Giảng viên", enabled: true },
  { key: "2", label: "Nhân viên", enabled: true },
  { key: "3", label: "Khoa/Bộ môn", enabled: true },
  { key: "4", label: "Phòng/Trung tâm", enabled: true },
];

/**
 * @param {Array} types tập tab muốn hiện - mặc định cả 4 loại đối tượng.
 *   Màn hình chỉ phục vụ một phần (VD danh mục vi phạm chỉ có 1 & 2) truyền
 *   danh sách đã lọc để người dùng không mở được tab không có dữ liệu.
 */
const ObjectTabs = ({ currentType, onChange, types = OBJECT_TYPES }) => {
  return (
    <div className="object-tabs-container">
      {types.map((tab) => {
        const isActive = tab.key === currentType;
        const isDisabled = !tab.enabled;
        return (
          <button
            key={tab.key}
            type="button"
            className={`object-tab-button ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
            onClick={() => {
              if (!isDisabled && onChange) {
                onChange(tab.key);
              }
            }}
            disabled={isDisabled}
          >
            <span className="tab-label">{tab.label}</span>
            {isDisabled && <span className="coming-soon-badge">...</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ObjectTabs;
