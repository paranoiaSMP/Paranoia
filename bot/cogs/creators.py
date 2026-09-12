import discord
from discord import app_commands
from discord.ext import commands

CREATORS_DATA = [
    {
        "nom": "Leoo955",
        "plateforme": "YouTube",
        "role": "Créateur de Contenu",
        "lien": "https://youtube.com/@leoo955",
        "pseudo_mc": "Leoo955"
    },
    {
        "nom": "1sans_nom",
        "plateforme": "Twitch",
        "role": "Streamer Officiel",
        "lien": "https://twitch.tv/",
        "pseudo_mc": "1sans_nom"
    },
    {
        "nom": "Steve",
        "plateforme": "YouTube",
        "role": "Vidéaste Partenaire",
        "lien": "https://youtube.com/",
        "pseudo_mc": "Steve"
    }
]

class CreatorSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(
                label=c["nom"],
                description=f"{c['plateforme']} • {c['role']}",
                emoji="🎬" if c["plateforme"] == "YouTube" else "🟣",
                value=c["nom"]
            )
            for c in CREATORS_DATA
        ]
        super().__init__(placeholder="Sélectionne un créateur pour voir ses liens...", options=options, custom_id="select_creator")

    async def callback(self, interaction: discord.Interaction):
        selected_name = self.values[0]
        creator = next((c for c in CREATORS_DATA if c["nom"] == selected_name), None)
        if not creator:
            await interaction.response.send_message("Créateur introuvable.", ephemeral=True)
            return

        desc = f"**Rôle :** {creator['role']}\n**Plateforme :** {creator['plateforme']}"
        embed = discord.Embed(
            title=f"🎬 Créateur : {creator['nom']}",
            description=desc,
            color=0x7a0aad
        )
        embed.set_thumbnail(url=f"https://vzge.me/face/512/{creator['pseudo_mc']}.png")
        embed.add_field(name="Minecraft", value=f"`{creator['pseudo_mc']}`", inline=True)
        embed.add_field(name="Lien officiel", value=f"[{creator['plateforme']}]({creator['lien']})", inline=True)
        embed.set_footer(text="Paranoia Studio")

        view = discord.ui.View()
        view.add_item(discord.ui.Button(label=f"Visiter la chaîne ({creator['plateforme']})", url=creator["lien"], emoji="🔗"))

        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

class CreatorsView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(CreatorSelect())

class CreatorsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self.bot.add_view(CreatorsView())

    @app_commands.command(name="creators", description="Affiche la liste et les réseaux officiels de nos créateurs et vidéastes.")
    async def creators(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="🎬 Nos Créateurs & Vidéastes",
            description="Découvrez les créateurs de contenu officiels de **Paranoia SMP** et soutenez-les sur leurs plateformes !",
            color=0x7a0aad
        )
        for c in CREATORS_DATA:
            emoji = "🔴" if c["plateforme"] == "YouTube" else "🟣"
            val = f"{c['role']}\nMinecraft : `{c['pseudo_mc']}`\n[Accéder à la chaîne]({c['lien']})"
            embed.add_field(
                name=f"{emoji} {c['nom']} ({c['plateforme']})",
                value=val,
                inline=False
            )
        embed.set_footer(text="Paranoia Studio • Utilise le menu pour ouvrir les liens")
        await interaction.response.send_message(embed=embed, view=CreatorsView())

async def setup(bot):
    await bot.add_cog(CreatorsCog(bot))
