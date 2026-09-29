import type { ReactNode } from 'react';

export interface PageHeadProps {
  title: string;
  sub?: string;
  /** Optional tag above the title (e.g. <Tag icon="calc">Before the gala</Tag>). */
  tag?: ReactNode;
}

/** Page heading block, the reference `head()` helper. */
export function PageHead({ title, sub, tag }: PageHeadProps) {
  return (
    <div className="phead">
      {tag}
      <h2 className="h2">{title}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}
