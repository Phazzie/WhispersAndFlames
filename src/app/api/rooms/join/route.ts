import { apiError, jsonNoStore, parseJson } from "@/app/api/_lib/http";
import { joinRoomInputSchema } from "@/lib/game/contracts";
import { getGameRepository } from "@/lib/game/repository";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJson(request, joinRoomInputSchema);
    const response = await getGameRepository().joinRoom(input);
    return jsonNoStore(response);
  } catch (error) {
    return apiError(error);
  }
}
