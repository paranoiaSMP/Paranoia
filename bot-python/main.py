import discord
from discord.ext import commands
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

class ParanoiaBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        intents.voice_states = True
        
        super().__init__(command_prefix="!", intents=intents, help_command=None)

    async def setup_hook(self):
        await self.load_extension("cogs.moderation")
        await self.load_extension("cogs.welcome")
        await self.load_extension("cogs.economy")
        await self.load_extension("cogs.conference")
        await self.load_extension("cogs.tcg")
        await self.tree.sync()
        print("Bot is ready and slash commands synced.")

bot = ParanoiaBot()

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")

if __name__ == "__main__":
    bot.run(os.getenv("DISCORD_TOKEN"))
