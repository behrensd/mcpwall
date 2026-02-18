interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}

export default function CodeBlock({
  children,
  className = "",
  borderColor,
}: CodeBlockProps) {
  return (
    <div
      className={`code-block ${className}`}
      style={borderColor ? { borderColor } : undefined}
    >
      {children}
    </div>
  );
}
