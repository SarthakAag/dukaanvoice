
export default function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <article className="analytics-kpi">
      <span>
        {Icon && <Icon size={14} />}
        {label}
      </span>

      <strong>{value}</strong>
    </article>
  );
}
