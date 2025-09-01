# app/__init__.py
"""
FlashPod - Smart Flashcard Learning Platform
"""

# Version information
__version__ = "0.8.7"
__version_info__ = (0, 8, 7)

# Application metadata
__title__ = "FlashPod"
__description__ = "High performance self-hosted flashcard solution"
__url__ = "https://github.com/your-username/flashpod"
__author__ = "FlashPod Contributors"
__license__ = "MIT"

def get_version():
    """Get the current version string."""
    return __version__

def get_version_info():
    """Get version as tuple of integers."""
    return __version_info__

def get_app_info():
    """Get comprehensive application information."""
    return {
        "name": __title__,
        "version": __version__,
        "description": __description__,
        "url": __url__,
        "author": __author__,
        "license": __license__
    }