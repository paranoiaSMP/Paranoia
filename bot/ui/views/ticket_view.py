import discord
import asyncio
from core.config import Config
from ui.views.videaste_modal import VideasteModal

class TicketLaunchView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Postuler Vidéaste", style=discord.ButtonStyle.primary, emoji="🎥", custom_id="btn_open_videaste_ticket")
    async def open_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(VideasteModal())

class TicketStaffView(discord.ui.View):
    def __init__(self, user_id: int, pseudo_mc: str, youtube: str, twitch: str, tiktok: str):
        super().__init__(timeout=None)
        self.user_id = user_id
        self.pseudo_mc = pseudo_mc
        self.youtube = youtube
        self.twitch = twitch
        self.tiktok = tiktok

    @discord.ui.button(label="Valider Vidéaste", style=discord.ButtonStyle.success, emoji="✅", custom_id="btn_accept_videaste")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        member = guild.get_member(self.user_id) if guild else None

        if Config.ROLE_VIDEASTE_ID and member:
            role = guild.get_role(Config.ROLE_VIDEASTE_ID)
            if role:
                await member.add_roles(role)

        bot = interaction.client
        if bot.db:
            async with bot.db.acquire() as con:
                await con.execute('''
                    UPDATE "User"
                    SET role = 'VIDEASTE', "minecraftName" = COALESCE("minecraftName", $1)
                    WHERE "discordId" = $2
                ''', self.pseudo_mc, str(self.user_id))

        button.disabled = True
        await interaction.response.edit_message(view=self)
        await interaction.followup.send(f" Rôle et statut Vidéaste validés pour <@{self.user_id}> !")

    @discord.ui.button(label="Fermer le ticket", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="btn_close_ticket")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("Suppression du ticket dans 5 secondes...")
        await asyncio.sleep(5)
        await interaction.channel.delete()