import asyncio
import html
import json
import os
import re
import urllib.request
from pathlib import Path
import discord
from discord import app_commands
from discord.ext import commands, tasks
from core.config import Config

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

DATA_FILE = Path("data/tiktok_targets.json")

def sync_get_live_status(username: str):
    url = f"https://www.tiktok.com/@{username}/live"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            m = re.search(r'<script id="SIGI_STATE"[^>]*>(.*?)</script>', content)
            if m:
                data = json.loads(m.group(1))
                live = data.get('LiveRoom', {})
                user_info = live.get('liveRoomUserInfo', {})
                user = user_info.get('user', {})
                room = user_info.get('liveRoom', {})
                status = user.get('status')
                room_id = user.get('roomId')
                return {
                    'is_live': (status == 2),
                    'status': status,
                    'room_id': room_id,
                    'username': username,
                    'nickname': user.get('nickname', username),
                    'avatar': user.get('avatarLarger') or user.get('avatarMedium'),
                    'title': html.unescape(room.get('title', 'En direct sur TikTok !')) if room.get('title') else 'En direct sur TikTok !',
                    'cover': room.get('coverUrl') or room.get('squareCoverImg'),
                    'url': f"https://www.tiktok.com/@{username}/live"
                }
    except Exception:
        pass
    return None

def sync_get_latest_video(username: str):
    url = f"https://urlebird.com/user/{username}/"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            pattern = r'<div class=\"thumb wc\">.*?<div class=\"img\"><img [^>]*src=[\"\']([^\"\']+)[\"\'].*?<a href=[\"\']https://urlebird\.com/video/[^\"\']*-(\d+)/[\"\']><span>(.*?)</span>'
            m = re.search(pattern, content, re.DOTALL)
            if m:
                thumb = m.group(1)
                video_id = m.group(2)
                raw_title = m.group(3).strip()
                title = html.unescape(re.sub(r'<[^>]+>', '', raw_title))
                return {
                    'id': video_id,
                    'title': title,
                    'thumbnail': thumb,
                    'url': f"https://www.tiktok.com/@{username}/video/{video_id}"
                }
    except Exception:
        pass
    return None

def load_targets() -> list[dict]:
    if not DATA_FILE.exists():
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        initial = []
        env_accounts = os.getenv("TIKTOK_ACCOUNTS")
        if env_accounts and Config.TIKTOK_CHANNEL_ID:
            for acc in env_accounts.split(","):
                clean = acc.strip().lstrip("@")
                if clean:
                    initial.append({
                        "username": clean,
                        "channel_id": Config.TIKTOK_CHANNEL_ID,
                        "role_id": Config.ROLE_VIDEASTE_ID or None,
                        "last_video_id": None,
                        "is_live": False
                    })
        save_targets(initial)
        return initial
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_targets(targets: list[dict]):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(targets, f, indent=2, ensure_ascii=False)

