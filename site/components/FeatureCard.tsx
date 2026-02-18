interface FeatureCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function FeatureCard({ children, className = "", style }: FeatureCardProps) {
  return (
    <div className={`feature-card ${className}`} style={style}>
      {children}
    </div>
  );
}
