import discord
from discord.ext import commands
from discord import app_commands
from core.bot import ParanoiaBot
from core.config import Config

class EventView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    def _get_participants(self, embed: discord.Embed) -> set:
        for field in embed.fields:
            if field.name.startswith("Participants"):
                if field.value == "Aucun participant.":
                    return set()
                mentions = [m.strip() for m in field.value.split('\n') if m.strip()]
                return set(mentions)
        return set()

    def _update_embed(self, embed: discord.Embed, participants: set):
        count = len(participants)
        value = "\n".join(participants) if count > 0 else "Aucun participant."
        
        # Discord limit is 1024 chars for a field value
        if len(value) > 1024:
            value = f"*{count} participants inscrits (liste trop longue)*"
            
        found = False
        for i, field in enumerate(embed.fields):
            if field.name.startswith("Participants"):
                embed.set_field_at(i, name=f"Participants ({count})", value=value, inline=False)
                found = True
                break
                
        if not found:
            embed.add_field(name=f"Participants ({count})", value=value, inline=False)
        return embed

    @discord.ui.button(label="Je participe", style=discord.ButtonStyle.success, custom_id="event_join_btn")
    async def join_event(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = interaction.message.embeds[0]
        participants = self._get_participants(embed)
        user_mention = interaction.user.mention
        
        if user_mention in participants:
            await interaction.response.send_message("Tu es déjà inscrit !", ephemeral=True)
            return
            
        participants.add(user_mention)
        updated_embed = self._update_embed(embed, participants)
        await interaction.message.edit(embed=updated_embed)
        await interaction.response.send_message("✅ Tu es inscrit à l'événement !", ephemeral=True)

    @discord.ui.button(label="Se désinscrire", style=discord.ButtonStyle.danger, custom_id="event_leave_btn")
    async def leave_event(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = interaction.message.embeds[0]
        participants = self._get_participants(embed)
        user_mention = interaction.user.mention
        
        if user_mention not in participants:
            await interaction.response.send_message("Tu n'étais pas inscrit.", ephemeral=True)
            return
            
        participants.remove(user_mention)
        updated_embed = self._update_embed(embed, participants)
        await interaction.message.edit(embed=updated_embed)
        await interaction.response.send_message("❌ Tu t'es désinscrit de l'événement.", ephemeral=True)


class EventModal(discord.ui.Modal, title="Créer un Événement"):
    event_title = discord.ui.TextInput(
        label="Titre de l'événement",
        placeholder="Ex: Tournoi PvP",
        max_length=100
    )
    
    event_date = discord.ui.TextInput(
        label="Date & Heure",
        placeholder="Ex: Samedi à 21h00",
        max_length=100
    )
    
    event_location = discord.ui.TextInput(
        label="Lieu / Serveur",
        placeholder="Ex: Arène Principale",
        max_length=100
    )

    event_description = discord.ui.TextInput(
        label="Description",
        style=discord.TextStyle.paragraph,
        placeholder="Le texte de l'événement...",
        max_length=2000
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        
        embed = discord.Embed(
            title=self.event_title.value,
            description=self.event_description.value,
            color=Config.COLOR_INFO
        )
        embed.add_field(name="Date", value=self.event_date.value, inline=True)
        embed.add_field(name="Lieu", value=self.event_location.value, inline=True)
        embed.add_field(name="Participants (0)", value="Aucun participant.", inline=False)
        embed.set_footer(text=Config.FOOTER_TEXT)

        view = EventView()
        await interaction.channel.send(embed=embed, view=view)
        await interaction.followup.send("Événement publié avec succès !", ephemeral=True)


class Events(commands.Cog):
    def __init__(self, bot: ParanoiaBot):
        self.bot = bot
        # Enregistre la vue pour qu'elle continue de fonctionner même après un redémarrage du bot
        self.bot.add_view(EventView())

    @app_commands.command(name="event", description="Crée un nouvel événement")
    @app_commands.default_permissions(manage_messages=True)
    async def create_event(self, interaction: discord.Interaction):
        await interaction.response.send_modal(EventModal())


async def setup(bot: ParanoiaBot):
    await bot.add_cog(Events(bot))
