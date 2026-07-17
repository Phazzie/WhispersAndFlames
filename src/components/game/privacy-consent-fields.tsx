import { Lock } from "lucide-react";

interface PrivacyConsentFieldsProps {
  prefix: "create" | "join";
  adultConfirmed: boolean;
  aiConsent: boolean;
  onAdultChange: (checked: boolean) => void;
  onAiConsentChange: (checked: boolean) => void;
}

export function PrivacyConsentFields({
  prefix,
  adultConfirmed,
  aiConsent,
  onAdultChange,
  onAiConsentChange,
}: PrivacyConsentFieldsProps) {
  return (
    <fieldset className="consent-fieldset">
      <legend className="sr-only">Age and private AI processing consent</legend>
      <label className="consent-row" htmlFor={`${prefix}-adult-confirmed`}>
        <input
          id={`${prefix}-adult-confirmed`}
          data-testid={`${prefix}-adult-consent`}
          type="checkbox"
          checked={adultConfirmed}
          onChange={(event) => onAdultChange(event.target.checked)}
        />
        <span className="check-box" aria-hidden="true" />
        <span>
          <strong>I&apos;m 18 or older</strong>
          <small>This room is only for consenting adults.</small>
        </span>
      </label>

      <label className="consent-row" htmlFor={`${prefix}-ai-consent`}>
        <input
          id={`${prefix}-ai-consent`}
          data-testid={`${prefix}-ai-consent`}
          type="checkbox"
          checked={aiConsent}
          onChange={(event) => onAiConsentChange(event.target.checked)}
        />
        <span className="check-box" aria-hidden="true" />
        <span>
          <strong>I agree to private AI processing</strong>
          <small>
            Your answers are compared to find shared themes. They are never
            shown to your partner.
          </small>
        </span>
      </label>

      <p className="privacy-pact">
        <Lock size={14} aria-hidden="true" />
        Answers stay sealed. Only a neutral theme you both approve becomes a
        shared spark.
      </p>
    </fieldset>
  );
}
