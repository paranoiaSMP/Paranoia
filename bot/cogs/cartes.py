import discord
from discord import app_commands
from discord.ext import commands
import os

RARITY_COLORS = {
    "MYTHIC": 0xdc2626,
    "LEGENDARY": 0xfacc15,
    "EPIC": 0xa855f7,
    "RARE": 0x3b82f6,
    "UNCOMMON": 0x22c55e,
    "COMMON": 0x94a3b8
}

RARITY_LABELS = {
    "MYTHIC": "Mythique",
    "LEGENDARY": "Légendaire",
    "EPIC": "Épique",
    "RARE": "Rare",
    "UNCOMMON": "Peu commune",
    "COMMON": "Commune"
}

class CartesCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="cartes", description="Affiche toutes les cartes assignées à un joueur Minecraft.")
    @app_commands.describe(pseudo_mc="Pseudo Minecraft du joueur")
    async def cartes(self, interaction: discord.Interaction, pseudo_mc: str):
        await interaction.response.defer()

        cards = []
        if self.bot.db:
            try:
                async with self.bot.db.acquire() as con:
                    query = """
                    SELECT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
                    FROM "TradingCard" tc
                    LEFT JOIN "Player" p ON tc."playerId" = p.id
                    WHERE (p."minecraftName" ILIKE $1 OR tc.title ILIKE $2)
                      AND tc."isPublished" = true
                    ORDER BY CASE tc.rarity
                        WHEN 'MYTHIC' THEN 1
                        WHEN 'LEGENDARY' THEN 2
                        WHEN 'EPIC' THEN 3
                        WHEN 'RARE' THEN 4
                        WHEN 'UNCOMMON' THEN 5
                        ELSE 6
                    END ASC
                    """
                    records = await con.fetch(query, pseudo_mc, f"%{pseudo_mc}%")
                    for r in records:
                        cards.append(dict(r))
            except Exception:
                pass

        if not cards:
            embed = discord.Embed(
                title="🃏 Cartes Introuvables",
                description=f"Aucune carte assignée à **{pseudo_mc}** n'a été trouvée.",
                color=0xef4444
            )
            embed.set_thumbnail(url=f"https://vzge.me/face/512/{pseudo_mc}.png")
            embed.set_footer(text="Paranoia Studio")
            await interaction.followup.send(embed=embed)
            return

        embed = discord.Embed(
            title=f"🃏 Cartes de {pseudo_mc}",
            description=f"**{len(cards)}** carte(s) répertoriée(s) pour ce joueur :",
            color=0x7a0aad
        )
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{pseudo_mc}.png")

        for card in cards[:10]:
            rarity_text = RARITY_LABELS.get(card["rarity"], card["rarity"])
            edition_text = card.get("edition") or "Standard"
            proba_text = f"{card.get('proba', 100)}%"
            embed.add_field(
                name=f"{card['title']} ({rarity_text})",
                value=f"Édition : `{edition_text}` • Proba : `{proba_text}`",
                inline=False
            )

        if len(cards) > 10:
            embed.set_footer(text=f"Paranoia Studio • Affichage de 10 sur {len(cards)} cartes")
        else:
            embed.set_footer(text="Paranoia Studio")

        base_url = os.getenv("NEXTAUTH_URL", "http://localhost:3000").rstrip("/")
        first_img = cards[0].get("renderedImageUrl")
        if not first_img or not first_img.startswith("http"):
            first_img = f"{base_url}/api/og/card?id={cards[0]['id']}"
        embed.set_image(url=first_img)

        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(CartesCog(bot))
