"use client";

import { useEffect, type ReactNode } from "react";
import { NAVY } from "./tokens";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Accessible label when title is omitted */
  ariaLabel?: string;
};

/**
 * Modal — shared dialog shell for confirmations and forms.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  ariaLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className="w-full max-w-lg rounded-[var(--sw-card-radius)] border border-[color:var(--sw-border)] bg-[color:var(--sw-card-bg)] p-5 shadow-[var(--sw-card-shadow)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2
            className="mb-4 break-words text-lg font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            {title}
          </h2>
        ) : null}
        <div className="text-sm text-slate-700">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
