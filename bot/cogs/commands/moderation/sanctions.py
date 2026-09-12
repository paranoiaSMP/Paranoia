import discord
from discord import app_commands
from discord.ext import commands
import uuid
from datetime import datetime, timedelta, timezone
from core.appeal_storage import SANCTIONS_FILE, load_json, save_json
from ui.embeds.appeal_embeds import create_sanction_dm_embed
from ui.views.appeal_views import AppealDMView, AppealStaffView

def parse_duration(s: str | None) -> timedelta | None:
    if not s:
        return None
    s = s.strip().lower()
    units = {"s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800}
    unit = s[-1]
    if unit in units and s[:-1].isdigit():
        return timedelta(seconds=int(s[:-1]) * units[unit])
    return None

class SanctionsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self.bot.add_view(AppealDMView())
        self.bot.add_view(AppealStaffView())

    async def _send_sanction_dm(self, member: discord.Member, guild: discord.Guild, sanction_type: str, reason: str, time_str: str | None, mod: discord.User | discord.Member):
        sanctions = load_json(SANCTIONS_FILE)
        sanction_id = uuid.uuid4().hex[:6].upper()
        sanctions[str(member.id)] = {
            "guild_id": guild.id,
            "sanction_id": sanction_id,
            "user_id": member.id,
            "user_name": member.name,
            "mod_id": mod.id,
            "mod_name": mod.name,
            "sanction_type": sanction_type,
            "time": time_str,
            "reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "appealed": False
        }
        save_json(SANCTIONS_FILE, sanctions)

        embed = create_sanction_dm_embed(guild.name, sanction_type, reason, time_str)

        try:
            await member.send(embed=embed, view=AppealDMView())
            return True
        except Exception:
            return False

    @app_commands.command(name="ban", description="Bannir un membre du serveur avec motif et durée optionnelle.")
    @app_commands.describe(member="Membre à bannir", time="Durée du ban (ex: 1d, 7d, 30d)", raison="Motif de la sanction")
    @app_commands.default_permissions(ban_members=True)
    async def ban(self, interaction: discord.Interaction, member: discord.Member, time: str = None, raison: str = "Aucune raison spécifiée"):
        if member.id == interaction.user.id or member.bot:
            await interaction.response.send_message("Action impossible sur ce membre.", ephemeral=True)
            return

        if member.top_role >= interaction.user.top_role and interaction.user.id != interaction.guild.owner_id:
            await interaction.response.send_message("Vous ne pouvez pas sanctionner un membre ayant un rôle égal ou supérieur.", ephemeral=True)
            return

        await interaction.response.defer()
        dm_sent = await self._send_sanction_dm(member, interaction.guild, "ban", raison, time, interaction.user)

        try:
            await member.ban(reason=f"{raison} | Par {interaction.user.name}")
            status_dm = "(DM d'appel envoyé)" if dm_sent else "(DMs fermés)"
            await interaction.followup.send(f"🔨 **{member.name}** a été banni pour : `{raison}` {status_dm}")
        except Exception as e:
            await interaction.followup.send(f"Erreur lors du bannissement : {e}", ephemeral=True)

    @app_commands.command(name="mute", description="Rendre muet un membre avec durée et motif.")
    @app_commands.describe(member="Membre à mute", time="Durée du mute (ex: 10m, 1h, 1d, 7d)", raison="Motif de la sanction")
    @app_commands.default_permissions(moderate_members=True)
    async def mute(self, interaction: discord.Interaction, member: discord.Member, time: str = "1h", raison: str = "Aucune raison spécifiée"):
        if member.id == interaction.user.id or member.bot:
            await interaction.response.send_message("Action impossible sur ce membre.", ephemeral=True)
            return

        if member.top_role >= interaction.user.top_role and interaction.user.id != interaction.guild.owner_id:
            await interaction.response.send_message("Vous ne pouvez pas sanctionner un membre ayant un rôle égal ou supérieur.", ephemeral=True)
            return

        delta = parse_duration(time)
        if not delta:
            await interaction.response.send_message("Format de durée invalide. Exemples : `10m`, `1h`, `1d`, `7d`.", ephemeral=True)
            return

        await interaction.response.defer()
        dm_sent = await self._send_sanction_dm(member, interaction.guild, "mute", raison, time, interaction.user)

        try:
            await member.timeout(delta, reason=f"{raison} | Par {interaction.user.name}")
            status_dm = "(DM d'appel envoyé)" if dm_sent else "(DMs fermés)"
            await interaction.followup.send(f"🔇 **{member.name}** a été rendu muet pour `{time}`. Raison : `{raison}` {status_dm}")
        except Exception as e:
            await interaction.followup.send(f"Erreur lors du mute : {e}", ephemeral=True)

    @app_commands.command(name="kick", description="Expulser un membre du serveur avec motif.")
    @app_commands.describe(member="Membre à expulser", raison="Motif de la sanction")
    @app_commands.default_permissions(kick_members=True)
    async def kick(self, interaction: discord.Interaction, member: discord.Member, raison: str = "Aucune raison spécifiée"):
        if member.id == interaction.user.id or member.bot:
            await interaction.response.send_message("Action impossible sur ce membre.", ephemeral=True)
            return

        if member.top_role >= interaction.user.top_role and interaction.user.id != interaction.guild.owner_id:
            await interaction.response.send_message("Vous ne pouvez pas sanctionner un membre ayant un rôle égal ou supérieur.", ephemeral=True)
            return

        await interaction.response.defer()
        dm_sent = await self._send_sanction_dm(member, interaction.guild, "kick", raison, None, interaction.user)

        try:
            await member.kick(reason=f"{raison} | Par {interaction.user.name}")
            status_dm = "(DM d'appel envoyé)" if dm_sent else "(DMs fermés)"
            await interaction.followup.send(f"👢 **{member.name}** a été expulsé pour : `{raison}` {status_dm}")
        except Exception as e:
            await interaction.followup.send(f"Erreur lors de l'expulsion : {e}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(SanctionsCog(bot))
