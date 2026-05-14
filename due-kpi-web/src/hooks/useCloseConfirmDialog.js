import { confirmDialog } from "primereact/confirmdialog";
import { useCallback } from "react";

export const useCloseConfirmDialog = () => {
    const confirmCloseDialog = useCallback((onAccept) => {
        confirmDialog({
            message: "Bạn có dữ liệu chưa được lưu. Bạn có chắc chắn muốn đóng cửa sổ?",
            header: "Xác nhận đóng",
            icon: "pi pi-info-circle",
            acceptLabel: "Đồng ý",
            acceptIcon: "pi pi-check",
            rejectLabel: "Hủy",
            rejectIcon: "pi pi-times",
            acceptClassName: "p-button-primary",
            rejectClassName: "p-button-secondary p-button-outlined",
            defaultFocus: "reject",
            accept: onAccept,
        });
    }, []);
    return { confirmCloseDialog };
};