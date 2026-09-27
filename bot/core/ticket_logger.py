import discord
import io
import uuid
from datetime import datetime

async def generate_ticket_log(
    channel: discord.TextChannel,
    client_id: int,
    ticket_id: str,
    metadata: dict,
    claimed_by: str = "Aucun"
) -> tuple[str, str, discord.File]:
    now_str = datetime.now().strftime("%Y%m%d")
    log_id = f"LOG-{now_str}-{uuid.uuid4().hex[:6].upper()}"

    header_lines = [
        f"ID du log : {log_id}",
        f"ID du ticket : {ticket_id}",
        f"Client ID : {client_id}",
        f"Admin claim : {claimed_by}"
    ]
    for key, val in metadata.items():
        header_lines.append(f"{key} : {val or 'Non renseigné'}")

    header = "\n".join(header_lines)
    separator = "=" * 60

    messages = []
    async for msg in channel.history(limit=None, oldest_first=True):
        timestamp = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        content = msg.clean_content
        if msg.embeds:
            content = f"{content} [embed]" if content else "[embed]"
        if msg.attachments:
            names = " ".join([a.filename for a in msg.attachments])
            content = f"{content} [{names}]" if content else f"[{names}]"
        messages.append(f"[{timestamp}] {msg.author.name}: {content}")

    body = "\n".join(messages)
    full_text = f"{header}\n{separator}\n\n{body}"

    file_bytes = io.BytesIO(full_text.encode("utf-8"))
    file = discord.File(file_bytes, filename=f"log-{log_id}.txt")

    preview_slice = messages[-10:] if len(messages) > 10 else messages
    preview = "\n".join(preview_slice)
    codeblock = f"```\n{header}\n{separator}\n\n{preview}\n```"
    if len(codeblock) > 1980:
        codeblock = f"```\n{header}\n{separator}\n\n... (Voir le fichier complet ci-joint)\n```"

    return log_id, codeblock, file