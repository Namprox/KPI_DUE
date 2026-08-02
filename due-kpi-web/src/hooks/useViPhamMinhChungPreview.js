import { useState, useRef, useEffect, useCallback } from 'react';
import {
    createViPhamMinhChungUrl,
    downloadViPhamMinhChung,
} from '../utils/viPhamMinhChungApi';

/**
 * Trạng thái xem trước minh chứng PDF của một vi phạm.
 *
 * API nằm khác origin và xác thực bằng cookie nên không trỏ thẳng <iframe src> vào
 * endpoint được: phải tải blob qua apiFetch rồi nhúng bằng object URL, đồng thời tự
 * thu hồi URL đó khi đóng modal / đổi tệp / rời trang.
 *
 * @param {(message: string) => void} [onError] hiển thị lỗi tải tệp về máy (toast)
 */
export const useViPhamMinhChungPreview = (onError) => {
    const [preview, setPreview] = useState({
        isOpen: false,
        item: null,
        url: null,
        isLoading: false,
        error: null,
    });

    // Bản ghi đang xem, dùng để bỏ kết quả của lượt tải đã bị thay thế
    const previewItemRef = useRef(null);
    // Giữ object URL ngoài state để thu hồi được kể cả khi component unmount
    const previewUrlRef = useRef(null);
    // Giữ callback trong ref để openPreview/closePreview không đổi định danh mỗi render
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const releasePreviewUrl = () => {
        if (previewUrlRef.current) {
            window.URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    };

    // Thu hồi blob nếu người dùng rời trang khi modal còn mở
    useEffect(
        () => () => {
            if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
        },
        []
    );

    const openPreview = useCallback(async (item) => {
        if (!item?.IdViPham || !item?.MinhChung) return;

        releasePreviewUrl();
        previewItemRef.current = item;
        setPreview({ isOpen: true, item, url: null, isLoading: true, error: null });

        try {
            const url = await createViPhamMinhChungUrl(item.IdViPham);
            // Đã đóng modal hoặc mở tệp khác trong lúc chờ → bỏ blob vừa tạo
            if (previewItemRef.current !== item) {
                window.URL.revokeObjectURL(url);
                return;
            }
            previewUrlRef.current = url;
            setPreview((prev) => ({ ...prev, url, isLoading: false }));
        } catch (error) {
            console.error('Lỗi xem trước tệp minh chứng:', error);
            if (previewItemRef.current !== item) return;
            setPreview((prev) => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Không mở được tệp minh chứng',
            }));
        }
    }, []);

    const closePreview = useCallback(() => {
        previewItemRef.current = null;
        releasePreviewUrl();
        setPreview({ isOpen: false, item: null, url: null, isLoading: false, error: null });
    }, []);

    const downloadMinhChung = useCallback(async (item) => {
        if (!item?.IdViPham || !item?.MinhChung) return;
        try {
            await downloadViPhamMinhChung(item.IdViPham, item.MinhChung.TenFileGoc);
        } catch (error) {
            console.error('Lỗi tải tệp minh chứng:', error);
            if (onErrorRef.current) {
                onErrorRef.current(error.message || 'Không tải được tệp minh chứng');
            }
        }
    }, []);

    return { preview, openPreview, closePreview, downloadMinhChung };
};
