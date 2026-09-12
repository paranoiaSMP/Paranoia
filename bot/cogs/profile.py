import discord
from discord import app_commands
from discord.ext import commands
import os

class ProfileCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="profile", description="Affiche le profil Paranoia d'un membre.")
    @app_commands.describe(membre="Membre dont vous souhaitez voir le profil")
    async def profile(self, interaction: discord.Interaction, membre: discord.Member = None):
        target = membre or interaction.user
        await interaction.response.defer()

        mc_name = "Non lié"
        para_id = f"P-{str(target.id)[-5:].upper()}"
        coins = 0
        cards_count = 0
        total_cards = 120
        boosters_opened = 0
        max_rarity = "Aucune"
        playtime = "Non synchronisé"
        level = 1

        if self.bot.db:
            try:
                async with self.bot.db.acquire() as con:
                    user_row = await con.fetchrow(
                        'SELECT id, "minecraftName", "paraCoins" FROM "User" WHERE "discordId" = $1',
                        str(target.id)
                    )
                    if user_row:
                        mc_name = user_row["minecraftName"] or "Non lié"
                        coins = user_row["paraCoins"] or 0
                        user_id = user_row["id"]
                        para_id = f"P-{user_id[:5].upper()}"

                        cards_count = await con.fetchval(
                            'SELECT COUNT(*) FROM "UserCard" WHERE "userId" = $1',
                            user_id
                        ) or 0

                        total = await con.fetchval('SELECT COUNT(*) FROM "TradingCard" WHERE "isPublished" = true')
                        if total and total > 0:
                            total_cards = total

                        best_card = await con.fetchrow(
                            """
                            SELECT tc.rarity FROM "UserCard" uc
                            JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
                            WHERE uc."userId" = $1
                            ORDER BY CASE tc.rarity
                                WHEN 'MYTHIC' THEN 1
                                WHEN 'LEGENDARY' THEN 2
                                WHEN 'EPIC' THEN 3
                                WHEN 'RARE' THEN 4
                                WHEN 'UNCOMMON' THEN 5
                                ELSE 6
                            END ASC
                            LIMIT 1
                            """,
                            user_id
                        )
                        if best_card:
                            rarity_map = {
                                "MYTHIC": "Mythique",
                                "LEGENDARY": "Légendaire",
                                "EPIC": "Épique",
                                "RARE": "Rare",
                                "UNCOMMON": "Peu commune",
                                "COMMON": "Commune"
                            }
                            max_rarity = rarity_map.get(best_card["rarity"], best_card["rarity"])

                        level = max(1, cards_count // 5 + 1)
                        boosters_opened = cards_count // 3
            except Exception:
                pass

        embed = discord.Embed(
            title="PARANOIA PROFILE",
            description=f"**{target.display_name}**",
            color=0x7a0aad
        )
        embed.set_thumbnail(url=target.display_avatar.url)

        embed.add_field(name="Minecraft", value=mc_name, inline=True)
        embed.add_field(name="Paranoia ID", value=para_id, inline=True)
        embed.add_field(name="PARA Coins", value=f"{coins:,}".replace(",", " "), inline=True)
        embed.add_field(name="Cartes", value=f"{cards_count}/{total_cards}", inline=True)
        embed.add_field(name="Boosters ouverts", value=str(boosters_opened), inline=True)
        embed.add_field(name="Rareté maximale", value=max_rarity, inline=True)
        embed.add_field(name="Temps de jeu", value=playtime, inline=True)
        embed.add_field(name="Niveau", value=str(level), inline=True)
        embed.set_footer(text="Paranoia Studio")

        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(ProfileCog(bot))
