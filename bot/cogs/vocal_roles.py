import discord
from discord.ext import commands

class VocalRoles(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _get_or_create_vocal_role(self, guild: discord.Guild) -> discord.Role | None:
        role = discord.utils.find(lambda r: r.name.lower() in ["en vocal", "vocal", "en voc"], guild.roles)
        if not role:
            try:
                role = await guild.create_role(
                    name="En vocal",
                    color=discord.Color(0xa855f7),
                    reason="Création automatique du rôle vocal"
                )
            except (discord.Forbidden, discord.HTTPException):
                return None
        return role

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if member.bot:
            return

        role = await self._get_or_create_vocal_role(member.guild)
        if not role:
            return

        is_afk = member.guild.afk_channel and after.channel == member.guild.afk_channel
        is_in_vocal = after.channel is not None and not is_afk

        try:
            if is_in_vocal and role not in member.roles:
                await member.add_roles(role, reason="Connexion en salon vocal")
            elif not is_in_vocal and role in member.roles:
                await member.remove_roles(role, reason="Déconnexion du salon vocal")
        except (discord.Forbidden, discord.HTTPException):
            pass

async def setup(bot: commands.Bot):
    await bot.add_cog(VocalRoles(bot))
