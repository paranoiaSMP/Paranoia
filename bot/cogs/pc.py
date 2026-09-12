import discord
from discord import app_commands, file
from discord.ext import commands
import os

class ParaCoin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="pc",description="Affiche le nombre de ParaCoin Restant.")
    async def pc(self, interaction: discord.Interaction):
        if not self.bot.db:
            return await interaction.response.send_message("Error Database.", ephemeral= True)

        query = 'SELECT "paraCoins" FROM "User" WHERE "discordId" = $1'

        async with self.bot.db.acquire() as con:
            record = await con.fetchrow(query,str(interaction.user.id))

        if record:
            coin = record["paraCoins"]
            embed = discord.Embed(
                title="ParaCoin",
                description=f"Tu as actuellement **{coin}PC**.",
                color=0xfbbf24
            )

            candidates = [
                os.path.join(os.getcwd(), "bot", "assets", "paracoin.png"),
                os.path.join(os.getcwd(), "assets", "paracoin.png"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "paracoin.png"),
            ]
            chemin_image = next((p for p in candidates if os.path.exists(p)), None)
            if chemin_image:
                fichier_image = discord.File(chemin_image, filename="paracoin.png")
                embed.set_thumbnail(url="attachment://paracoin.png")
                await interaction.response.send_message(embed=embed, file=fichier_image)
            else:
                await interaction.response.send_message(embed=embed)
        else:
            await interaction.response.send_message("Tu n'es pas enregistrer sur le site ", ephemeral=True)

async def setup(bot):
    await bot.add_cog(ParaCoin(bot))
