import discord
from discord import app_commands
from discord.ext import commands

class Moderation(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="clear", description="Supprimer des messages")
    @app_commands.default_permissions(manage_messages=True)
    async def clear(self, interaction: discord.Interaction, amount: int):
        await interaction.response.defer(ephemeral=True)
        deleted = await interaction.channel.purge(limit=amount)
        await interaction.followup.send(f"✅ {len(deleted)} messages supprimés.")

    @app_commands.command(name="warn", description="Avertir un utilisateur")
    @app_commands.default_permissions(moderate_members=True)
    async def warn(self, interaction: discord.Interaction, user: discord.Member, reason: str):
        # TODO: Prisma integration
        await interaction.response.send_message(f"✅ {user.mention} a été averti pour: {reason}")

async def setup(bot):
    await bot.add_cog(Moderation(bot))
