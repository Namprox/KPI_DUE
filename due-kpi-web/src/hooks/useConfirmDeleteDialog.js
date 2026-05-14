import { confirmDialog } from "primereact/confirmdialog";

export const useConfirmDeleteDialog = () => {
    const confirmDeleteDialog = ({ message, header, accept }) => {
        confirmDialog({
            header,
            message,
            icon: "pi pi-exclamation-triangle",
            acceptLabel: "Xóa",
            acceptIcon: "pi pi-trash",
            rejectLabel: "Hủy",
            rejectIcon: "pi pi-times",
            acceptClassName: "p-button-danger",
            rejectClassName: "p-button-secondary p-button-outlined",
            accept,
        });
    };
    return { confirmDeleteDialog };
};