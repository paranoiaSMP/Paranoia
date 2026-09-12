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

import io
import aiohttp

class CartesCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="cartes", description="Affiche toutes les cartes assignées à un joueur Minecraft.")
    @app_commands.describe(pseudo_mc="Pseudo Minecraft du joueur")
    async def cartes(self, interaction: discord.Interaction, pseudo_mc: str):
        await interaction.response.defer()

        clean_pseudo = pseudo_mc.strip()
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
                    records = await con.fetch(query, f"%{clean_pseudo}%", f"%{clean_pseudo}%")
                    for r in records:
                        cards.append(dict(r))
            except Exception:
                pass

        if not cards:
            embed = discord.Embed(
                title="🃏 Cartes Introuvables",
                description=f"Aucune carte assignée à **{clean_pseudo}** n'a été trouvée.",
                color=0xef4444
            )
            embed.set_thumbnail(url=f"https://vzge.me/face/512/{clean_pseudo}.png")
            embed.set_footer(text="Paranoia Studio")
            await interaction.followup.send(embed=embed)
            return

        embed = discord.Embed(
            title=f"🃏 Cartes de {clean_pseudo}",
            description=f"**{len(cards)}** carte(s) répertoriée(s) pour ce joueur :",
            color=0x7a0aad
        )
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{clean_pseudo}.png")

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
        file_to_send = None

        if first_img and (first_img.startswith("https://") or first_img.startswith("http://")) and not ("localhost" in first_img or "127.0.0.1" in first_img):
            embed.set_image(url=first_img)
        else:
            filename = os.path.basename(first_img) if first_img else f"card_{cards[0]['id']}.png"
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidates = [
                os.path.join(base_dir, "public", "uploads", "cards", filename),
                os.path.join(base_dir, "public", "uploads", filename),
                os.path.join(os.getcwd(), "public", "uploads", "cards", filename),
                os.path.join(os.getcwd(), "public", "uploads", filename),
            ]
            local_path = next((p for p in candidates if os.path.exists(p)), None)
            if local_path:
                file_to_send = discord.File(local_path, filename="carte.png")
                embed.set_image(url="attachment://carte.png")
            else:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{base_url}/api/og/card?id={cards[0]['id']}", timeout=aiohttp.ClientTimeout(total=4)) as resp:
                            if resp.status == 200:
                                data = await resp.read()
                                file_to_send = discord.File(io.BytesIO(data), filename="carte.png")
                                embed.set_image(url="attachment://carte.png")
                except Exception:
                    pass

                if not file_to_send:
                    embed.set_image(url=f"https://vzge.me/bust/512/{clean_pseudo}.png")

        if file_to_send:
            await interaction.followup.send(embed=embed, file=file_to_send)
        else:
            await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(CartesCog(bot))
