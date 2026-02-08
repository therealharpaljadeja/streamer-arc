import { alertEmitter } from "@/lib/alert-emitter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ streamerId: string }> }
) {
  const { streamerId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream may be closed
        }
      };

      const onDonation = (donation: unknown) => {
        sendEvent(donation);
      };

      alertEmitter.on(`donation:${streamerId}`, onDonation);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Send initial connected event
      sendEvent({ type: "connected" });

      // Cleanup when client disconnects
      const cleanup = () => {
        alertEmitter.off(`donation:${streamerId}`, onDonation);
        clearInterval(heartbeat);
      };

      // Store cleanup for abort handling
      (controller as unknown as Record<string, () => void>)._cleanup = cleanup;
    },
    cancel() {
      // This is called when the client disconnects
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
