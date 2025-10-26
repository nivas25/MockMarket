"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./GlassConfirm.module.css";

export type GlassConfirmProps = {
  open: boolean;
  title?: string;
  message?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void; // called when user cancels/closes
};

const GlassConfirm: React.FC<GlassConfirmProps> = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gc-title"
        aria-describedby="gc-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id="gc-title" className={styles.title}>
            {title}
          </h3>
        </div>
        <div id="gc-desc" className={styles.body}>
          {" "}
          {message}{" "}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={styles.confirmBtn}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlassConfirm;
