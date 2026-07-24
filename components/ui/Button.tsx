import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FOCUS_RING, NAVY } from "./tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-11 px-4 text-[12px] sm:min-h-9 sm:px-4",
  md: "min-h-11 px-6 text-[14px]",
  lg: "min-h-12 px-8 text-base sm:min-h-[3.25rem]",
};

function variantClass(variant: Variant): string {
  switch (variant) {
    case "secondary":
      return "border border-[color:var(--sw-gold)]/30 bg-[var(--sw-card-bg)] text-[color:var(--sw-gold)] hover:bg-[color:var(--sw-surface-warm)] active:bg-[color:var(--sw-surface)]";
    case "ghost":
      return "border border-transparent bg-transparent text-[color:var(--sw-muted)] hover:bg-[color:var(--sw-navy)]/[0.04] active:bg-[color:var(--sw-navy)]/[0.07]";
    case "danger":
      return "border border-transparent bg-[color:var(--sw-danger)] text-white hover:opacity-92 active:opacity-88";
    default:
      return "border border-transparent text-white hover:opacity-92 active:opacity-88";
  }
}

const baseClass = `sw-btn inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[opacity,transform,background-color,box-shadow] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${FOCUS_RING}`;

export default function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  style,
  disabled,
  type,
  ...rest
}: Props) {
  const classes = `${baseClass} ${sizeClass[size]} ${variantClass(variant)} ${className}`;
  const mergedStyle =
    variant === "primary"
      ? { backgroundColor: NAVY, ...style }
      : style;

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} style={mergedStyle}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={classes}
      style={mergedStyle}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
