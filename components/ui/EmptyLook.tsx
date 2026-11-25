import emptyLookStyles from "@/styles/ui/EmptyLook.module.scss";

interface EmptyLookProps {
  label: string;
  message?: string;
  className?: string;
}

export default function EmptyLook({ label, message, className }: EmptyLookProps) {
  const text = message ?? `No data for ${label} as of now.`;

  return (
    <div
      className={[emptyLookStyles.emptyLook, className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className={emptyLookStyles.emptyLookText}>{text}</span>
    </div>
  );
}
