import discord
from discord import app_commands
from discord.ext import commands
from ui.views.event_modal import EventModal

class EventCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="event", description="Ouvre la fenêtre pour rédiger un événement")
    @app_commands.default_permissions(administrator=True)
    async def event(self, interaction: discord.Interaction):
        await interaction.response.send_modal(EventModal())

async def setup(bot):
    await bot.add_cog(EventCommand(bot))
