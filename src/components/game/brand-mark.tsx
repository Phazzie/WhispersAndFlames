import { Flame } from "lucide-react";

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={compact ? "brand-mark brand-mark-compact" : "brand-mark"}>
      <span className="brand-sigil" aria-hidden="true">
        <Flame size={compact ? 17 : 21} strokeWidth={1.7} />
      </span>
      <span>
        <span className="brand-name">Whispers</span>
        <span className="brand-ampersand"> &amp; </span>
        <span className="brand-name">Flames</span>
      </span>
    </div>
  );
}
