import discord

def create_promotion_embed(member: discord.Member, role: str, author: discord.Member, reason: str = None) -> discord.Embed:
    embed = discord.Embed(
        title="Staff Promotion",
        description=f"Rank update for {member.mention} who has been promoted to **{role}**.\nActive daily and doing a great job, a well-deserved promotion.",
        color=0x22c55e
    )
    embed.add_field(name="New Role", value=role, inline=True)
    embed.add_field(name="Promoted by", value=author.mention, inline=True)

    if reason:
        embed.add_field(name="Note", value=reason, inline=False)

    embed.set_footer(text="Congratulations!")
    if member.display_avatar:
        embed.set_thumbnail(url=member.display_avatar.url)

    return embed
