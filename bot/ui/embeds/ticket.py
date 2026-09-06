import discord
from core.config import Config

def create_ticket_staff_panel_embed():
    embed = discord.Embed(
        title="Candidature Videaste / Partenaire ",
        description="Tu souhaites devenir videaste sur le Paranoia Studio ? \n\n Clique sur le bouton ci-dessous pour replire le formulaire avec tes resaux (ex: Youtube, Tiktok, Twitch)",
        color=0xa855f7
    )

    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed

def create_ticket_staff_embed(user: discord.User | discord.Member, pseudo_mc: str, youtube: str, twitch: str, tiktok: str ,presentation: str) -> discord.Embed:
    embed = discord.Embed(
        title=" Candidature Videaste Recu",
        description=f"Formulaire soumis par <@{user.id}>",
        color=0xa855f7
    )

    embed.add_field(name="Pseudo Minecraft",value=f"`{pseudo_mc}`", inline=False)
    embed.add_field(name="Youtube",value=youtube or "*Non renseigné*", inline=True)
    embed.add_field(name="Twitch", value=twitch or "*Non renseigné*", inline=True)
    embed.add_field(name="tiktok", value=tiktok or "*Non renseigné*", inline=True)

    embed.set_thumbnail(url=f"https://vzge.me/face/512/{pseudo_mc}.png")
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed



