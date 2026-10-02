import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MinhChungNhiemVuBox from "./MinhChungNhiemVuBox";
import { themMinhChungNhiemVu } from "../../utils/nhiemVuKhoaApi";

jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  themMinhChungNhiemVu: jest.fn(),
}));

const pdf = new File(["%PDF-1.4"], "ke-hoach.pdf", {
  type: "application/pdf",
});
let props;
beforeEach(() => {
  jest.clearAllMocks();
  props = {
    choPhepSua: true,
    onChange: jest.fn(),
    onHangChoChange: jest.fn(),
    onError: jest.fn(),
    onSuccess: jest.fn(),
  };
});

const chonTep = (file = pdf) =>
  fireEvent.change(screen.getByLabelText("Chọn tệp minh chứng"), {
    target: { files: [file] },
  });

test("chọn tệp sẽ đưa vào hàng chờ của nhiệm vụ mới", () => {
  render(<MinhChungNhiemVuBox {...props} />);
  chonTep();
  expect(props.onHangChoChange).toHaveBeenCalledWith([
    expect.objectContaining({ file: pdf }),
  ]);
  expect(themMinhChungNhiemVu).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /^Tải lên$/ })).toBeNull();
});

test("tải ngay khi chọn tệp, giữ minh chứng cũ và khóa khung khi đang tải", async () => {
  let hoanTat;
  themMinhChungNhiemVu.mockReturnValueOnce(
    new Promise((resolve) => {
      hoanTat = resolve;
    }),
  );
  const cu = { IdMinhChungNvk: 1, TenFileGoc: "cu.pdf" };
  const moi = { IdMinhChungNvk: 2, TenFileGoc: pdf.name };
  render(<MinhChungNhiemVuBox {...props} idNhiemVu={7} danhSach={[cu]} />);
  chonTep();
  expect(themMinhChungNhiemVu).toHaveBeenCalledWith(7, pdf, "", undefined);
  expect(screen.getByRole("button", { name: /Đang tải lên/ })).toBeDisabled();
  hoanTat(moi);
  await waitFor(() => expect(props.onChange).toHaveBeenCalledWith([cu, moi]));
  expect(screen.getByRole("button", { name: /Bấm để chọn tệp/ })).toBeEnabled();
});

test("chặn tệp sai trước khi tự động tải lên", () => {
  render(<MinhChungNhiemVuBox {...props} idNhiemVu={7} />);
  chonTep(new File(["text"], "note.txt", { type: "text/plain" }));
  expect(props.onError).toHaveBeenCalledWith("Chỉ chấp nhận tệp PDF");
  expect(themMinhChungNhiemVu).not.toHaveBeenCalled();
  expect(props.onHangChoChange).not.toHaveBeenCalled();
});

test("sau lỗi tải có thể chọn lại cùng tệp để thử lại", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    themMinhChungNhiemVu.mockRejectedValueOnce(new Error("Lỗi tải tệp"));
    render(<MinhChungNhiemVuBox {...props} idNhiemVu={7} />);
    chonTep();
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledWith("Lỗi tải tệp"),
    );
    expect(
      screen.getByRole("button", { name: /Bấm để chọn tệp/ }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Chọn tệp minh chứng")).toHaveValue("");
    themMinhChungNhiemVu.mockResolvedValueOnce({ IdMinhChungNvk: 2 });
    chonTep();
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
    expect(themMinhChungNhiemVu).toHaveBeenCalledTimes(2);
  } finally {
    log.mockRestore();
  }
});
