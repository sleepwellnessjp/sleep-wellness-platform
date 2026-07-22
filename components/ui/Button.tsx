import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NAVY } from "./tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-9 px-4 text-[12px]",
  md: "min-h-11 px-6 text-[14px]",
  lg: "min-h-12 px-8 text-base",
};

function variantClass(variant: Variant): string {
  switch (variant) {
    case "secondary":
      return "border border-[#8a6a2d]/30 bg-white text-[#8a6a2d] hover:bg-[#faf7f1]";
    case "ghost":
      return "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100/80";
    case "danger":
      return "border border-transparent bg-[#a33a3a] text-white hover:opacity-90";
    default:
      return "border border-transparent text-white hover:opacity-92";
  }
}

export default function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  style,
  disabled,
  ...rest
}: Props) {
  const classes = `inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass[size]} ${variantClass(variant)} ${className}`;
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
      type="button"
      className={classes}
      style={mergedStyle}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
