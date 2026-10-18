import type { PointerEvent, ReactNode } from "react";

export type DockTab = "strateji" | "gecmis" | "performans" | "replay";

const TABS: Array<{ id: DockTab; label: string }> = [
  { id: "strateji", label: "Strateji Sınayıcı" },
  { id: "gecmis", label: "İşlem Geçmişi" },
  { id: "performans", label: "Performans" },
  { id: "replay", label: "Bar Replay" },
];

export function BottomDock(props: {
  open: boolean;
  height: number;
  tab: DockTab;
  onTab: (tab: DockTab) => void;
  onClose: () => void;
  onOpen: () => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
  replayStrip: ReactNode;
  children: ReactNode;
}) {
  if (!props.open) {
    return (
      <div className="term-collapsed" data-testid="term-collapsed">
        <button type="button" className="term-btn" onClick={props.onOpen}>Paneli aç</button>
        {props.replayStrip}
      </div>
    );
  }
  return (
    <>
      <div className="term-handle" data-testid="term-handle" onPointerDown={props.onResizeStart} />
      <section className="term-dock" data-testid="term-dock" style={{ height: props.height }}>
        <div className="term-tabs" role="tablist">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={props.tab === item.id} className={props.tab === item.id ? "term-tab on" : "term-tab"} onClick={() => props.onTab(item.id)}>
              {item.label}
            </button>
          ))}
          <button type="button" className="term-btn term-close" onClick={props.onClose}>Kapat</button>
        </div>
        <div className="term-pane" role="tabpanel">{props.children}</div>
      </section>
    </>
  );
}
