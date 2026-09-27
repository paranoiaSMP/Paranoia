import discord
from discord import app_commands
from discord.ext import commands
from ui.embeds.promotion import create_promotion_embed

class PromoteCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="promote", description="Announce a staff member's promotion")
    @app_commands.default_permissions(administrator=True)
    async def promote(self, interaction: discord.Interaction, member: discord.Member, role: str, reason: str = None):

        embed = create_promotion_embed(member, role, interaction.user, reason)

        await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(PromoteCommand(bot))
