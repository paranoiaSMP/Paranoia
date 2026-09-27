import discord
import os
import uuid
from datetime import datetime, timezone
from core.config import Config
from core.appeal_storage import APPEALS_FILE, SANCTIONS_FILE, load_json, save_json
from ui.embeds.appeal_embeds import create_appeal_forum_embed, create_appeal_decision_embed

class AppealStaffView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Accepter l'appel", style=discord.ButtonStyle.success, emoji="✅", custom_id="btn_staff_accept_appeal")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not interaction.guild:
            return
        staff_role = interaction.guild.get_role(Config.ROLE_STAFF_ID) if Config.ROLE_STAFF_ID else None
        is_staff = interaction.user.guild_permissions.moderate_members or (staff_role and staff_role in interaction.user.roles)
        if not is_staff:
            await interaction.response.send_message("Tu n'as pas la permission d'effectuer cette action.", ephemeral=True)
            return

        appeals = load_json(APPEALS_FILE)
        appeal_data = appeals.get(str(interaction.channel_id))
        if not appeal_data:
            await interaction.response.send_message("Données d'appel introuvables.", ephemeral=True)
            return

        if appeal_data.get("status") in ["accepted", "rejected"]:
            await interaction.response.send_message("Cet appel a déjà été traité.", ephemeral=True)
            return

        await interaction.response.defer()
        user_id = appeal_data["user_id"]
        sanction_type = appeal_data["sanction_type"]

        if sanction_type == "ban":
            try:
                await interaction.guild.unban(discord.Object(id=user_id), reason=f"Appel accepté par {interaction.user}")
            except Exception:
                pass
        elif sanction_type == "mute":
            target_member = interaction.guild.get_member(user_id)
            if target_member:
                try:
                    await target_member.timeout(None, reason=f"Appel accepté par {interaction.user}")
                except Exception:
                    pass

        target_user = interaction.client.get_user(user_id)
        if not target_user:
            try:
                target_user = await interaction.client.fetch_user(user_id)
            except Exception:
                target_user = None

        if target_user:
            try:
                embed_dm = create_appeal_decision_embed(interaction.guild.name, accepted=True)
                await target_user.send(embed=embed_dm)
            except Exception:
                pass

        appeal_data["status"] = "accepted"
        appeal_data["processed_by"] = interaction.user.name
        save_json(APPEALS_FILE, appeals)

        for child in self.children:
            if isinstance(child, discord.ui.Button) and child.custom_id in ["btn_staff_accept_appeal", "btn_staff_reject_appeal"]:
                child.disabled = True

        try:
            await interaction.message.edit(view=self)
        except Exception:
            pass

        await interaction.channel.send(f"✅ Appel accepté par <@{interaction.user.id}>. La sanction a été annulée.")

    @discord.ui.button(label="Rejeter l'appel", style=discord.ButtonStyle.danger, emoji="❌", custom_id="btn_staff_reject_appeal")
    async def reject(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not interaction.guild:
            return
        staff_role = interaction.guild.get_role(Config.ROLE_STAFF_ID) if Config.ROLE_STAFF_ID else None
        is_staff = interaction.user.guild_permissions.moderate_members or (staff_role and staff_role in interaction.user.roles)
        if not is_staff:
            await interaction.response.send_message("Tu n'as pas la permission d'effectuer cette action.", ephemeral=True)
            return

        appeals = load_json(APPEALS_FILE)
        appeal_data = appeals.get(str(interaction.channel_id))
        if not appeal_data:
            await interaction.response.send_message("Données d'appel introuvables.", ephemeral=True)
            return

        if appeal_data.get("status") in ["accepted", "rejected"]:
            await interaction.response.send_message("Cet appel a déjà été traité.", ephemeral=True)
            return

        await interaction.response.defer()
        user_id = appeal_data["user_id"]

        target_user = interaction.client.get_user(user_id)
        if not target_user:
            try:
                target_user = await interaction.client.fetch_user(user_id)
            except Exception:
                target_user = None

        if target_user:
            try:
                embed_dm = create_appeal_decision_embed(interaction.guild.name, accepted=False)
                await target_user.send(embed=embed_dm)
            except Exception:
                pass

        appeal_data["status"] = "rejected"
        appeal_data["processed_by"] = interaction.user.name
        save_json(APPEALS_FILE, appeals)

        for child in self.children:
            if isinstance(child, discord.ui.Button) and child.custom_id in ["btn_staff_accept_appeal", "btn_staff_reject_appeal"]:
                child.disabled = True

        try:
            await interaction.message.edit(view=self)
        except Exception:
            pass

        await interaction.channel.send(f"❌ Appel rejeté par <@{interaction.user.id}>. La sanction reste active.")

    @discord.ui.button(label="Fermer le dossier", style=discord.ButtonStyle.secondary, emoji="🔒", custom_id="btn_staff_close_appeal")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("🔒 Clôture et archivage du dossier...", ephemeral=True)
        if hasattr(interaction.channel, "edit"):
            try:
                await interaction.channel.edit(archived=True, locked=True)
            except Exception:
                pass

class AppealModal(discord.ui.Modal, title="Contestation de Sanction"):
    def __init__(self, sanction: dict):
        super().__init__()
        self.sanction = sanction

    pseudo_mc = discord.ui.TextInput(
        label="Pseudo Minecraft (si applicable)",
        placeholder="Votre pseudo en jeu...",
        style=discord.TextStyle.short,
        required=False,
        max_length=32
    )

    arguments = discord.ui.TextInput(
        label="Pourquoi devrions-nous lever la sanction ? *",
        placeholder="Expliquez honnêtement vos arguments et votre version des faits...",
        style=discord.TextStyle.paragraph,
        required=True,
        min_length=15,
        max_length=1000
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        guild = interaction.client.get_guild(self.sanction["guild_id"])
        if not guild:
            try:
                guild = await interaction.client.fetch_guild(self.sanction["guild_id"])
            except Exception:
                await interaction.followup.send("Erreur : Impossible d'accéder au serveur.", ephemeral=True)
                return

        target_channel = None
        appeal_forum_id = getattr(Config, "APPEAL_FORUM_CHANNEL_ID", 0) or int(os.getenv("APPEAL_FORUM_CHANNEL_ID", "0") or "0")
        if appeal_forum_id:
            target_channel = guild.get_channel(appeal_forum_id)

        if not target_channel:
            for ch in guild.channels:
                if ch.type == discord.ChannelType.forum:
                    target_channel = ch
                    break

        if not target_channel:
            for ch in guild.text_channels:
                if "appeal" in ch.name.lower() or "sanction" in ch.name.lower():
                    target_channel = ch
                    break

        if not target_channel:
            target_channel = guild.get_channel(Config.TICKET_LOG_CHANNEL_ID) if Config.TICKET_LOG_CHANNEL_ID else None

        if not target_channel and guild.text_channels:
            target_channel = guild.text_channels[0]

        if not target_channel:
            await interaction.followup.send("Erreur : Aucun salon configuré pour recevoir les appels.", ephemeral=True)
            return

        short_id = uuid.uuid4().hex[:5].upper()
        thread_name = f"Apeal-{short_id}"
        embed = create_appeal_forum_embed(interaction.user, self.pseudo_mc.value, self.sanction, self.arguments.value, short_id)
        view = AppealStaffView()

        thread = None
        if hasattr(target_channel, "create_thread"):
            try:
                if target_channel.type == discord.ChannelType.forum:
                    res = await target_channel.create_thread(name=thread_name, embed=embed, view=view)
                    thread = res.thread if hasattr(res, "thread") else res
                else:
                    thread = await target_channel.create_thread(name=thread_name, embed=embed, view=view)
            except Exception:
                pass

        if not thread:
            msg = await target_channel.send(embed=embed, view=view)
            thread = msg

        appeals = load_json(APPEALS_FILE)
        appeals[str(thread.id)] = {
            "user_id": interaction.user.id,
            "guild_id": self.sanction["guild_id"],
            "sanction_type": self.sanction["sanction_type"],
            "reason": self.sanction.get("reason"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        save_json(APPEALS_FILE, appeals)

        sanctions = load_json(SANCTIONS_FILE)
        user_key = str(interaction.user.id)
        if user_key in sanctions:
            sanctions[user_key]["appealed"] = True
            save_json(SANCTIONS_FILE, sanctions)

        await interaction.followup.send(
            "⚖️ Votre appel a été transmis à l'équipe d'administration. Vous recevrez une notification ici dès qu'une décision sera prise.",
            ephemeral=True
        )

class AppealDMView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Faire un appel", style=discord.ButtonStyle.secondary, emoji="⚖️", custom_id="btn_open_appeal_modal")
    async def open_appeal(self, interaction: discord.Interaction, button: discord.ui.Button):
        sanctions = load_json(SANCTIONS_FILE)
        user_sanction = sanctions.get(str(interaction.user.id))
        if not user_sanction:
            await interaction.response.send_message("Aucune sanction enregistrée n'est éligible à un appel.", ephemeral=True)
            return

        if user_sanction.get("appealed"):
            await interaction.response.send_message("Vous avez déjà soumis une contestation pour cette sanction. Veuillez patienter.", ephemeral=True)
            return

        await interaction.response.send_modal(AppealModal(user_sanction))
