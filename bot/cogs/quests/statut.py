import discord

async def verifier_quete_statut(bot, interaction: discord.Interaction):
    if not bot.db:
        return await interaction.response.send_message("", ephemeral=True)

    has_status = False
    if interaction.user.activities:
        for activity in interaction.user.activities:
            if isinstance(activity, discord.CustomActivity):
                if "/Parasmp" in str(activity.name):
                    has_status = True
                    break

    if has_status:
        async with bot.db.acquire() as con:
            user = await con.fetchrow('SELECT id, "paraCoins" FROM "User" WHERE "discordId" = $1',
                                      str(interaction.user.id))
            if not user:
                return await interaction.response.send_message("Error Database.", ephemeral=True)

            nouveau_solde = user["paraCoins"] + 50
            await con.execute('UPDATE "User" SET "paraCoins" = $1 WHERE id = $2', nouveau_solde, user["id"])

            await interaction.response.send_message(
                f"✅ Quest completed! You earned **50 ParaCoins**. (New balance: {nouveau_solde} PC)", ephemeral=True)
    else:
        await interaction.response.send_message(
            "❌ I don't see `/Parasmp` in your custom status. Add it and try again!", ephemeral=True)

async def setup(bot):
    pass