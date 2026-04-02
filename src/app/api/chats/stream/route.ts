import { fail } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { subscribeChatEvents } from "@/lib/chatRealtime";

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(encodeSse("ready", { ok: true })));

      const unsubscribe = subscribeChatEvents(session.sub, (event) => {
        controller.enqueue(encoder.encode(encodeSse(event.type, event)));
      });

      const pingId = setInterval(() => {
        controller.enqueue(encoder.encode(encodeSse("ping", { ts: Date.now() })));
      }, 15000);

      const close = () => {
        clearInterval(pingId);
        unsubscribe();
      };
      cleanup = close;
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
