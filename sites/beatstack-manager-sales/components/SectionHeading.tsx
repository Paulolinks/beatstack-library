export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-400">
          {eyebrow}
        </p>
      )}
      <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
