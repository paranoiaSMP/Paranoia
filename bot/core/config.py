import os
from dotenv import load_dotenv

load_dotenv()


def _clean_str(val: str | None) -> str:
    if not val:
        return ""
    return val.strip().strip('"').strip("'")


def _clean_int(val: str | None, default: int = 0) -> int:
    cleaned = _clean_str(val)
    if not cleaned:
        return default
    try:
        return int(cleaned)
    except ValueError:
        return default


class Config:
    DISCORD_TOKEN = _clean_str(os.getenv("DISCORD_TOKEN"))
    DATABASE_URL = _clean_str(os.getenv("DATABASE_URL"))
    ROLE_STAFF_ID = _clean_int(os.getenv("ROLE_STAFF_ID"))
    ROLE_VIDEASTE_ID = _clean_int(os.getenv("ROLE_VIDEASTE_ID"))
    TICKET_CATEGORY_ID = _clean_int(os.getenv("TICKET_CATEGORY_ID"))
    TICKET_LOG_CHANNEL_ID = _clean_int(os.getenv("TICKET_LOG_CHANNEL_ID"))
    TIKTOK_CHANNEL_ID = _clean_int(os.getenv("TIKTOK_CHANNEL_ID"))

    COLOR_SUCCESS = 0x22c55e
    COLOR_ERROR = 0xef4444
    COLOR_INFO = 0x3b82f6
    FOOTER_TEXT = "Paranoia Studio"

    @classmethod
    def validate(cls):
        if not cls.DISCORD_TOKEN:
            raise ValueError("Critical Error: DISCORD_TOKEN is missing from .env file")