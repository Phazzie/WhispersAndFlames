declare module "@/lib/ai" {
  import type { GameAiPort } from "@/lib/game/ports";

  export function getGameAi(): GameAiPort;
}
