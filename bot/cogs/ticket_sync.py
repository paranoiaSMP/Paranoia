import aiohttp
import asyncio
import discord
from discord.ext import commands
from core.config import Config

class TicketSync(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot:
            return

        channel = message.channel
        category_id = getattr(channel, "category_id", None)
        if not category_id or category_id != Config.TICKET_CATEGORY_ID:
            return

        content = message.content.strip()
        if content.lower() in ["!close", "/close"]:
            await self._handle_close(message)
            return

        if not content:
            return

        payload = {
            "channelId": str(channel.id),
            "authorName": message.author.display_name,
            "authorRole": "STAFF",
            "authorImage": message.author.display_avatar.url if message.author.display_avatar else None,
            "content": message.clean_content
        }

        success = await self._send_to_site(payload)
        if success:
            try:
                await message.add_reaction("🌐")
            except Exception:
                pass

    async def _handle_close(self, message: discord.Message):
        payload = {
            "channelId": str(message.channel.id),
            "action": "close",
            "authorName": message.author.display_name
        }
        await self._send_to_site(payload)
        await message.channel.send("🔒 Fermeture du ticket dans 5 secondes...")
        await asyncio.sleep(5)
        try:
            await message.channel.delete()
        except Exception:
            pass

    async def _send_to_site(self, payload: dict) -> bool:
        endpoints = [
            "http://web:3000/api/tickets/sync-discord",
            "http://localhost:3000/api/tickets/sync-discord"
        ]
        headers = {
            "Authorization": f"Bearer {Config.DISCORD_TOKEN}",
            "Content-Type": "application/json"
        }

        for url in endpoints:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                        if resp.status == 200:
                            return True
            except Exception:
                continue
        return False

async def setup(bot: commands.Bot):
    await bot.add_cog(TicketSync(bot))
