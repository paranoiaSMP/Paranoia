import discord
from core.config import Config

def create_main_ticket_panel_embed() -> discord.Embed:
    description = (
        "Bienvenue dans le système de tickets de Paranoia Studio.\n\n"
        "**À quoi servent les tickets ?**\n"
        "— Signaler un joueur ou un comportement inapproprié\n"
        "— Signaler un problème technique ou un bug\n"
        "— Poser une question au staff\n"
        "— Faire une suggestion pour améliorer le serveur\n"
        "— Demander de l’aide sur le serveur ou le Discord\n\n"
        "**Comment ça fonctionne ?**\n"
        "1. Appuie sur le bouton \"Ouvrir un ticket\" ci-dessous.\n"
        "2. Décris clairement ta demande.\n"
        "3. Un membre du staff prendra ta demande en charge dans les meilleurs délais.\n\n"
        "Merci de fournir un maximum d’informations afin de faciliter le traitement de ton ticket."
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