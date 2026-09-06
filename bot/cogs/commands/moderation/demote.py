import discord
from discord import app_commands
from discord.ext import commands
from ui.embeds.demotion import create_demotion_embed

class DemoteCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="demote", description="Annonce le départ ou la rétrogradation d'un membre")
    @app_commands.default_permissions(administrator=True)
    async def demote(self, interaction: discord.Interaction, membre: discord.Member, rang_actuel: str, motif: str = None):
        
        embed = create_demotion_embed(membre, rang_actuel, interaction.user, motif)
        await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(DemoteCommand(bot))
