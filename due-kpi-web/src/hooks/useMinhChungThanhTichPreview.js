import { useCallback, useEffect, useRef, useState } from 'react';
import {
  taiMinhChungVeMay,
  taoUrlXemMinhChung,
} from '../utils/keKhaiThanhTichApi';

/**
 * Trạng thái xem trước / tải về minh chứng của module kê khai thành tích.
 *
 * Song song với useMinhChungKeKhaiPreview nhưng khoá theo `IdMinhChungTt` và đi qua
 * endpoint riêng của module. Bỏ hẳn nhánh "định dạng không xem trước được":
 * server chỉ nhận PDF (kiểm cả đuôi file lẫn chữ ký `%PDF-`) nên luôn nhúng được
 * vào iframe.
 *
 * @param {(message: string) => void} [onError] hiển thị lỗi tải tệp (toast)
 */
export const useMinhChungThanhTichPreview = (onError) => {
  const [preview, setPreview] = useState({
    isOpen: false,
    mc: null,
    url: null,
    isLoading: false,
    error: null,
  });

  // Minh chứng đang xem, dùng để bỏ kết quả của lượt tải đã bị thay thế
  const mcRef = useRef(null);
  // Giữ object URL ngoài state để thu hồi được kể cả khi component unmount
  const urlRef = useRef(null);
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
    if (!mc?.IdMinhChungTt) return;

    releaseUrl();
    mcRef.current = mc;
    setPreview({ isOpen: true, mc, url: null, isLoading: true, error: null });

    try {
      const url = await taoUrlXemMinhChung(mc.IdMinhChungTt);
      // Đã đóng modal hoặc mở tệp khác trong lúc chờ → bỏ blob vừa tạo
      if (mcRef.current !== mc) {
        window.URL.revokeObjectURL(url);
        return;
      }
      urlRef.current = url;
      setPreview((prev) => ({ ...prev, url, isLoading: false }));
    } catch (error) {
      console.error('Lỗi xem trước minh chứng kê khai thành tích:', error);
      if (mcRef.current !== mc) return;
      setPreview((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Không mở được tệp minh chứng',
      }));
    }
  }, []);

  const closePreview = useCallback(() => {
    mcRef.current = null;
    releaseUrl();
    setPreview({
      isOpen: false,
      mc: null,
      url: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const downloadMinhChung = useCallback(async (mc) => {
    if (!mc?.IdMinhChungTt) return;
    try {
      await taiMinhChungVeMay(mc);
    } catch (error) {
      console.error('Lỗi tải tệp minh chứng kê khai thành tích:', error);
      if (onErrorRef.current) {
        onErrorRef.current(error.message || 'Không tải được tệp minh chứng');
      }
    }
  }, []);

  return { preview, openPreview, closePreview, downloadMinhChung };
};

export default useMinhChungThanhTichPreview;
