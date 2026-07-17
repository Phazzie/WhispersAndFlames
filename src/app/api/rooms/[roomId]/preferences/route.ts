import {
  apiError,
  jsonNoStore,
  parseJson,
  requireBearerToken,
  type RoomRouteContext,
} from "@/app/api/_lib/http";
import { preferencesInputSchema } from "@/lib/game/contracts";
import { getGameRepository } from "@/lib/game/repository";

export async function POST(
  request: Request,
  context: RoomRouteContext,
): Promise<Response> {
  try {
    const playerToken = requireBearerToken(request);
    const input = await parseJson(request, preferencesInputSchema);
    const { roomId } = await context.params;
    const response = await getGameRepository().submitPreferences(
      roomId,
      playerToken,
      input,
    );
    return jsonNoStore(response);
  } catch (error) {
    return apiError(error);
  }
}
