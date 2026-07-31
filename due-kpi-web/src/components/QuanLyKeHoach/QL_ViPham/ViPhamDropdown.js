import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/* Dropdown thay cho <select> ở các trường có nội dung dài:
   danh sách bung ra luôn bằng bề ngang ô chọn và cho xuống dòng,
   thay vì để trình duyệt kéo giãn popup vượt ra ngoài hộp thoại. */

const PANEL_MAX_HEIGHT = 260;

// Vùng thực sự cắt danh sách: ô cuộn gần nhất (modal-body) hoặc cửa sổ
const getClippingRect = (el) => {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden")
      return node.getBoundingClientRect();
    node = node.parentElement;
  }
  return { top: 0, bottom: window.innerHeight };
};

const controlStyle = {
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  background: "#fff",
  fontSize: "14px",
  textAlign: "left",
  cursor: "pointer",
};

const ViPhamDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "-- Chọn --",
  disabled = false,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef(null);
  const controlRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const isPlaceholder = !selected || String(selected.value) === "";

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setIsOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        controlRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Thiếu chỗ bên dưới thì bung lên trên để không bị hộp thoại cắt mất
  useLayoutEffect(() => {
    if (!isOpen || !controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    const clip = getClippingRect(controlRef.current);
    const spaceBelow = clip.bottom - rect.bottom;
    const spaceAbove = rect.top - clip.top;
    setDropUp(spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current
      ?.querySelector("[data-selected='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen]);

  const handleSelect = (option) => {
    if (option.disabled) return;
    setIsOpen(false);
    controlRef.current?.focus();
    if (String(option.value) !== String(value ?? "")) onChange(option.value);
  };

  const handleControlKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        ref={controlRef}
        data-name={name}
        className="form-input"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleControlKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          ...controlStyle,
          background: disabled ? "#f1f5f9" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          color: isPlaceholder ? "#94a3b8" : "#0f172a",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={selected ? selected.label : ""}
        >
          {isPlaceholder ? placeholder : selected.label}
        </span>
        <i
          className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`}
          style={{ fontSize: "12px", color: "#64748b", flexShrink: 0 }}
        ></i>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            [dropUp ? "bottom" : "top"]: "calc(100% + 4px)",
            maxHeight: `${PANEL_MAX_HEIGHT}px`,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.14)",
          }}
        >
          {options.length === 0 && (
            <div
              style={{ padding: "10px 12px", fontSize: "13px", color: "#94a3b8" }}
            >
              Không có dữ liệu
            </div>
          )}
          {options.map((option) => {
            const isSelected = String(option.value) === String(value ?? "");
            return (
              <div
                key={String(option.value)}
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                onClick={() => handleSelect(option)}
                style={{
                  padding: "9px 12px",
                  fontSize: "14px",
                  lineHeight: "1.45",
                  cursor: option.disabled ? "not-allowed" : "pointer",
                  color: option.disabled ? "#94a3b8" : "#0f172a",
                  background: isSelected ? "#eff6ff" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                  borderBottom: "1px solid #f1f5f9",
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled && !isSelected)
                    e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                {option.label}
                {option.note && (
                  <span style={{ color: "#b91c1c", fontSize: "12px" }}>
                    {" "}
                    {option.note}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViPhamDropdown;
