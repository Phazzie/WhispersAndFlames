import { AlertCircle, LoaderCircle, WifiOff } from "lucide-react";

interface StatusNoticeProps {
  tone: "error" | "network" | "loading";
  children: React.ReactNode;
  onDismiss?: () => void;
}

export function StatusNotice({
  tone,
  children,
  onDismiss,
}: StatusNoticeProps) {
  const Icon =
    tone === "network"
      ? WifiOff
      : tone === "loading"
        ? LoaderCircle
        : AlertCircle;

  return (
    <div
      className={`status-notice status-notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <Icon
        size={17}
        className={tone === "loading" ? "spin" : undefined}
        aria-hidden="true"
      />
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" className="notice-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
