from sanic import Blueprint
from sanic.response import json
from config.timezone import tz_config

config_bp = Blueprint("config", url_prefix="/api/config")

@config_bp.route("/timezone", methods=["GET"])
async def get_timezone_config(request):
    """Get server timezone configuration"""
    return json(tz_config.get_timezone_info())