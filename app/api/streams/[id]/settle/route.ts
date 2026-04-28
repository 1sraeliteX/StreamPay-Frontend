import { NextResponse } from "next/server";
import { StreamService } from "@/app/lib/stream-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;

  const result = await StreamService.applyAction(id, "settle", idempotencyKey);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      ...result.data,
      settlement: {
        txHash: `fake-tx-${crypto.randomUUID().slice(0, 8)}`,
        settledAt: new Date().toISOString(),
      },
    },
  });
}
