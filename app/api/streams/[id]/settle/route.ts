import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

function createErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, request_id: "mock-request-id" } }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stream = db.streams.get(id);
  if (!stream) {
    return createErrorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }
  if (stream.status !== "active" && stream.status !== "paused") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active or paused streams can be settled", 409);
  }
  const txHash = `fake-tx-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  stream.status = "ended";
  stream.nextAction = "withdraw";
  stream.settlementTxHash = txHash;
  stream.withdrawal = {
    state: "pending",
    requestedAt: now,
    lastCheckedAt: now,
    attempts: 0,
    settlementTxHash: txHash,
  };
  stream.updatedAt = now;
  db.streams.set(id, stream);
  return NextResponse.json({
    data: {
      ...stream,
      settlement: {
        txHash,
        settledAt: now,
      },
    },
  });
}
