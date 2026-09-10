import asyncio
import discord
from discord.ext import commands

class VocalRoles(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.lock = asyncio.Lock()

    async def _get_or_create_vocal_role(self, guild: discord.Guild, name: str) -> discord.Role | None:
        role = discord.utils.get(guild.roles, name=name)
        if role:
            return role
        async with self.lock:
            role = discord.utils.get(guild.roles, name=name)
            if not role:
                try:
                    role = await guild.create_role(
                        name=name,
                        color=discord.Color(0xa855f7),
                        reason=f"Rôle vocal automatique pour {name}"
                    )
                except (discord.Forbidden, discord.HTTPException):
                    return None
            return role

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if member.bot:
            return

        guild = member.guild
        afk = guild.afk_channel

        if before.channel and before.channel != after.channel:
            old_role = discord.utils.get(guild.roles, name=before.channel.name)
            if old_role:
                try:
                    if old_role in member.roles:
                        await member.remove_roles(old_role, reason="Quitté le salon vocal")
                    if len(before.channel.members) == 0:
                        await old_role.delete(reason="Salon vocal vide")
                except (discord.Forbidden, discord.HTTPException):
                    pass

        if after.channel and after.channel != before.channel and after.channel != afk:
            role = await self._get_or_create_vocal_role(guild, after.channel.name)
            if role:
                try:
                    if role not in member.roles:
                        await member.add_roles(role, reason="Rejoint le salon vocal")
                except (discord.Forbidden, discord.HTTPException):
                    pass

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel: discord.abc.GuildChannel):
        if isinstance(channel, (discord.VoiceChannel, discord.StageChannel)):
            role = discord.utils.get(channel.guild.roles, name=channel.name)
            if role:
                try:
                    await role.delete(reason="Salon vocal supprimé")
                except (discord.Forbidden, discord.HTTPException):
                    pass

async def setup(bot: commands.Bot):
    await bot.add_cog(VocalRoles(bot))
