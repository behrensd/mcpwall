interface FlowDiagramProps {
  className?: string;
}

export default function FlowDiagram({ className = "" }: FlowDiagramProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <div className="flow-node bg-zinc-800 text-zinc-300">Claude Code</div>
      <span className="flow-arrow text-lg">&rarr;</span>
      <div className="flow-node bg-brand-500/10 text-brand-400 border border-brand-500/20">
        mcpwall
      </div>
      <span className="flow-arrow text-lg">&rarr;</span>
      <div className="flow-node bg-zinc-800 text-zinc-300">MCP Server</div>
    </div>
  );
}
