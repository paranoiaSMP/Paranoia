from core.config import Config
from core.bot import ParanoiaBot

def main():
    Config.validate()

    bot = ParanoiaBot()

    bot.run(Config.DISCORD_TOKEN)

if __name__ == "__main__":
    main()