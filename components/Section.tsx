export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-border scroll-mt-16 border-t py-6 first:border-t-0 first:pt-0"
    >
      <h2 className="text-text mb-3 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
