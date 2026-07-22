import type { LucideIcon } from "lucide-react";

export interface ChecklistItem {
  icon: LucideIcon;
  color: string;
  label: string;
}

interface EditorialChecklistSectionProps {
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  items?: ChecklistItem[];
  divider?: boolean;
}

export function EditorialChecklistSection({
  eyebrow,
  heading,
  paragraphs,
  items,
  divider = true,
}: EditorialChecklistSectionProps) {
  return (
    <section className="bg-[var(--lp-mist)] px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-[720px]">
        {eyebrow && (
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--lp-smoke)]">
            {eyebrow}
          </p>
        )}
        <h2 className="lp-display mb-6 text-[36px] leading-tight">{heading}</h2>
        <div className="flex flex-col gap-4">
          {paragraphs.map((p) => (
            <p
              key={p}
              className="text-base leading-[1.35] text-[var(--lp-graphite)]"
            >
              {p}
            </p>
          ))}
        </div>

        {items && items.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: item.color }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-sm font-medium text-[var(--lp-ink)]">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {divider && <div className="mt-14 border-t border-dashed border-black/15" />}
      </div>
    </section>
  );
}
