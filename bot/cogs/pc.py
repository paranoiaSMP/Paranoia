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
            coin = record["paraCoin"]
            embed = discord.Embed(
                title="ParaCoin",
                description=f"Tu as actuellement **{coin}PC**.",
                color=0xfbbf24
            )

            chemin_image = os.path.join("./assets/paracoin.png")
            fichier_image = discord.File(chemin_image, filename="paracoin.png")
            embed.set_thumbnail(url="attachment://paracoin.png")
            await interaction.response.send_message(embed=embed, file=fichier_image)
        else:
            await interaction.response.send_message("Tu n'es pas enregistrer sur le site ", ephemeral=True)


async def setup(bot):
    await bot.add_cog(ParaCoin(bot))
