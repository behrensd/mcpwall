interface ThreatCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function ThreatCard({ children, className = "" }: ThreatCardProps) {
  return <div className={`threat-card ${className}`}>{children}</div>;
}
