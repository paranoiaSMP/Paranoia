import discord
from discord.ext import commands
import os

import asyncpg
from core.config import Config

class ParanoiaBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.members = True
        intents.message_content = True
        intents.voice_states = True
        super().__init__(command_prefix="!", intents=intents)
        self.db = None

    async def setup_hook(self):
        if Config.DATABASE_URL:
            try:
                self.db = await asyncpg.create_pool(Config.DATABASE_URL)
            except Exception as e:
                print(f"[ERROR] DB connection failed: {e}", flush=True)
        await self.load_all_cogs()
        await self.tree.sync()

    async def close(self):
        if self.db:
            await self.db.close()
        await super().close()

    async def on_ready(self):
        print(f"[SUCCESS] Bot connecté : {self.user} (ID: {self.user.id})", flush=True)

    async def load_all_cogs(self):
        for root, _, files in os.walk("./cogs"):
            for filename in files:
                if filename.endswith(".py") and not filename.startswith("__"):
                    path = os.path.join(root, filename)
                    module_name = path.replace("./", "").replace("\\", ".").replace("/", ".")[:-3]
                    try:
                        await self.load_extension(module_name)
                    except Exception as e:
                        print(f"[ERROR] Failed to load {module_name}: {e}")