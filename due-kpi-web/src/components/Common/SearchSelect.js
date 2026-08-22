import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import "../../css/select.css";

const PANEL_MAX_HEIGHT = 300;

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

// Ô ẩn giữ lại kiểm tra "required" của form gốc; phải có kích thước thật
// thì trình duyệt mới hiện được thông báo lỗi.
const requiredInputStyle = {
  position: "absolute",
  bottom: 0,
  left: "50%",
  width: "1px",
  height: "1px",
  padding: 0,
  border: 0,
  opacity: 0,
  pointerEvents: "none",
};

export default function SearchSelect({
  value,
  options = [],
  onChange,
  placeholder = "-- Chọn --",
  searchable = false,
  searchPlaceholder = "Nhập từ khóa...",
  emptyText = "Không tìm thấy kết quả",
  disabled = false,
  invalid = false,
  clearable = false,
  required = false,
  name,
  className = "",
  portal = false,
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [viTri, setViTri] = useState(null);

  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value ?? ""));

  const filtered = useMemo(() => {
    const k = searchable ? keyword.trim().toLowerCase() : "";
    if (!k) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(k));
  }, [keyword, options, searchable]);

  // đóng khi bấm ra ngoài (bảng chọn bung ra body nên phải xét cả hai vùng)
  useEffect(() => {
    const onDocDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // reset và focus ô tìm kiếm mỗi lần mở
  useEffect(() => {
    if (!open) return;
    setKeyword("");
    setActive(Math.max(0, filtered.findIndex((o) => o === selected)));
    if (!searchable) return;
    const id = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // thiếu chỗ bên dưới thì bung lên trên để không bị hộp thoại cắt mất
  const doViTri = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    // Ở chế độ portal, ô cuộn cha không còn cắt được bảng chọn nữa nên chỗ
    // trống phải đo theo cửa sổ, không đo theo ô cuộn.
    const clip = portal
      ? { top: 0, bottom: window.innerHeight }
      : getClippingRect(wrapRef.current);
    const spaceBelow = clip.bottom - rect.bottom;
    const spaceAbove = rect.top - clip.top;
    const len = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    setDropUp(len);
    if (!portal) return;
    setViTri({
      left: rect.left,
      width: rect.width,
      top: len ? undefined : rect.bottom + 4,
      bottom: len ? window.innerHeight - rect.top + 4 : undefined,
    });
  }, [portal]);

  useLayoutEffect(() => {
    if (!open) return;
    doViTri();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Bảng chọn nằm ngoài luồng cuộn của trang: không bám lại thì nó sẽ "trôi"
  // khỏi ô chọn ngay khi người dùng cuộn bảng hoặc đổi cỡ cửa sổ.
  useEffect(() => {
    if (!open || !portal) return;
    const doLai = () => doViTri();
    window.addEventListener("scroll", doLai, true);
    window.addEventListener("resize", doLai);
    return () => {
      window.removeEventListener("scroll", doLai, true);
      window.removeEventListener("resize", doLai);
    };
  }, [open, portal, doViTri]);

  // giữ dòng đang chọn trong tầm nhìn
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (opt) => {
    if (opt.disabled) return;
    onChange?.(opt.value, opt);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[active]) pick(filtered[active]);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const classes = [
    "select-wrap",
    open ? "is-open" : "",
    disabled ? "is-disabled" : "",
    invalid ? "is-invalid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bangChon = (
    <div
      ref={panelRef}
      className={`select-panel${dropUp ? " is-up" : ""}${portal ? " is-portal" : ""}`}
      style={
        portal && viTri
          ? { ...viTri, position: "fixed", right: "auto" }
          : undefined
      }
    >
      {searchable && (
        <div className="select-search-box">
          <input
            ref={searchRef}
            className="select-search"
            value={keyword}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setKeyword(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="select-no-result">{emptyText}</div>
      ) : (
        <ul className="select-options" role="listbox" ref={listRef}>
          {filtered.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={o === selected}
              title={String(o.label)}
              className={[
                "select-option",
                o === selected ? "is-selected" : "",
                i === active ? "is-active" : "",
                o.disabled ? "is-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              {o.label}
              {o.note && <span className="select-option-note">{o.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className={classes} ref={wrapRef}>
      <div
        className="select-control"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
      >
        <span
          className={`select-value${selected ? "" : " is-placeholder"}`}
          title={selected ? String(selected.label) : ""}
        >
          {selected ? selected.label : placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            className="select-clear"
            role="button"
            aria-label="Xóa lựa chọn"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.("", null);
            }}
          >
            ×
          </span>
        )}
        <i className="select-arrow" aria-hidden="true"></i>
      </div>

      {required && !disabled && (
        <input
          type="text"
          name={name}
          tabIndex={-1}
          required
          value={value ?? ""}
          onChange={() => {}}
          onFocus={() => setOpen(true)}
          style={requiredInputStyle}
        />
      )}

      {open && (portal ? createPortal(bangChon, document.body) : bangChon)}
    </div>
  );
}
