import {
  apiError,
  jsonNoStore,
  parseJson,
  requireBearerToken,
  type RoomRouteContext,
} from "@/app/api/_lib/http";
import { ballotInputSchema } from "@/lib/game/contracts";
import { getGameRepository } from "@/lib/game/repository";

export async function POST(
  request: Request,
  context: RoomRouteContext,
): Promise<Response> {
  try {
    const playerToken = requireBearerToken(request);
    const input = await parseJson(request, ballotInputSchema);
    const { roomId } = await context.params;
    const response = await getGameRepository().submitBallot(
      roomId,
      playerToken,
      input,
    );
    return jsonNoStore(response);
  } catch (error) {
    return apiError(error);
  }
}
