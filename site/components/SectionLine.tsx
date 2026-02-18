interface SectionLineProps {
  variant?: "default" | "danger" | "safe" | "brand";
}

export default function SectionLine({ variant = "default" }: SectionLineProps) {
  const cls =
    variant === "danger"
      ? "section-line-danger"
      : variant === "safe" || variant === "brand"
        ? "section-line-safe"
        : "section-line";

  return <div className={cls} />;
}
