import discord
from core.config import Config

def create_demotion_embed(member: discord.Member, role: str, author: discord.Member, reason: str = None) -> discord.Embed:
    embed = discord.Embed(
        title="Mouvement Staff",
        description=f"Nous vous informons que {member.mention} quitte aujourd'hui ses fonctions de **{role}**.\nNous lui souhaitons une excellente continuation.",
        color=Config.COLOR_ERROR
    )
    embed.add_field(name="Ancien rôle", value=role, inline=True)
    embed.add_field(name="Géré par", value=author.mention, inline=True)
    
    if reason:
        embed.add_field(name="Note", value=reason, inline=False)
        
    embed.set_footer(text=Config.FOOTER_TEXT)
    
    if member.display_avatar:
        embed.set_thumbnail(url=member.display_avatar.url)
        
    return embed
