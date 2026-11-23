import type { ReactNode } from 'react';

// The create flow is full screen: no header, no bottom bar (spec C, C-01).
export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}
