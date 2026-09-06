import discord
from discord.ext import commands
import os

class ParanoiaBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.members = True
        super().__init__(command_prefix="!", intents=intents)
        self.db = None

    async def setup_hook(self):
        await self.load_all_cogs()
        await self.tree.sync()

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