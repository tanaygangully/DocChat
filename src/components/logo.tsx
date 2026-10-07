export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-sm text-white">D</span>
      DocChat
    </span>
  );
}
