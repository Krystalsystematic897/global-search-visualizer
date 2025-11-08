import { cn } from "../../lib/utils";
import type { BadgeProps } from "../../types";

const Badge = ({ children, variant = "default", size = "md" }: BadgeProps) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-green-100 text-green-700 border border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    error: "bg-red-100 text-red-700 border border-red-200",
    info: "bg-blue-100 text-blue-700 border border-blue-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variants[variant],
        sizes[size]
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
