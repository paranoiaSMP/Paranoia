import discord
from datetime import datetime, timezone
from core.config import Config

def create_sanction_dm_embed(guild_name: str, sanction_type: str, reason: str, time_str: str | None) -> discord.Embed:
    desc = (
        f"Tu as reçu une sanction (**{sanction_type.upper()}**) sur le serveur **{guild_name}**.\n\n"
        f"**Motif :** {reason}\n"
    )
    if time_str:
        desc += f"**Durée :** {time_str}\n"
    desc += "\nTu as reçu une sanction (ban, mute) et tu souhaites déposer une demande de révision argumentée ?"

    embed = discord.Embed(
        title="⚖️ Contestation de Sanction (Appeals)",
        description=desc,
        color=0x7a0aad
    )
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed

def create_appeal_forum_embed(user: discord.User | discord.Member, mc_pseudo: str, sanction: dict, arguments: str, short_id: str) -> discord.Embed:
    embed = discord.Embed(
        title=f"⚖️ Demande d'Appel #{short_id}",
        description="Une contestation de sanction a été déposée par le joueur.",
        color=0x7a0aad,
        timestamp=datetime.now(timezone.utc)
    )
    embed.add_field(name="Membre sanctionné", value=f"<@{user.id}> ({user.name})", inline=True)
    embed.add_field(name="Pseudo Minecraft", value=mc_pseudo or "Non renseigné", inline=True)
    embed.add_field(name="Sanction contestée", value=sanction.get("sanction_type", "INCONNUE").upper(), inline=True)
    embed.add_field(name="Motif initial", value=sanction.get("reason", "Non renseigné"), inline=True)
    embed.add_field(name="Durée", value=sanction.get("time") or "Permanente", inline=True)
    embed.add_field(name="Modérateur", value=f"<@{sanction.get('mod_id')}>", inline=True)
    embed.add_field(name="Arguments du joueur", value=arguments, inline=False)
    embed.add_field(name="Statut actuel", value="⏳ En attente de délibération", inline=False)
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed

def create_appeal_decision_embed(guild_name: str, accepted: bool) -> discord.Embed:
    if accepted:
        embed = discord.Embed(
            title="⚖️ Décision d'appel : Sanction Levée",
            description=f"Votre contestation sur le serveur **{guild_name}** a été acceptée par l'équipe de modération.\nLa sanction a été levée avec succès.",
            color=Config.COLOR_SUCCESS
        )
    else:
        embed = discord.Embed(
            title="⚖️ Décision d'appel : Contestation Rejetée",
            description=f"Votre contestation sur le serveur **{guild_name}** a été examinée et rejetée par la modération.\nLa sanction initiale reste maintenue.",
            color=Config.COLOR_ERROR
        )
    embed.set_footer(text=Config.FOOTER_TEXT)
    return embed
