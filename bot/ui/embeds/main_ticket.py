import discord
from core.config import Config

def create_main_ticket_panel_v2_payload() -> dict:
    return {
        "flags": 32768,
        "content": None,
        "embeds": [],
        "components": [
            {
                "type": 12,
                "items": [
                    {
                        "media": {
                            "url": "https://files.catbox.moe/g1etwk.png"
                        }
                    }
                ]
            },
            {
                "type": 17,
                "accent_color": 11032055,
                "components": [
                    {
                        "type": 10,
                        "content": "# Contact Support\nVous souhaitez entrer en contact avec l'équipe de **Paranoia Studio** ?\nSuivez les indications ci-dessous et sélectionnez la catégorie adaptée à votre situation.\n\n*Ce salon est strictement réservé aux demandes d'assistance légitimes. Tout abus sera sanctionné.*"
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": True
                    },
                    {
                        "type": 10,
                        "content": "### 🛠️ Support Général & Technique\nUne question sur le serveur, un problème avec le launcher, la boutique ou un bug en jeu ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 1,
                                "label": "Ticket Support",
                                "emoji": {"name": "🛠️"},
                                "custom_id": "btn_open_general_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": True
                    },
                    {
                        "type": 10,
                        "content": "### 🚨 Signalement Joueur (Report)\nUn joueur enfreint le règlement (cheat, grief, propos inappropriés ou comportement toxique) ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 4,
                                "label": "Signaler un joueur",
                                "emoji": {"name": "🚨"},
                                "custom_id": "btn_open_report_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": True
                    },
                    {
                        "type": 10,
                        "content": "### 🎥 Candidature Vidéaste & Partenariat\nTu crées du contenu sur YouTube, Twitch ou TikTok ? Postule pour intégrer le programme créateur officiel."
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 1,
                                "label": "Postuler Vidéaste",
                                "emoji": {"name": "🎥"},
                                "custom_id": "btn_open_videaste_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": True
                    },
                    {
                        "type": 10,
                        "content": "### ⚖️ Contestation de Sanction (Appeals)\nTu as reçu une sanction (ban, mute) et tu souhaites déposer une demande de révision argumentée ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 2,
                                "label": "Faire un appel",
                                "emoji": {"name": "⚖️"},
                                "custom_id": "btn_open_appeal_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": True
                    },
                    {
                        "type": 10,
                        "content": "> 📌 **Important :** Ne mentionnez aucun membre du staff dans votre ticket afin de ne pas ralentir le traitement.\n> 🌐 **Recrutement Staff :** Les candidatures (Modérateur, Helper) s'effectuent sur [paranoiasmp.fr/candidature](https://paranoiasmp.fr/candidature)."
                    }
                ]
            }
        ]
    }

def create_main_ticket_panel_embed() -> discord.Embed:
    description = (
        "Vous souhaitez entrer en contact avec l'équipe de **Paranoia Studio** ?\n"
        "Suivez les indications ci-dessous et sélectionnez la catégorie adaptée à votre situation.\n\n"
        "**NOTE :** Ce salon est strictement réservé aux demandes d'assistance légitimes. "
        "L'ouverture d'un ticket sans motif valable ou tout abus entraînera une sanction.\n\n"
        "───────────────────────────────\n\n"
        "**🛠️ Support Général & Technique**\n"
        "Une question sur le serveur, un problème avec le launcher, la boutique ou un bug en jeu ? "
        "Pour les questions rapides entre joueurs, pensez d'abord au salon d'entraide.\n\n"
        "───────────────────────────────\n\n"
        "**🚨 Signalement Joueur (Report)**\n"
        "Un joueur enfreint le règlement (cheat, grief, propos inappropriés ou comportement toxique) ? "
        "Merci de fournir des preuves (liens de vidéos, captures ou logs).\n\n"
        "───────────────────────────────\n\n"
        "**🎥 Candidature Vidéaste & Partenariat**\n"
        "Tu crées du contenu sur YouTube, Twitch ou TikTok ? Postule pour intégrer le programme créateur officiel de Paranoia Studio.\n\n"
        "───────────────────────────────\n\n"
        "**⚖️ Contestation de Sanction (Appeals)**\n"
        "Tu as reçu une sanction (ban, mute) et tu souhaites déposer une demande de révision argumentée auprès de l'administration.\n\n"
        "───────────────────────────────\n\n"
        "**📌 Notes additionnelles :**\n"
        "• Pour postuler en tant que **Modérateur / Staff**, rendez-vous sur le site : [paranoiasmp.fr/candidature](https://paranoiasmp.fr/candidature)\n"
        "• Ne mentionnez **aucun membre du staff** dans votre ticket afin de ne pas ralentir le traitement."
    )
    embed = discord.Embed(
        title="Contact Support",
        description=description,
        color=0xa855f7
    )
    embed.set_thumbnail(url="https://raw.githubusercontent.com/paranoiaSMP/Paranoia/main/public/Paranoia_logo.png")
    embed.set_image(url="https://files.catbox.moe/g1etwk.png")
    embed.set_footer(text=f"{Config.FOOTER_TEXT} • Support Officiel")
    return embed

def create_main_ticket_staff_embed(user: discord.User | discord.Member, category: str, pseudo_mc: str, description: str, details: str) -> discord.Embed:
    embed = discord.Embed(
        title="🛠️ Nouveau Ticket Support",
        description=f"Ticket ouvert par <@{user.id}>",
        color=0xa855f7
    )
    embed.add_field(name="Catégorie", value=f"`{category}`", inline=True)
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

def create_report_ticket_staff_embed(user: discord.User | discord.Member, pseudo_mc: str, reported_player: str, reason: str, proofs: str) -> discord.Embed:
    embed = discord.Embed(
        title="🚨 Signalement de Joueur",
        description=f"Signalement déposé par <@{user.id}>",
        color=0xef4444
    )
    embed.add_field(name="Auteur", value=f"`{pseudo_mc or user.name}`", inline=True)
    embed.add_field(name="Joueur signalé", value=f"**`{reported_player}`**", inline=True)
    if reported_player:
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{reported_player}.png")
    embed.add_field(name="Motif de l'infraction", value=reason, inline=False)
    embed.add_field(name="Preuves fournies", value=proofs or "*Aucune preuve fournie*", inline=False)
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed

def create_appeal_ticket_staff_embed(user: discord.User | discord.Member, pseudo_mc: str, sanction_type: str, reason: str, justification: str) -> discord.Embed:
    embed = discord.Embed(
        title="⚖️ Contestation de Sanction",
        description=f"Appel déposé par <@{user.id}>",
        color=0xeab308
    )
    embed.add_field(name="Compte sanctionné", value=f"`{pseudo_mc}`", inline=True)
    embed.add_field(name="Type de sanction", value=f"`{sanction_type}`", inline=True)
    if pseudo_mc:
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{pseudo_mc}.png")
    embed.add_field(name="Raison annoncée", value=reason, inline=False)
    embed.add_field(name="Arguments & Justification", value=justification, inline=False)
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed