import os
import pytz
from datetime import datetime, timezone as dt_timezone

class TimezoneConfig:
    def __init__(self):
        self.tz_name = os.getenv('TZ', 'UTC')
        try:
            self.timezone = pytz.timezone(self.tz_name)
            print(f"Using timezone: {self.tz_name}")
        except pytz.exceptions.UnknownTimeZoneError:
            print(f"Warning: Unknown timezone '{self.tz_name}', falling back to UTC")
            self.timezone = pytz.UTC
            self.tz_name = 'UTC'
    
    def now(self):
        """Get current datetime in configured timezone"""
        return datetime.now(self.timezone)
    
    def utc_to_local(self, utc_dt):
        """Convert UTC datetime to local timezone"""
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=dt_timezone.utc)
        return utc_dt.astimezone(self.timezone)
    
    def get_timezone_info(self):
        """Get timezone info for frontend"""
        return {
            'name': self.tz_name,
            'offset': self.now().strftime('%z'),
            'abbreviation': self.now().strftime('%Z')
        }

# Global timezone config instance
tz_config = TimezoneConfig()