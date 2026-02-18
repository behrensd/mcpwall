interface StatusBadgeProps {
  status: "covered" | "not-covered" | "partial" | "mitigated";
  children: React.ReactNode;
  className?: string;
}

export default function StatusBadge({
  status,
  children,
  className = "",
}: StatusBadgeProps) {
  const statusClass =
    status === "covered"
      ? "status-covered"
      : status === "not-covered"
        ? "status-not-covered"
        : status === "partial"
          ? "status-partial"
          : "status-mitigated";

  return (
    <span className={`status ${statusClass} ${className}`}>{children}</span>
  );
}
