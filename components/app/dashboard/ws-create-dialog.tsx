"use client";

import {
  ChangeEventHandler,
  MouseEventHandler,
  useRef,
  useState,
  useEffect,
} from "react";
import { useActionState } from "react";

import { FaUpload, FaImage } from "react-icons/fa6";

import { MotionDiv } from "@/components/motion-client";
import { useWorkspace } from "@/context/workspace-context";
import { createWorkspace } from "@/lib/server/actions";

import type { Workspace } from "@/types/api";

import modalStyles from "@/styles/app/dashboard/Forms.module.scss";
import { CircularProgress } from "@mui/material";

interface WsCreateDialogProps {
  onClose?: () => void;
}

export default function WsCreateDialog({ onClose }: WsCreateDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");

  const [formState, formAction, isFormPending] = useActionState(createWorkspace, {
    success: false,
    data: { message: "" },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const { fetchWorkspaces, setCurrentWorkspace } = useWorkspace();

  const { success, data } = formState;

  useEffect(() => {
    if (!success) return;

    const newWorkspace = data as Partial<Workspace>;
    let isCancelled = false;

    (async () => {
      try {
        await fetchWorkspaces();

        if (
          !isCancelled &&
          newWorkspace?.id &&
          newWorkspace?.name
        ) {
          const mappedWorkspace: Workspace = {
            id: newWorkspace.id,
            name: newWorkspace.name,
            created_at:
              newWorkspace.created_at ?? new Date().toISOString(),
            updated_at:
              newWorkspace.updated_at ?? new Date().toISOString(),
          };

          setCurrentWorkspace(mappedWorkspace);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to refresh workspace list:", error);
        }
      } finally {
        if (!isCancelled && onClose) {
          onClose();
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [success, data, fetchWorkspaces, setCurrentWorkspace, onClose]);

  const handleDialogClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (onClose && event.target === dialogRef.current && !isFormPending) {
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleImageChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.item(0);

    if (file) {
      const previewUrl = URL.createObjectURL(file);

      setPreview((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });
    }
  };

  return (
    <div
      ref={dialogRef}
      className={modalStyles["form-modal__overlay"]}
      onClick={handleDialogClick}
    >
      <MotionDiv
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className={`${modalStyles["form-modal"]} ${modalStyles["form-modal--workspace"]}`}
      >
        <form
          action={formAction}
          className={modalStyles["form-modal__workspace-form"]}
        >
          <div className={modalStyles["form-modal__header"]}>
            <h4>Create Workspace</h4>
            <button
              type="button"
              className={modalStyles["form-modal__close"]}
              onClick={() => onClose?.()}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={modalStyles["form-modal__workspace-media"]}>
            <div className={modalStyles["form-modal__workspace-preview"]}>
              {preview ? (
                <img
                  src={preview}
                  alt="Workspace preview"
                  className={modalStyles["form-modal__workspace-image"]}
                />
              ) : (
                <FaImage className={modalStyles["form-modal__workspace-icon"]} />
              )}
            </div>

            <button
              type="button"
              className={modalStyles["form-modal__workspace-upload"]}
              onClick={() => inputRef.current?.click()}
            >
              <FaUpload /> Upload Logo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              name="image"
              onChange={handleImageChange}
              className={modalStyles["form-modal__workspace-file-input"]}
            />
          </div>

          <div className={modalStyles["form-modal__workspace-fields"]}>
            <label className={modalStyles["form-modal__label"]} htmlFor="workspace-name">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              placeholder="Workspace Name"
              name="name"
              required
              minLength={3}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={modalStyles["form-modal__input"]}
            />
            {name.trim().length > 0 && name.trim().length < 3 && (
              <p className={modalStyles["form-modal__error"]}>
                Workspace name must be at least 3 characters.
              </p>
            )}
          </div>

          {isFormPending ? (
            <div
              style={{
                margin: "0 auto 0.5rem",
                color: "var(--primary-color)",
              }}
            >
              <CircularProgress color="inherit" thickness={5} size={40} />
            </div>
          ) : (
            <div className={modalStyles["form-modal__actions"]}>
              <button
                className={modalStyles["form-modal__cancel"]}
                onClick={() => onClose?.()}
                type="button"
              >
                Cancel
              </button>
              <button
                className={modalStyles["form-modal__save"]}
                type="submit"
                disabled={isFormPending || name.trim().length < 3}
              >
                Save
              </button>
            </div>
          )}
        </form>
      </MotionDiv>
    </div>
  );
}
