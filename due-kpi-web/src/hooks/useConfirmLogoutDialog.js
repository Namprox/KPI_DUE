import { confirmDialog } from "primereact/confirmdialog";

export const useConfirmLogoutDialog = () => {
    const confirmLogoutDialog = ({ accept }) => {
        confirmDialog({
            header: "Xác nhận đăng xuất",
            message: "Bạn có chắc chắn muốn thoát khỏi hệ thống?",
            icon: "pi pi-exclamation-triangle",
            acceptLabel: "Đăng xuất",
            acceptIcon: "pi pi-sign-out",
            rejectLabel: "Hủy",
            rejectIcon: "pi pi-times",
            acceptClassName: "p-button-danger",
            rejectClassName: "p-button-secondary p-button-outlined",
            accept,
        });
    };
    return { confirmLogoutDialog };
};