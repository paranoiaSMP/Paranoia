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

    @app_commands.command(name="cartes", description="Affiche les cartes d'un joueur ou de votre inventaire.")
    @app_commands.describe(pseudo_mc="Pseudo Minecraft ou laisser vide pour votre inventaire")
    async def cartes(self, interaction: discord.Interaction, pseudo_mc: str = None):
        await interaction.response.defer()

        clean_pseudo = pseudo_mc.strip() if pseudo_mc else ""
        discord_id = str(interaction.user.id)
        cards = []
        is_inventory = False

        if self.bot.db:
            try:
                async with self.bot.db.acquire() as con:
                    if clean_pseudo:
                        inv_query = """
                        SELECT DISTINCT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
                        FROM "UserCard" uc
                        JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
                        JOIN "User" u ON uc."userId" = u.id
                        WHERE u."minecraftName" ILIKE $1 OR u.name ILIKE $1
                        ORDER BY CASE tc.rarity
                            WHEN 'MYTHIC' THEN 1
                            WHEN 'LEGENDARY' THEN 2
                            WHEN 'EPIC' THEN 3
                            WHEN 'RARE' THEN 4
                            WHEN 'UNCOMMON' THEN 5
                            ELSE 6
                        END ASC
                        """
                        records = await con.fetch(inv_query, f"%{clean_pseudo}%")
                        if records:
                            is_inventory = True
                            for r in records:
                                cards.append(dict(r))

                    if not cards and clean_pseudo:
                        char_query = """
                        SELECT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
                        FROM "TradingCard" tc
                        LEFT JOIN "Player" p ON tc."playerId" = p.id
                        WHERE p."minecraftName" ILIKE $1 OR tc.title ILIKE $1
                        ORDER BY CASE tc.rarity
                            WHEN 'MYTHIC' THEN 1
                            WHEN 'LEGENDARY' THEN 2
                            WHEN 'EPIC' THEN 3
                            WHEN 'RARE' THEN 4
                            WHEN 'UNCOMMON' THEN 5
                            ELSE 6
                        END ASC
                        """
                        records = await con.fetch(char_query, f"%{clean_pseudo}%")
                        for r in records:
                            cards.append(dict(r))

                    if not cards and not clean_pseudo:
                        self_query = """
                        SELECT DISTINCT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
                        FROM "UserCard" uc
                        JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
                        JOIN "User" u ON uc."userId" = u.id
                        WHERE u."discordId" = $1
                        ORDER BY CASE tc.rarity
                            WHEN 'MYTHIC' THEN 1
                            WHEN 'LEGENDARY' THEN 2
                            WHEN 'EPIC' THEN 3
                            WHEN 'RARE' THEN 4
                            WHEN 'UNCOMMON' THEN 5
                            ELSE 6
                        END ASC
                        """
                        records = await con.fetch(self_query, discord_id)
                        if records:
                            is_inventory = True
                            for r in records:
                                cards.append(dict(r))
            except Exception as e:
                print(f"[ERROR] Cartes query error: {e}", flush=True)

        display_name = clean_pseudo or interaction.user.display_name
        if not cards:
            embed = discord.Embed(
                title="🃏 Cartes Introuvables",
                description=f"Aucune carte trouvée pour **{display_name}**.",
                color=0xef4444
            )
            embed.set_thumbnail(url=f"https://vzge.me/face/512/{display_name}.png")
            embed.set_footer(text="Paranoia Studio")
            await interaction.followup.send(embed=embed)
            return

        embed_title = f"🎒 Inventaire de {display_name}" if is_inventory else f"🃏 Cartes de {display_name}"
        embed = discord.Embed(
            title=embed_title,
            description=f"**{len(cards)}** carte(s) répertoriée(s) :",
            color=0x7a0aad
        )
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{display_name}.png")

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
            rel_path = first_img.lstrip("/") if first_img else f"uploads/{filename}"
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidates = [
                os.path.join(base_dir, "public", rel_path),
                os.path.join(os.getcwd(), "public", rel_path),
                os.path.join(base_dir, "public", "uploads", "cards", filename),
                os.path.join(base_dir, "public", "uploads", filename),
                os.path.join(os.getcwd(), "public", "uploads", "cards", filename),
                os.path.join(os.getcwd(), "public", "uploads", filename),
            ]
            local_path = next((p for p in candidates if os.path.exists(p)), None)
            if local_path:
                file_to_send = discord.File(local_path, filename="carte.png")
                embed.set_image(url="attachment://carte.png")
            elif first_img and first_img.startswith("/") and base_url.startswith("http"):
                embed.set_image(url=f"{base_url}{first_img}")
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
