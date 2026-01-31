type AdminSectionPlaceholderProps = {
  title: string;
  description: string;
};

export default function AdminSectionPlaceholder({
  title,
  description,
}: AdminSectionPlaceholderProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
    </div>
  );
}
