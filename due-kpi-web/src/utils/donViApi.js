import { apiFetch } from "./api";

let cachedDonViList = null;
let cachedDonViPromise = null;

/**
 * Tải danh mục đơn vị có cache trong bộ nhớ client.
 * Tránh bắn nhiều request `GET donvi` ở các màn hình cùng lúc.
 *
 * @param {boolean} forceRefresh Bắt buộc tải mới từ server
 * @returns {Promise<Array>} Danh sách đơn vị
 */
export const fetchDonViList = async (forceRefresh = false) => {
  if (!forceRefresh && cachedDonViList) return cachedDonViList;
  if (!forceRefresh && cachedDonViPromise) return cachedDonViPromise;

  cachedDonViPromise = (async () => {
    try {
      const res = await apiFetch("donvi");
      if (res.ok) {
        const result = await res.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        cachedDonViList = list;
        return list;
      }
    } catch (err) {
      console.error("Lỗi tải danh mục đơn vị:", err);
    } finally {
      cachedDonViPromise = null;
    }
    return cachedDonViList || [];
  })();

  return cachedDonViPromise;
};

/**
 * Map IdDonVi sang TenDonVi từ danh sách hoặc cache.
 *
 * @param {number|string} idDonVi
 * @param {Array} donViList
 * @returns {string}
 */
export const getTenDonViFromList = (donViList, idDonVi) => {
  if (idDonVi == null || idDonVi === "") return "";
  const numId = Number(idDonVi);
  const found = (donViList || []).find(
    (d) => (d.IdDonVi ?? d.id_don_vi) === numId,
  );
  return found
    ? found.TenDonVi || found.ten_don_vi
    : `Đơn vị #${idDonVi}`;
};
