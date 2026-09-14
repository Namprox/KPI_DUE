import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMinhChungDonViPreviewUrl,
  downloadMinhChungDonViFile,
  kieuXemTruoc,
  laMinhChungFile,
} from "../utils/minhChungDonViApi";

/**
 * Trạng thái xem trước / tải về minh chứng của PHIẾU KPI ĐƠN VỊ.
 *
 * Song song với useMinhChungPhieuPreview - cùng hình dạng state, chỉ khác hai hàm
 * tải blob vì endpoint của luồng đơn vị là minh-chung-don-vi/{id}/tai-ve. Tách hook
 * riêng thay vì tham số hóa hook cũ để không đụng tới các màn hình đang dùng nó.
 *
 * @param {(message: string) => void} [onError] hiển thị lỗi tải tệp (toast)
 */
export const useMinhChungDonViPreview = (onError) => {
  const [preview, setPreview] = useState({
    isOpen: false,
    mc: null,
    kieu: null,
    url: null,
    isLoading: false,
    error: null,
  });

  // Minh chứng đang xem, dùng để bỏ kết quả của lượt tải đã bị thay thế
  const mcRef = useRef(null);
  // Giữ object URL ngoài state để thu hồi được kể cả khi component unmount
  const urlRef = useRef(null);
  // Giữ callback trong ref để openPreview/closePreview không đổi định danh mỗi render
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const releaseUrl = () => {
    if (urlRef.current) {
      window.URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  // Thu hồi blob nếu người dùng rời trang khi modal còn mở
  useEffect(
    () => () => {
      if (urlRef.current) window.URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const openPreview = useCallback(async (mc) => {
    if (!mc?.IdMinhChung || !laMinhChungFile(mc)) return;

    releaseUrl();
    mcRef.current = mc;
    // kieu === null: định dạng trình duyệt không hiển thị được → mở modal ở chế độ
    // chỉ tải về, KHÔNG tải blob để tránh tải tệp hai lần.
    const kieu = kieuXemTruoc(mc);
    setPreview({
      isOpen: true,
      mc,
      kieu,
      url: null,
      isLoading: kieu !== null,
      error: null,
    });
    if (kieu === null) return;

    try {
      const url = await createMinhChungDonViPreviewUrl(mc);
      // Đã đóng modal hoặc mở tệp khác trong lúc chờ → bỏ blob vừa tạo
      if (mcRef.current !== mc) {
        window.URL.revokeObjectURL(url);
        return;
      }
      urlRef.current = url;
      setPreview((prev) => ({ ...prev, url, isLoading: false }));
    } catch (error) {
      console.error("Lỗi xem trước minh chứng đơn vị:", error);
      if (mcRef.current !== mc) return;
      setPreview((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Không mở được tệp minh chứng",
      }));
    }
  }, []);

  const closePreview = useCallback(() => {
    mcRef.current = null;
    releaseUrl();
    setPreview({
      isOpen: false,
      mc: null,
      kieu: null,
      url: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const downloadMinhChung = useCallback(async (mc) => {
    if (!mc?.IdMinhChung || !laMinhChungFile(mc)) return;
    try {
      await downloadMinhChungDonViFile(mc);
    } catch (error) {
      console.error("Lỗi tải tệp minh chứng đơn vị:", error);
      if (onErrorRef.current) {
        onErrorRef.current(error.message || "Không tải được tệp minh chứng");
      }
    }
  }, []);

  return { preview, openPreview, closePreview, downloadMinhChung };
};
