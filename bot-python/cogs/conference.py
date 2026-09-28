import discord
from discord import app_commands
from discord.ext import commands

class Conference(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="conference_start", description="Démarrer une conférence vocale")
    @app_commands.default_permissions(manage_channels=True)
    async def conf_start(self, interaction: discord.Interaction):
        guild = interaction.guild
        category = await guild.create_category("🔴 CONFÉRENCE EN DIRECT")
        
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(connect=True, view_channel=True, speak=False),
            interaction.user: discord.PermissionOverwrite(speak=True, manage_channels=True)
        }
        
        voice = await guild.create_voice_channel("🎧 Conférence", category=category, overwrites=overwrites)
        
        regie_overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            interaction.user: discord.PermissionOverwrite(view_channel=True)
        }
        regie = await guild.create_text_channel("📝 régie-modérateur", category=category, overwrites=regie_overwrites)
        
        if interaction.user.voice:
            await interaction.user.move_to(voice)
            
        view = discord.ui.View()
        btn = discord.ui.Button(label="✋ Lever la main", style=discord.ButtonStyle.primary, custom_id=f"hand_raise:{regie.id}:{voice.id}")
        view.add_item(btn)
        
        embed = discord.Embed(title="🎙️ Conférence Démarrée", description=f"Rejoignez {voice.mention} pour écouter.\nCliquez sur le bouton pour demander la parole.", color=discord.Color.purple())
        await interaction.response.send_message(embed=embed, view=view)
        await regie.send("Les demandes de prise de parole apparaîtront ici.")

    @commands.Cog.listener()
    async def on_interaction(self, interaction: discord.Interaction):
        if not interaction.type == discord.InteractionType.component:
            return
            
        custom_id = interaction.data["custom_id"]
        
        if custom_id.startswith("hand_raise:"):
            _, regie_id, voice_id = custom_id.split(":")
            regie = self.bot.get_channel(int(regie_id))
            
            view = discord.ui.View()
            view.add_item(discord.ui.Button(label="Accepter", style=discord.ButtonStyle.success, custom_id=f"hand_accept:{interaction.user.id}:{voice_id}"))
            view.add_item(discord.ui.Button(label="Refuser", style=discord.ButtonStyle.danger, custom_id=f"hand_reject:{interaction.user.id}"))
            
            embed = discord.Embed(title="✋ Demande de parole", description=f"{interaction.user.mention} souhaite parler.", color=discord.Color.green())
            await regie.send(embed=embed, view=view)
            await interaction.response.send_message("Demande envoyée aux modérateurs.", ephemeral=True)
            
        elif custom_id.startswith("hand_accept:"):
            _, user_id, voice_id = custom_id.split(":")
            voice = self.bot.get_channel(int(voice_id))
            member = interaction.guild.get_member(int(user_id))
            
            await voice.set_permissions(member, speak=True)
            
            view = discord.ui.View()
            view.add_item(discord.ui.Button(label="Retirer la parole", style=discord.ButtonStyle.danger, custom_id=f"hand_revoke:{user_id}:{voice_id}"))
            
            await interaction.response.edit_message(content=f"✅ {member.mention} a la parole.", view=view, embed=None)
            
        elif custom_id.startswith("hand_revoke:"):
            _, user_id, voice_id = custom_id.split(":")
            voice = self.bot.get_channel(int(voice_id))
            member = interaction.guild.get_member(int(user_id))
            
            await voice.set_permissions(member, overwrite=None)
            await interaction.response.edit_message(content=f"🔇 {member.mention} n'a plus la parole.", view=None)

async def setup(bot):
    await bot.add_cog(Conference(bot))
