const VARIANTS = {
  primary:
    "bg-brand-primary text-white shadow-brand hover:bg-brand-primary-hover active:bg-brand-primary-hover focus-visible:ring-brand-primary/35",
  secondary:
    "bg-brand-soft text-brand-primary hover:bg-brand-muted active:bg-brand-muted focus-visible:ring-brand-primary/25",
  outline:
    "border border-brand-border bg-brand-surface text-brand-text hover:border-brand-border-strong hover:bg-brand-soft/60 active:bg-brand-soft focus-visible:ring-brand-primary/25",
  ghost:
    "bg-transparent text-brand-text-muted hover:bg-brand-soft/70 hover:text-brand-text active:bg-brand-soft focus-visible:ring-brand-primary/20",
  text:
    "bg-transparent text-brand-primary hover:bg-brand-soft/70 hover:text-brand-primary-hover active:bg-brand-soft focus-visible:ring-brand-primary/25",
  danger:
    "bg-brand-danger text-white shadow-brand hover:brightness-95 active:brightness-90 focus-visible:ring-brand-danger/35",
};

const SIZES = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  const variantClass = VARIANTS[variant] ?? VARIANTS.primary;
  const sizeClass = SIZES[size] ?? SIZES.md;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-brand font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-background disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden
          />
          <span>{typeof children === "string" ? "Procesando…" : children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
