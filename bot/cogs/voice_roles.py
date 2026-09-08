import discord
from discord.ext import commands

class VoiceRoles(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
        await self._sync_all_voice_roles()

    async def _get_or_create_voice_role(self, channel: discord.VoiceChannel | discord.StageChannel, create: bool = True) -> discord.Role | None:
        guild = channel.guild
        if not guild.me.guild_permissions.manage_roles:
            return None

        role = discord.utils.find(
            lambda r: r.name.lower() == channel.name.lower() and r.permissions <= discord.Permissions.none(),
            guild.roles
        )

        if not role and create:
            try:
                role = await guild.create_role(
                    name=channel.name,
                    permissions=discord.Permissions.none(),
                    mentionable=True,
                    reason=f"Role vocal pour {channel.name}"
                )
            except discord.HTTPException:
                return None
        elif role and not role.mentionable and role < guild.me.top_role:
            try:
                await role.edit(mentionable=True)
            except discord.HTTPException:
                pass

        return role

    async def _sync_all_voice_roles(self):
        for guild in self.bot.guilds:
            if not guild.me.guild_permissions.manage_roles:
                continue

            voice_channels = list(guild.voice_channels) + list(guild.stage_channels)
            for vc in voice_channels:
                role = await self._get_or_create_voice_role(vc, create=bool(vc.members))
                if not role or role >= guild.me.top_role:
                    continue

                current_member_ids = {m.id for m in vc.members}

                for member in vc.members:
                    if role not in member.roles:
                        try:
                            await member.add_roles(role, reason="Sync vocal démarrage")
                        except discord.HTTPException:
                            pass

                for member in role.members:
                    if member.id not in current_member_ids:
                        try:
                            await member.remove_roles(role, reason="Sync vocal nettoyage")
                        except discord.HTTPException:
                            pass

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if before.channel == after.channel:
            return

        guild = member.guild
        if not guild.me.guild_permissions.manage_roles:
            return

        if before.channel:
            role_before = await self._get_or_create_voice_role(before.channel, create=False)
            if role_before and role_before in member.roles and role_before < guild.me.top_role:
                try:
                    await member.remove_roles(role_before, reason=f"Quitte {before.channel.name}")
                except discord.HTTPException:
                    pass

        if after.channel:
            role_after = await self._get_or_create_voice_role(after.channel, create=True)
            if role_after and role_after not in member.roles and role_after < guild.me.top_role:
                try:
                    await member.add_roles(role_after, reason=f"Rejoint {after.channel.name}")
                except discord.HTTPException:
                    pass

    @commands.Cog.listener()
    async def on_guild_channel_update(self, before: discord.abc.GuildChannel, after: discord.abc.GuildChannel):
        if not isinstance(before, (discord.VoiceChannel, discord.StageChannel)):
            return
        if before.name != after.name:
            role = discord.utils.find(
                lambda r: r.name.lower() == before.name.lower() and r.permissions <= discord.Permissions.none(),
                after.guild.roles
            )
            if role and role < after.guild.me.top_role:
                try:
                    await role.edit(name=after.name)
                except discord.HTTPException:
                    pass

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel: discord.abc.GuildChannel):
        if not isinstance(channel, (discord.VoiceChannel, discord.StageChannel)):
            return
        role = discord.utils.find(
            lambda r: r.name.lower() == channel.name.lower() and r.permissions <= discord.Permissions.none(),
            channel.guild.roles
        )
        if role and role < channel.guild.me.top_role:
            try:
                await role.delete(reason="Salon vocal supprime")
            except discord.HTTPException:
                pass

async def setup(bot: commands.Bot):
    await bot.add_cog(VoiceRoles(bot))
