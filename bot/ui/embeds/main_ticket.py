import discord
from core.config import Config

def create_main_ticket_panel_embed() -> discord.Embed:
    description = (
        "Bienvenue dans le système de tickets de Paranoia Studio.\n\n"
        "**📩 Support & Assistance**\n"
        "— Signaler un joueur ou un comportement inapproprié\n"
        "— Signaler un problème technique ou un bug\n"
        "— Poser une question au staff\n"
        "— Faire une suggestion pour le serveur\n"
        "— Obtenir de l'aide générale\n\n"
        "**🎥 Candidature Vidéaste / Partenaire**\n"
        "— Tu crées du contenu sur YouTube, Twitch ou TikTok ?\n"
        "— Postule directement pour rejoindre l'équipe des créateurs Paranoia !\n\n"
        "**Comment faire ?**\n"
        "Clique sur le bouton correspondant ci-dessous selon ta demande."
    )
    embed = discord.Embed(
        title="───── SYSTÈME DE TICKETS ─────",
        description=description,
        color=Config.COLOR_INFO
    )
    embed.set_image(url="https://files.catbox.moe/g1etwk.png")
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed

def create_main_ticket_staff_embed(user: discord.User | discord.Member, category: str, pseudo_mc: str, description: str, details: str) -> discord.Embed:
    embed = discord.Embed(
        title="📩 Nouveau Ticket",
        description=f"Ticket ouvert par <@{user.id}>",
        color=Config.COLOR_INFO
    )
    embed.add_field(name="Type de demande", value=f"`{category}`", inline=True)
    if pseudo_mc:
        embed.add_field(name="Pseudo Minecraft", value=f"`{pseudo_mc}`", inline=True)
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{pseudo_mc}.png")
    else:
        embed.add_field(name="Pseudo Minecraft", value="*Non renseigné*", inline=True)
    embed.add_field(name="Description", value=description, inline=False)
    if details:
        embed.add_field(name="Informations complémentaires", value=details, inline=False)
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed