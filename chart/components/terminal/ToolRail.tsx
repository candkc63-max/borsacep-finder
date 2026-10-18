export type DrawTool = "cursor" | "trend" | "hline" | "fib" | "measure";

const TOOLS: Array<{ id: DrawTool; label: string; title: string }> = [
  { id: "cursor", label: "+", title: "İmleç" },
  { id: "trend", label: "/", title: "Trend çizgisi" },
  { id: "hline", label: "—", title: "Yatay çizgi" },
  { id: "fib", label: "F", title: "Fibonacci" },
  { id: "measure", label: "↔", title: "Ölçüm" },
];

export function ToolRail(props: { tool: DrawTool; onTool: (tool: DrawTool) => void; onClear: () => void }) {
  return (
    <aside className="term-rail" data-testid="term-rail" aria-label="Çizim araçları">
      {TOOLS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={props.tool === item.id ? "term-icon on" : "term-icon"}
          title={item.title}
          aria-label={item.title}
          onClick={() => props.onTool(item.id)}
        >
          {item.label}
        </button>
      ))}
      <button type="button" className="term-icon" title="Çizimleri sil" aria-label="Çizimleri sil" onClick={props.onClear}>×</button>
    </aside>
  );
}
