import { apiFetch, NETWORK_ERROR_MESSAGE } from "./api";

afterEach(() => {
  delete global.fetch;
});

test("mất kết nối trả thông điệp tiếng Việt thay cho Failed to fetch", async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(apiFetch("hoat-dong-dao-tao/quyen")).rejects.toMatchObject({
    message: NETWORK_ERROR_MESSAGE,
    isNetworkError: true,
  });
});

test("giữ nguyên AbortError để bên gọi bỏ qua request đã hủy", async () => {
  const abort = Object.assign(new Error("The user aborted a request."), { name: "AbortError" });
  global.fetch = jest.fn().mockRejectedValue(abort);
  await expect(apiFetch("hoat-dong-dao-tao")).rejects.toBe(abort);
});
