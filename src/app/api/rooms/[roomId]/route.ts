import {
  apiError,
  jsonNoStore,
  requireBearerToken,
  type RoomRouteContext,
} from "@/app/api/_lib/http";
import { getGameRepository } from "@/lib/game/repository";

export async function GET(
  request: Request,
  context: RoomRouteContext,
): Promise<Response> {
  try {
    const playerToken = requireBearerToken(request);
    const { roomId } = await context.params;
    const response = await getGameRepository().getRoom(roomId, playerToken);
    return jsonNoStore(response);
  } catch (error) {
    return apiError(error);
  }
}
