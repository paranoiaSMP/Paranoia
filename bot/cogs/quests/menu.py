import discord
from discord import app_commands
from discord.ext import commands

from cogs.quests.statut import verifier_quete_statut

class QuestBoardView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=120)
        self.bot = bot

    @discord.ui.button(label="Vérifier le statut /Parasmp", style=discord.ButtonStyle.primary, emoji="🏷️")
    async def btn_statut(self, interaction: discord.Interaction, button: discord.ui.Button):
        await verifier_quete_statut(self.bot, interaction)

class QuestMenu(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="quetes", description="Ouvre le tableau des quêtes disponibles")
    async def quetes(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="📜 Tableau des Quêtes",
            description="Accomplis ces missions pour gagner des **ParaCoins** !\nClique sur les boutons ci-dessous pour vérifier et réclamer tes récompenses.",
            color=0x3b82f6
        )

        embed.add_field(name="🏷️ Statut Discord",
                        value="Mets `/Parasmp` dans ton statut personnalisé.\n**Récompense : 50 PC**", inline=False)
        embed.add_field(name="🎮 Paralauncher", value="Joue au jeu `Paralauncher`.\n**Récompense : 100 PC**",
                        inline=False)
        embed.add_field(name="📩 Invitations", value="Invite 30 joueurs sur le serveur.\n**Récompense : Drop !**",
                        inline=False)

        view = QuestBoardView(self.bot)
        await interaction.response.send_message(embed=embed, view=view)

async def setup(bot):
    await bot.add_cog(QuestMenu(bot))