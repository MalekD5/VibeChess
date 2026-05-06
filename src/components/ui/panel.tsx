export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-copy-primary">{title}</h2>
      {children}
    </section>
  );
}

export function InfoRow({
  label,
  value,
  isMono = false,
}: {
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs uppercase tracking-wider text-copy-faint">{label}</dt>
      <dd
        className={[
          'break-all text-copy-secondary',
          isMono ? 'font-mono text-xs' : 'text-sm capitalize',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
