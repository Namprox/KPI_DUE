import React from "react";
import "../../css/ObjectTabs.css";

export const OBJECT_TYPES = [
  { key: "1", label: "Giảng viên", enabled: true },
  { key: "2", label: "Nhân viên", enabled: true },
  { key: "3", label: "Khoa/Bộ môn", enabled: true },
  { key: "4", label: "Phòng/Trung tâm", enabled: true },
];

const ObjectTabs = ({ currentType, onChange }) => {
  return (
    <div className="object-tabs-container">
      {OBJECT_TYPES.map((tab) => {
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
