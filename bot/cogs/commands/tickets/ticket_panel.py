import discord
from discord import app_commands
from discord.ext import commands
from ui.embeds.ticket import create_ticket_staff_panel_embed
from ui.views.ticket_view import TicketLaunchView

class TicketPanelCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self.bot.add_view(TicketLaunchView())

    @app_commands.command(name="ticket_panel", description="Déploie le panel de ticket pour les vidéastes.")
    @app_commands.default_permissions(administrator=True)
    async def ticket_panel(self, interaction: discord.Interaction):
        embed = create_ticket_staff_panel_embed()
        await interaction.channel.send(embed=embed, view=TicketLaunchView())
        await interaction.response.send_message(" Panel posté avec succès.", ephemeral=True)

async def setup(bot):
    await bot.add_cog(TicketPanelCommand(bot))