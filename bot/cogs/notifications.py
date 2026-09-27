import discord
from discord import app_commands
from discord.ext import commands

NOTIFICATION_ROLES = [
    ("Annonces", "btn_notif_annonces", "📢", discord.ButtonStyle.secondary),
    ("Vidéastes", "btn_notif_videastes", "🎬", discord.ButtonStyle.secondary),
    ("Événements", "btn_notif_events", "🎉", discord.ButtonStyle.secondary),
    ("Mises à jour", "btn_notif_updates", "🚀", discord.ButtonStyle.secondary),
    ("Giveaways", "btn_notif_giveaways", "🎁", discord.ButtonStyle.secondary),
]

class NotificationsView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        for name, custom_id, emoji, style in NOTIFICATION_ROLES:
            self.add_item(NotificationButton(name, custom_id, emoji, style))

class NotificationButton(discord.ui.Button):
    def __init__(self, role_name: str, custom_id: str, emoji: str, style: discord.ButtonStyle):
        super().__init__(label=role_name, custom_id=custom_id, emoji=emoji, style=style)
        self.role_name = role_name

    async def callback(self, interaction: discord.Interaction):
        if not interaction.guild:
            return

        role = discord.utils.find(lambda r: r.name.lower() == self.role_name.lower(), interaction.guild.roles)
        if not role:
            await interaction.response.send_message(
                f"Le rôle **{self.role_name}** n'existe pas encore sur le serveur.",
                ephemeral=True
            )
            return

        if role in interaction.user.roles:
            try:
                await interaction.user.remove_roles(role, reason="Désabonnement notification")
                await interaction.response.send_message(
                    f"❌ Rôle retiré : **{role.name}**. Tu ne recevras plus ces notifications.",
                    ephemeral=True
                )
            except discord.Forbidden:
                await interaction.response.send_message("Erreur : permissions insuffisantes pour gérer ce rôle.", ephemeral=True)
        else:
            try:
                await interaction.user.add_roles(role, reason="Abonnement notification")
                await interaction.response.send_message(
                    f"✅ Rôle ajouté : **{role.name}**. Tu recevras désormais ces notifications !",
                    ephemeral=True
                )
            except discord.Forbidden:
                await interaction.response.send_message("Erreur : permissions insuffisantes pour gérer ce rôle.", ephemeral=True)

class NotificationsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        self.bot.add_view(NotificationsView())

    @app_commands.command(name="notifications", description="Affiche le panneau interactif pour gérer les rôles de notifications.")
    @app_commands.default_permissions(manage_roles=True)
    async def notifications(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="🔔 Gestion des Notifications",
            description=(
                "Sélectionne les notifications que tu souhaites recevoir en cliquant sur les boutons ci-dessous.\n\n"
                "• **📢 Annonces** : Toutes les communications officielles du serveur\n"
                "• **🎬 Vidéastes** : Sorties de vidéos et débuts de lives\n"
                "• **🎉 Événements** : Tournois, animations et soirées communautaires\n"
                "• **🚀 Mises à jour** : Changements, correctifs et nouveaux ajouts\n"
                "• **🎁 Giveaways** : Concours et récompenses exclusives\n\n"
                "Clique à nouveau sur un bouton pour activer ou désactiver un ping (ON / OFF)."
            ),
            color=0x7a0aad
        )
        embed.set_footer(text="Paranoia Studio • Clique pour activer ou désactiver")
        await interaction.response.send_message(embed=embed, view=NotificationsView())

async def setup(bot):
    await bot.add_cog(NotificationsCog(bot))
