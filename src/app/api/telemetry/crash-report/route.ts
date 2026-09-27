import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const crashReport = await req.json();
    
    console.error("[CRASH REPORT RECEIVED]", crashReport);

    // TODO: Sauvegarder en base de données ou envoyer sur un webhook Discord
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "🚨 **Nouveau rapport de crash reçu**",
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
