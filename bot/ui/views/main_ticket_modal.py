import discord
import uuid
from datetime import datetime
from core.config import Config
from ui.embeds.main_ticket import (
    create_main_ticket_staff_embed,
    create_report_ticket_staff_embed,
    create_appeal_ticket_staff_embed
)

async def _create_ticket_channel(guild: discord.Guild, user: discord.User | discord.Member, prefix: str) -> tuple[discord.TextChannel, str]:
    category_channel = guild.get_channel(Config.TICKET_CATEGORY_ID) if Config.TICKET_CATEGORY_ID else None
    staff_role = guild.get_role(Config.ROLE_STAFF_ID) if Config.ROLE_STAFF_ID else None

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(read_messages=False),
        user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True),
        guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_channels=True)
    }
    if staff_role:
        overwrites[staff_role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

    ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    channel_name = f"{prefix}-{user.name.lower()[:20]}"
    channel = await guild.create_text_channel(
        name=channel_name,
        category=category_channel,
        overwrites=overwrites
    )
    return channel, ticket_id

class GeneralSupportModal(discord.ui.Modal, title="Support Général & Technique"):
    subject = discord.ui.TextInput(
        label="Sujet de la demande *",
        placeholder="Bug, question, problème launcher, boutique...",
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
        placeholder="Logs d'erreur, captures d'écran, coordonnées...",
        style=discord.TextStyle.paragraph,
        required=False
    )

    async def on_submit(self, interaction: discord.Interaction):
        from ui.views.main_ticket_views import MainTicketStaffView
        if not interaction.guild:
            return

        channel, ticket_id = await _create_ticket_channel(interaction.guild, interaction.user, "support")
        embed = create_main_ticket_staff_embed(
            user=interaction.user,
            category=self.subject.value,
            pseudo_mc=self.pseudo_mc.value,
            description=self.description.value,
            details=self.details.value or ""
        )
        view = MainTicketStaffView(
            user_id=interaction.user.id,
            ticket_id=ticket_id,
            category=f"Support: {self.subject.value}",
            pseudo_mc=self.pseudo_mc.value,
            details=self.details.value or "Aucune"
        )
        await channel.send(
            content=f"<@{interaction.user.id}> | Un membre du staff prendra ta demande en charge dans les meilleurs délais.",
            embed=embed,
            view=view
        )
        await interaction.response.send_message(f"✅ Ton ticket a été ouvert : {channel.mention}", ephemeral=True)

class ReportPlayerModal(discord.ui.Modal, title="Signaler un Joueur"):
    pseudo_mc = discord.ui.TextInput(
        label="Votre pseudo Minecraft *",
        placeholder="Votre pseudo en jeu...",
        style=discord.TextStyle.short,
        required=True,
        max_length=32
    )
    reported_player = discord.ui.TextInput(
        label="Pseudo du joueur signalé *",
        placeholder="Pseudo exact du joueur en infraction...",
        style=discord.TextStyle.short,
        required=True,
        max_length=32
    )
    reason = discord.ui.TextInput(
        label="Motif du signalement *",
        placeholder="Cheat/Triche, Grief, Propos injurieux, Arnaque...",
        style=discord.TextStyle.short,
        required=True
    )
    proofs = discord.ui.TextInput(
        label="Preuves (Vidéos, captures, logs) *",
        placeholder="Liens de vidéo (YouTube/Streamable), captures d'écran, coordonnées...",
        style=discord.TextStyle.paragraph,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        from ui.views.main_ticket_views import MainTicketStaffView
        if not interaction.guild:
            return

        channel, ticket_id = await _create_ticket_channel(interaction.guild, interaction.user, "report")
        embed = create_report_ticket_staff_embed(
            user=interaction.user,
            pseudo_mc=self.pseudo_mc.value,
            reported_player=self.reported_player.value,
            reason=self.reason.value,
            proofs=self.proofs.value
        )
        view = MainTicketStaffView(
            user_id=interaction.user.id,
            ticket_id=ticket_id,
            category=f"Report: {self.reported_player.value}",
            pseudo_mc=self.pseudo_mc.value,
            details=f"Motif: {self.reason.value}"
        )
        await channel.send(
            content=f"<@{interaction.user.id}> | Signalement enregistré. Un modérateur traitera les preuves fournies.",
            embed=embed,
            view=view
        )
        await interaction.response.send_message(f"🚨 Ton signalement a été transmis : {channel.mention}", ephemeral=True)

class AppealModal(discord.ui.Modal, title="Contestation de Sanction"):
    pseudo_mc = discord.ui.TextInput(
        label="Pseudo Minecraft sanctionné *",
        placeholder="Pseudo exact du compte concerné...",
        style=discord.TextStyle.short,
        required=True,
        max_length=32
    )
    sanction_type = discord.ui.TextInput(
        label="Type de sanction *",
        placeholder="Ban launcher, Ban Discord, Mute temporaire...",
        style=discord.TextStyle.short,
        required=True
    )
    reason = discord.ui.TextInput(
        label="Motif affiché lors de la sanction *",
        placeholder="Raison exacte indiquée par la modération...",
        style=discord.TextStyle.short,
        required=True
    )
    justification = discord.ui.TextInput(
        label="Pourquoi devrions-nous lever la sanction ? *",
        placeholder="Expliquez honnêtement vos arguments et votre version des faits...",
        style=discord.TextStyle.paragraph,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        from ui.views.main_ticket_views import MainTicketStaffView
        if not interaction.guild:
            return

        channel, ticket_id = await _create_ticket_channel(interaction.guild, interaction.user, "appeal")
        embed = create_appeal_ticket_staff_embed(
            user=interaction.user,
            pseudo_mc=self.pseudo_mc.value,
            sanction_type=self.sanction_type.value,
            reason=self.reason.value,
            justification=self.justification.value
        )
        view = MainTicketStaffView(
            user_id=interaction.user.id,
            ticket_id=ticket_id,
            category=f"Appel: {self.sanction_type.value}",
            pseudo_mc=self.pseudo_mc.value,
            details=f"Raison: {self.reason.value}"
        )
        await channel.send(
            content=f"<@{interaction.user.id}> | Votre appel a bien été transmis aux administrateurs.",
            embed=embed,
            view=view
        )
        await interaction.response.send_message(f"⚖️ Votre appel a été ouvert : {channel.mention}", ephemeral=True)

MainTicketModal = GeneralSupportModal