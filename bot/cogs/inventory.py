import discord
from discord import app_commands
from discord.ext import commands
import os

class inventory(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="flex", description="Flex Ta meilleur carte")
    async def flex(self, interaction: discord.Interaction):
        if not self.bot.db:
            return await interaction.response.send_message("Error Database.", ephemeral=True)

        user_query = 'SELECT id FROM "User" WHERE "discordId" = $1'

        async with self.bot.db.acquire() as con:
            user = await con.fetchrow(user_query, str(interaction.user.id))
            if not user:
                return await interaction.response.send_message("You are Not Register In the Database", ephemeral=True)

            cards_query = '''
            SELECT uc.id as "userCardId", tc.title, tc.rarity, tc.edition, tc."imageUrl",
            tc."renderedImageUrl", tc.proba
            FROM "UserCard" uc
            JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
            WHERE uc."userId" = $1
            '''
            inventory = await con.fetch(cards_query, user["id"])

            if not inventory:
                return await interaction.response.send_message("Your inventory is empty! Open booster on our website.", ephemeral=True)

            rarity_order = {'MYTHIC': 0, 'LEGENDARY': 1, 'EPIC':2, 'RARE': 3, 'UNCOMMON': 4, 'COMMON': 5}
            sorted_inv = sorted(inventory, key=lambda c: (rarity_order.get(c['rarity'],99),c['proba']))
            best_card = sorted_inv[0]
            short_uuid = best_card['userCardId'][-6:]

            colors = {
                'MYTHIC': 0xdc2626,
                'LEGENDARY': 0xfacc15,
                'EPIC':0xa855f7,
                'RARE':0x3b82f6,
                'UNCOMMON':0x22c55e,
                'COMMON': 0x94a3b8
            }

            embed = discord.Embed(
                title="FLEX TIME !",
                description=f"The best Card of <@{interaction.user.id}> is {best_card['title']}** ({best_card['rarity']})\nÉdition: `{best_card['edition']}`\nUUID: `#{short_uuid}`!",
                color=colors.get(best_card['rarity'], 0x94a3b8)
            )

            image_url = best_card['renderedImageUrl'] or best_card['imageUrl']
            file_to_send = None
            if image_url:
                if image_url.startswith("https://") or (image_url.startswith("http://") and not ("localhost" in image_url or "127.0.0.1" in image_url)):
                    embed.set_image(url=image_url)
                else:
                    filename = os.path.basename(image_url)
                    rel_path = image_url.lstrip("/")
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
                        file_to_send = discord.File(local_path, filename="flex.png")
                        embed.set_image(url="attachment://flex.png")
                    else:
                        base_url = os.getenv("NEXTAUTH_URL", "http://localhost:3000").rstrip("/")
                        if image_url.startswith("/") and base_url.startswith("http"):
                            embed.set_image(url=f"{base_url}{image_url}")

            if file_to_send:
                await interaction.response.send_message(embed=embed, file=file_to_send)
            else:
                await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(inventory(bot))
