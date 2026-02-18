interface StderrCalloutProps {
  variant: "danger" | "info";
  tag?: string;
  children: React.ReactNode;
  className?: string;
}

export default function StderrCallout({
  variant,
  tag,
  children,
  className = "",
}: StderrCalloutProps) {
  const variantClass = variant === "danger" ? "stderr-danger" : "stderr-info";

  return (
    <div className={`stderr-callout ${variantClass} rounded-lg ${className}`}>
      {tag && <span className="stderr-tag">{tag}</span>}
      {children}
    </div>
  );
}
