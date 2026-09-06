import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
    DATABASE_URL = os.getenv("DATABASE_URL")
    ROLE_STAFF_ID = int(os.getenv("ROLE_STAFF_ID", 0))
    ROLE_VIDEASTE_ID = int(os.getenv("ROLE_VIDEASTE_ID", 0))
    TICKET_CATEGORY_ID = int(os.getenv("TICKET_CATEGORY_ID", 0))
    TICKET_LOG_CHANNEL_ID = int(os.getenv("TICKET_LOG_CHANNEL_ID", 0))


    COLOR_SUCCESS = 0x22c55e
    COLOR_ERROR = 0xef4444
    COLOR_INFO = 0x3b82f6
    FOOTER_TEXT = "Paranoia Studio"

    @classmethod
    def validate(cls):
        if not cls.DISCORD_TOKEN:
            raise ValueError("Critical Error: DISCORD_TOKEN is missing from .env file")