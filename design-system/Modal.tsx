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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2
            className="mb-4 text-lg font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            {title}
          </h2>
        ) : null}
        <div className="text-sm text-slate-700">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
