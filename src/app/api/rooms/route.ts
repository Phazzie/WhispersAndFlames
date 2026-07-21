import { createRoomInputSchema } from "@/lib/game/contracts";
import { getGameRepository } from "@/lib/game/repository";
import { apiError, jsonNoStore, parseJson } from "@/app/api/_lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJson(request, createRoomInputSchema);
    const response = await getGameRepository().createRoom(input);
    return jsonNoStore(response, 201);
  } catch (error) {
    return apiError(error);
  }
}