class TikTokSniper(commands.GroupCog, group_name="tiktok"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.targets = load_targets()
        self.check_loop.start()

    def cog_unload(self):
        self.check_loop.cancel()

    @tasks.loop(seconds=90)
    async def check_loop(self):
        await self.bot.wait_until_ready()
        if not self.targets:
            return

        for target in list(self.targets):
            username = target["username"]
            channel_id = target.get("channel_id")
            channel = self.bot.get_channel(channel_id)
            if not channel:
                continue

            role_ping = f"<@&{target['role_id']}>" if target.get("role_id") else ""

            live_data = await asyncio.to_thread(sync_get_live_status, username)
            if live_data:
                now_live = live_data.get("is_live", False)
                was_live = target.get("is_live", False)
                if now_live and not was_live:
                    target["is_live"] = True
                    embed = discord.Embed(
                        title=f"{live_data['nickname']} est en direct sur TikTok",
                        description=live_data["title"] or "Rejoignez le live dès maintenant.",
                        color=0xFE2C55,
                        url=live_data["url"]
                    )
                    if live_data.get("cover"):
                        embed.set_image(url=live_data["cover"])
                    if live_data.get("avatar"):
                        embed.set_thumbnail(url=live_data["avatar"])
                    embed.set_footer(text="TikTok Live Sniper • Paranoia")

                    view = discord.ui.View()
                    view.add_item(discord.ui.Button(label="Rejoindre le Live", url=live_data["url"], style=discord.ButtonStyle.link))

                    content = f"**{live_data['nickname']}** est en direct sur TikTok. {role_ping}".strip()
                    try:
                        await channel.send(content=content, embed=embed, view=view)
                    except Exception:
                        pass
                    save_targets(self.targets)
                elif not now_live and was_live:
                    target["is_live"] = False
                    save_targets(self.targets)

            video_data = await asyncio.to_thread(sync_get_latest_video, username)
            if video_data:
                vid_id = video_data.get("id")
                last_vid = target.get("last_video_id")
                if not last_vid:
                    target["last_video_id"] = vid_id
                    save_targets(self.targets)
                elif vid_id and vid_id != last_vid:
                    target["last_video_id"] = vid_id
                    embed = discord.Embed(
                        title=f"Nouveau TikTok de @{username}",
                        description=video_data["title"] or "Nouvelle vidéo disponible.",
                        color=0x25F4EE,
                        url=video_data["url"]
                    )
                    if video_data.get("thumbnail"):
                        embed.set_image(url=video_data["thumbnail"])
                    embed.set_footer(text="TikTok Video Sniper • Paranoia")

                    view = discord.ui.View()
                    view.add_item(discord.ui.Button(label="Regarder la vidéo", url=video_data["url"], style=discord.ButtonStyle.link))

                    content = f"Nouvelle vidéo de **@{username}**. {role_ping}".strip()
                    try:
                        await channel.send(content=content, embed=embed, view=view)
                    except Exception:
                        pass
                    save_targets(self.targets)

            await asyncio.sleep(2)

    @app_commands.command(name="add", description="Ajouter un créateur TikTok à surveiller")
    @app_commands.describe(
        username="Nom d'utilisateur TikTok (sans @)",
        channel="Salon où envoyer les alertes",
        role="Rôle à mentionner (optionnel)"
    )
    async def add(self, interaction: discord.Interaction, username: str, channel: discord.TextChannel, role: discord.Role | None = None):
        clean_user = username.strip().lstrip("@").lower()
        if not clean_user:
            return await interaction.response.send_message("Nom d'utilisateur invalide.", ephemeral=True)

        await interaction.response.defer(ephemeral=True)

        existing = next((t for t in self.targets if t["username"].lower() == clean_user), None)
        if existing:
            existing["channel_id"] = channel.id
            existing["role_id"] = role.id if role else None
            save_targets(self.targets)
            return await interaction.followup.send(f"Configuration mise à jour pour **@{clean_user}** dans {channel.mention}.")

        live_data = await asyncio.to_thread(sync_get_live_status, clean_user)
        video_data = await asyncio.to_thread(sync_get_latest_video, clean_user)

        target = {
            "username": clean_user,
            "channel_id": channel.id,
            "role_id": role.id if role else None,
            "last_video_id": video_data.get("id") if video_data else None,
            "is_live": live_data.get("is_live", False) if live_data else False
        }
        self.targets.append(target)
        save_targets(self.targets)

        role_info = f" (Ping: {role.mention})" if role else ""
        await interaction.followup.send(
            f"**@{clean_user}** ajouté au sniper TikTok.\n"
            f"Salon: {channel.mention}{role_info}\n"
            f"Dernière vidéo: `{target['last_video_id'] or 'En attente'}`\n"
            f"Statut live: `{'En direct' if target['is_live'] else 'Hors ligne'}`"
        )

    @app_commands.command(name="remove", description="Retirer un créateur TikTok de la surveillance")
    @app_commands.describe(username="Nom d'utilisateur TikTok (sans @)")
    async def remove(self, interaction: discord.Interaction, username: str):
        clean_user = username.strip().lstrip("@").lower()
        before_len = len(self.targets)
        self.targets = [t for t in self.targets if t["username"].lower() != clean_user]
        if len(self.targets) == before_len:
            return await interaction.response.send_message(f"Le compte **@{clean_user}** n'est pas dans la liste.", ephemeral=True)
        save_targets(self.targets)
        await interaction.response.send_message(f"Le compte **@{clean_user}** a été retiré du sniper.", ephemeral=True)

    @app_commands.command(name="list", description="Lister les créateurs TikTok surveillés")
    async def list_targets(self, interaction: discord.Interaction):
        if not self.targets:
            return await interaction.response.send_message("Aucun compte TikTok n'est actuellement surveillé.", ephemeral=True)

        embed = discord.Embed(
            title="Sniper TikTok - Comptes surveillés",
            color=0xFE2C55
        )
        for t in self.targets:
            chan = f"<#{t['channel_id']}>"
            role = f"<@&{t['role_id']}>" if t.get("role_id") else "Aucun"
            live = "En direct" if t.get("is_live") else "Hors ligne"
            vid = f"`{t.get('last_video_id') or 'N/A'}`"
            embed.add_field(
                name=f"@{t['username']}",
                value=f"Salon: {chan}\nPing: {role}\nStatut: {live}\nDernière vidéo: {vid}",
                inline=False
            )
        embed.set_footer(text=f"{len(self.targets)} compte(s) surveillé(s)")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="check", description="Forcer une vérification immédiate des comptes TikTok")
    async def check_now(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        await self.check_loop()
        await interaction.followup.send(f"Vérification terminée pour {len(self.targets)} compte(s).")

async def setup(bot: commands.Bot):
    await bot.add_cog(TikTokSniper(bot))
