import discord
import uuid
from datetime import datetime
from core.config import Config
from ui.embeds.main_ticket import create_main_ticket_staff_embed

class MainTicketModal(discord.ui.Modal, title="Remplissez le formulaire suivant"):
    category = discord.ui.TextInput(
        label="Type de demande *",
        placeholder="Signalement, Bug, Question, Suggestion, Aide...",
        style=discord.TextStyle.short,
        required=True
    )
    pseudo_mc = discord.ui.TextInput(
        label="Votre pseudo Minecraft",
        placeholder="Indiquez votre pseudo en jeu (optionnel)...",
        style=discord.TextStyle.short,
        required=False,
        max_length=32
    )
    description = discord.ui.TextInput(
        label="Description claire de la demande *",
        placeholder="Détaillez clairement votre situation ou problème...",
        style=discord.TextStyle.paragraph,
        required=True
    )
    details = discord.ui.TextInput(
        label="Informations complémentaires / Preuves",
        placeholder="Coordonnées, liens vidéos/captures, logs d'erreurs...",
        style=discord.TextStyle.paragraph,
        required=False
    )

    async def on_submit(self, interaction: discord.Interaction):
        from ui.views.main_ticket_views import MainTicketStaffView

        guild = interaction.guild
        if not guild:
            return

        category_channel = guild.get_channel(Config.TICKET_CATEGORY_ID) if Config.TICKET_CATEGORY_ID else None
        staff_role = guild.get_role(Config.ROLE_STAFF_ID) if Config.ROLE_STAFF_ID else None

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True),
            guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_channels=True)
        }
        if staff_role:
            overwrites[staff_role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

        ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        channel_name = f"ticket-{interaction.user.name.lower()}"
        channel = await guild.create_text_channel(
            name=channel_name,
            category=category_channel,
            overwrites=overwrites
        )

        embed = create_main_ticket_staff_embed(
            user=interaction.user,
            category=self.category.value,
            pseudo_mc=self.pseudo_mc.value,
            description=self.description.value,
            details=self.details.value or ""
        )

        view = MainTicketStaffView(
            user_id=interaction.user.id,
            ticket_id=ticket_id,
            category=self.category.value,
            pseudo_mc=self.pseudo_mc.value,
            details=self.details.value or "Aucune"
        )

        await channel.send(
            content=f"<@{interaction.user.id}> | Un membre du staff prendra ta demande en charge dans les meilleurs délais.",
            embed=embed,
            view=view
        )
        await interaction.response.send_message(f"✅ Ton ticket a été ouvert : {channel.mention}", ephemeral=True)