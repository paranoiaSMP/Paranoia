import discord
import asyncio
from core.config import Config
from core.ticket_logger import generate_ticket_log
from ui.views.main_ticket_modal import (
    GeneralSupportModal,
    ReportPlayerModal,
    AppealModal
)

class MainTicketLaunchView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Ticket Support", style=discord.ButtonStyle.primary, emoji="🛠️", custom_id="btn_open_general_ticket", row=0)
    async def open_support_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(GeneralSupportModal())

    @discord.ui.button(label="Signaler un joueur", style=discord.ButtonStyle.danger, emoji="🚨", custom_id="btn_open_report_ticket", row=0)
    async def open_report_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(ReportPlayerModal())

    @discord.ui.button(label="Postuler Vidéaste", style=discord.ButtonStyle.secondary, emoji="🎥", custom_id="btn_open_videaste_ticket", row=1)
    async def open_videaste_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        from ui.views.videaste_modal import VideasteModal
        await interaction.response.send_modal(VideasteModal())

    @discord.ui.button(label="Faire un appel", style=discord.ButtonStyle.secondary, emoji="⚖️", custom_id="btn_open_appeal_ticket", row=1)
    async def open_appeal_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(AppealModal())


class MainTicketStaffView(discord.ui.View):
    def __init__(self, user_id: int, ticket_id: str, category: str, pseudo_mc: str, details: str):
        super().__init__(timeout=None)
        self.user_id = user_id
        self.ticket_id = ticket_id
        self.category = category
        self.pseudo_mc = pseudo_mc
        self.details = details
        self.claimed_by = "Aucun"

    @discord.ui.button(label="Prendre en charge", style=discord.ButtonStyle.secondary, emoji="✋", custom_id="btn_claim_general_ticket")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.claimed_by = interaction.user.name
        button.disabled = True
        button.label = f"Pris par {interaction.user.name}"
        await interaction.response.edit_message(view=self)
        await interaction.followup.send(f" Ticket pris en charge par <@{interaction.user.id}>.")

    @discord.ui.button(label="Fermer le ticket", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="btn_close_general_ticket")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()

        metadata = {
            "Type de ticket": self.category,
            "Pseudo MC": self.pseudo_mc or "Non renseigné",
            "Compléments": self.details
        }

        log_id, message_text, log_file = await generate_ticket_log(
            channel=interaction.channel,
            client_id=self.user_id,
            ticket_id=self.ticket_id,
            metadata=metadata,
            claimed_by=self.claimed_by
        )

        guild = interaction.guild
        if guild and Config.TICKET_LOG_CHANNEL_ID:
            log_channel = guild.get_channel(Config.TICKET_LOG_CHANNEL_ID)
            if log_channel:
                await log_channel.send(content=message_text, file=log_file)

        await interaction.followup.send("🔒 Fermeture du ticket dans 5 secondes...")
        await asyncio.sleep(5)
        await interaction.channel.delete()