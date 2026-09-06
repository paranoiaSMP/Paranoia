import discord
from discord import app_commands
from discord.ext import commands
from ui.embeds.main_ticket import create_main_ticket_panel_embed
from ui.views.main_ticket_views import MainTicketLaunchView

class MainTicketPanelCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self.bot.add_view(MainTicketLaunchView())

    @app_commands.command(name="setup_tickets", description="Déploie le panel principal des tickets Paranoia Studio.")
    @app_commands.default_permissions(administrator=True)
    async def setup_tickets(self, interaction: discord.Interaction):
        embed = create_main_ticket_panel_embed()
        await interaction.channel.send(embed=embed, view=MainTicketLaunchView())
        await interaction.response.send_message(" Panel des tickets déployé.", ephemeral=True)

async def setup(bot):
    await bot.add_cog(MainTicketPanelCommand(bot))