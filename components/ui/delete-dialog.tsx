// components/ui/DeleteDialog.tsx
"use client";

import { MouseEvent } from "react";
import { MotionDiv } from "@/components/motion-client";
import modalStyles from "@/styles/app/dashboard/Forms.module.scss";

interface DeleteDialogProps {
  message: string;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmOnly?: boolean;
  title?: string;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  message,
  onCancel,
  onConfirm,
  confirmOnly = false,
  title = "Confirm Action",
}) => {
  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className={modalStyles["form-modal__overlay"]}
      onClick={onCancel}
      role="presentation"
    >
      <MotionDiv
        className={`${modalStyles["form-modal"]} ${modalStyles["form-modal--confirm"]}`}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={stopPropagation}
      >
        <div className={modalStyles["form-modal__header"]}>
          <h4>{title}</h4>
          <button
            type="button"
            className={modalStyles["form-modal__close"]}
            onClick={onCancel}
            aria-label="Close confirmation dialog"
          >
            ✕
          </button>
        </div>

        <p className={modalStyles["form-modal__confirm-message"]}>{message}</p>

        <div className={modalStyles["form-modal__actions"]}>
          {!confirmOnly && (
            <button
              type="button"
              className={modalStyles["form-modal__cancel"]}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={modalStyles["form-modal__save"]}
            onClick={() => {
              onConfirm?.();
              onCancel();
            }}
          >
            OK
          </button>
        </div>
      </MotionDiv>
    </div>
  );
};

export default DeleteDialog;
