import discord
from discord import app_commands
from discord.ext import commands
from core.config import Config

class VocalRoles(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.vocal_role_id = Config.ROLE_VOCAL_ID

    def _get_vocal_role(self, guild: discord.Guild) -> discord.Role | None:
        if self.vocal_role_id:
            role = guild.get_role(self.vocal_role_id)
            if role:
                return role
        return discord.utils.find(lambda r: r.name.lower() in ["en vocal", "vocal", "en voc"], guild.roles)

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if member.bot:
            return

        role = self._get_vocal_role(member.guild)
        if not role:
            return

        is_afk = member.guild.afk_channel and after.channel == member.guild.afk_channel
        is_in_vocal = after.channel is not None and not is_afk

        try:
            if is_in_vocal and role not in member.roles:
                await member.add_roles(role, reason="Connexion en salon vocal")
            elif not is_in_vocal and role in member.roles:
                await member.remove_roles(role, reason="Déconnexion du salon vocal")
        except discord.Forbidden:
            pass
        except Exception:
            pass

    @app_commands.command(name="set_vocal_role", description="Définit le rôle attribué aux membres en vocal.")
    @app_commands.default_permissions(administrator=True)
    async def set_vocal_role(self, interaction: discord.Interaction, role: discord.Role):
        self.vocal_role_id = role.id
        await interaction.response.send_message(f"Rôle vocal configuré sur {role.mention} (ID: `{role.id}`).", ephemeral=True)

    @app_commands.command(name="sync_vocal_roles", description="Synchronise le rôle vocal pour tous les membres actuellement connectés.")
    @app_commands.default_permissions(administrator=True)
    async def sync_vocal_roles(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        role = self._get_vocal_role(interaction.guild)
        if not role:
            await interaction.followup.send("Aucun rôle vocal trouvé. Utilisez `/set_vocal_role` d'abord.", ephemeral=True)
            return

        added = 0
        removed = 0
        afk = interaction.guild.afk_channel

        voice_members = set()
        for vc in interaction.guild.voice_channels:
            if vc != afk:
                for m in vc.members:
                    if not m.bot:
                        voice_members.add(m)

        for m in voice_members:
            if role not in m.roles:
                try:
                    await m.add_roles(role, reason="Sync vocal role")
                    added += 1
                except Exception:
                    pass

        for m in role.members:
            if m not in voice_members:
                try:
                    await m.remove_roles(role, reason="Sync vocal role")
                    removed += 1
                except Exception:
                    pass

        await interaction.followup.send(f"Synchronisation terminée : +{added} rôle(s) ajouté(s), -{removed} retiré(s).", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(VocalRoles(bot))
