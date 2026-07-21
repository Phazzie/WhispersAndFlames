import { Lock, Sparkles } from "lucide-react";

interface WaitingCardProps {
  eyebrow?: string;
  title: string;
  message: string;
  partnerReady?: boolean;
}

export function WaitingCard({
  eyebrow = "Sealed & private",
  title,
  message,
  partnerReady,
}: WaitingCardProps) {
  return (
    <section className="waiting-card" aria-labelledby="waiting-title">
      <div className="waiting-orbit" aria-hidden="true">
        <span className="waiting-core">
          <Sparkles size={28} strokeWidth={1.4} />
        </span>
      </div>
      <p className="eyebrow">
        <Lock size={13} aria-hidden="true" />
        {eyebrow}
      </p>
      <h1 id="waiting-title">{title}</h1>
      <p className="waiting-copy">{message}</p>
      {partnerReady !== undefined ? (
        <div className="partner-presence" role="status" aria-live="polite">
          <span
            className={partnerReady ? "presence-dot is-ready" : "presence-dot"}
            aria-hidden="true"
          />
          {partnerReady ? "Your partner is ready" : "Waiting on your partner"}
        </div>
      ) : null}
    </section>
  );
}
