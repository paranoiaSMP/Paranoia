import discord
from core.config import Config
from ui.embeds.ticket import create_ticket_staff_embed

class VideasteModal(discord.ui.Modal, title="Remplissez le formulaire suivant"):
    pseudo_mc = discord.ui.TextInput(
        label="Votre pseudo Minecraft *",
        placeholder="Indique ton pseudo en jeu...",
        style=discord.TextStyle.short,
        required=True,
        max_length=32
    )
    youtube = discord.ui.TextInput(
        label="Lien chaîne YouTube",
        placeholder="https://youtube.com/@...",
        style=discord.TextStyle.short,
        required=False
    )
    twitch = discord.ui.TextInput(
        label="Lien chaîne Twitch",
        placeholder="https://twitch.tv/...",
        style=discord.TextStyle.short,
        required=False
    )
    tiktok = discord.ui.TextInput(
        label="Lien compte TikTok",
        placeholder="https://tiktok.com/@...",
        style=discord.TextStyle.short,
        required=False
    )
    presentation = discord.ui.TextInput(
        label="Présentation & Nombre d'abonnés *",
        placeholder="Décris ton contenu, ta fréquence de vidéo/stream et tes projets sur Paranoia...",
        style=discord.TextStyle.paragraph,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        from ui.views.ticket_view import TicketStaffView

        guild = interaction.guild
        if not guild:
            return

        category = guild.get_channel(Config.TICKET_CATEGORY_ID) if Config.TICKET_CATEGORY_ID else None
        staff_role = guild.get_role(Config.ROLE_STAFF_ID) if Config.ROLE_STAFF_ID else None

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            interaction.user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True),
            guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_channels=True)
        }
        if staff_role:
            overwrites[staff_role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

        channel_name = f"videaste-{interaction.user.name.lower()}"
        channel = await guild.create_text_channel(
            name=channel_name,
            category=category,
            overwrites=overwrites
        )

        embed = create_ticket_staff_embed(
            user=interaction.user,
            pseudo_mc=self.pseudo_mc.value,
            youtube=self.youtube.value,
            twitch=self.twitch.value,
            tiktok=self.tiktok.value,
            presentation=self.presentation.value
        )

        view = TicketStaffView(
            user_id=interaction.user.id,
            pseudo_mc=self.pseudo_mc.value,
            youtube=self.youtube.value,
            twitch=self.twitch.value,
            tiktok=self.tiktok.value
        )

        await channel.send(
            content=f"<@{interaction.user.id}> | Candidature transmise au Staff.",
            embed=embed,
            view=view
        )
        await interaction.response.send_message(f" Formulaire envoyé ! Ton ticket a été ouvert : {channel.mention}", ephemeral=True)