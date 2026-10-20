import type { ReactNode } from "react";

export function BrandMark() {
  return (
    <svg className="brand-mark" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <rect x="0.5" y="0.5" width="35" height="35" rx="9" fill="#121212" stroke="#3a3a3a" />
      <path d="M8 23.5 14.2 12.2 19.2 19.4 28 9.5" fill="none" stroke="#16c47a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 27.2h20" stroke="#333" strokeWidth="1.2" />
    </svg>
  );
}

export function ScreenField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function QuickField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="quick">
      <span>{label}</span>
      {children}
    </label>
  );
}
