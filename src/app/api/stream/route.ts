import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bus, PUBLIC_TOPIC, userTopic } from "@/lib/realtime/bus";
import { walletSnapshot } from "@/lib/realtime/emit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 20_000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const encoder = new TextEncoder();

  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const unsubscribe = bus.subscribe(userId ? [PUBLIC_TOPIC, userTopic(userId)] : [PUBLIC_TOPIC], (m) =>
        send(m.event, m.data)
      );
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      send("ready", { authenticated: !!userId });
      if (userId) {
        try {
          send("wallet", await walletSnapshot(userId));
        } catch {}
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
