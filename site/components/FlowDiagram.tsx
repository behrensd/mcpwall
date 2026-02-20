interface FlowDiagramProps {
  className?: string;
}

export default function FlowDiagram({ className = "" }: FlowDiagramProps) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flow-node bg-zinc-800 text-zinc-300">Claude Code</div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="flow-arrow text-lg">&rarr;</span>
          <span className="flow-arrow text-lg">&larr;</span>
        </div>
        <div className="flow-node bg-brand-500/10 text-brand-400 border border-brand-500/20">
          mcpwall
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="flow-arrow text-lg">&rarr;</span>
          <span className="flow-arrow text-lg">&larr;</span>
        </div>
        <div className="flow-node bg-zinc-800 text-zinc-300">MCP Server</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-zinc-500">
        <span>&rarr; block dangerous requests</span>
        <span>&larr; redact secrets, block injection</span>
      </div>
    </div>
  );
}
