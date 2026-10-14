import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`crash:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many reports" }, { status: 429 });
    }
    const raw = await req.text();
    if (raw.length > 64_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const crashReport = JSON.parse(raw);
    
    console.error("[CRASH REPORT RECEIVED]", crashReport);

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "🚨 **Nouveau rapport de crash reçu**",
          allowed_mentions: { parse: [] },
          embeds: [
            {
              title: "Crash Report",
              description: "```json\n" + JSON.stringify(crashReport, null, 2).slice(0, 4000) + "\n```",
              color: 0xff0000,
            }
          ]
        })
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to parse crash report:", error);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
