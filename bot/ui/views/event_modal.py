import discord
from core.config import Config

class EventModal(discord.ui.Modal, title="Création d'un Événement"):

    titre = discord.ui.TextInput(
        label="Titre de l'événement",
        placeholder="Ex: ÉVÉNEMENT CIVILISATION",
        style=discord.TextStyle.short,
        required=True
    )

    concept = discord.ui.TextInput(
        label="Le Concept",
        placeholder="Raconte l'histoire et les règles ici...",
        style=discord.TextStyle.paragraph,
        required=True
    )

    infos = discord.ui.TextInput(
        label="Informations Pratiques",
        placeholder="- Date : Mercredi 9\n- Heure : 21h00",
        style=discord.TextStyle.paragraph,
        required=True
    )

    inscription = discord.ui.TextInput(
        label="Comment s'inscrire ?",
        placeholder="Réagis avec ⚔️ pour participer !",
        style=discord.TextStyle.paragraph,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        texte_final = (
            f"@everyone\n\n"
            f"**ANNONCE : {self.titre.value}**\n\n"
            f"**Le concept :**\n{self.concept.value}\n\n"
            f"**Informations pratiques :**\n{self.infos.value}\n\n"
            f"**Comment s'inscrire ?**\n{self.inscription.value}\n\n"
            f"*— {Config.FOOTER_TEXT}*"
        )
        await interaction.response.send_message(texte_final)
