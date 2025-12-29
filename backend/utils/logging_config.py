"""
Logging Configuration for MockMarket
Configures structured logging with appropriate levels for production
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
import os
import unicodedata


class SafeFormatter(logging.Formatter):
    """
    Custom formatter that handles Unicode gracefully on Windows
    Replaces problematic Unicode characters with ASCII equivalents
    """
    def format(self, record):
        # Format the record normally
        formatted = super().format(record)
        
        # On Windows, replace Unicode chars that cp1252 can't handle
        if sys.platform == 'win32':
            # Replace common emojis with text equivalents
            replacements = {
                '✓': '[OK]',
                '✅': '[OK]',
                '⚠️': '[WARN]',
                '❌': '[ERR]',
                '📡': '[WS]',
                '📈': '[CHART]',
                '🚀': '[START]',
                '⏰': '[TIME]',
                '💾': '[DB]',
                '🔍': '[SEARCH]',
                '🔎': '[FIND]',
                '📊': '[DATA]',
                '₹': 'Rs.',  # Indian Rupee symbol
                '⏭️': '[SKIP]',
            }
            for emoji, text in replacements.items():
                formatted = formatted.replace(emoji, text)
        
        return formatted

def setup_logging():
    """
    Configure application-wide logging
    
    Levels:
    - DEBUG: Detailed information for debugging (dev only)
    - INFO: General informational messages
    - WARNING: Warning messages for non-critical issues  
    - ERROR: Error messages for failures
    - CRITICAL: Critical issues requiring immediate attention
    """
    
    # Get log level from environment (default: INFO for production)
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level, logging.INFO)
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler (for Docker/systemd logs)
    # Force UTF-8 encoding to support emojis on Windows
    if sys.platform == 'win32':
        import io
        # Reconfigure stdout/stderr with UTF-8 encoding for Windows
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    
    # File handler (rotating, max 10MB, keep 5 backups)
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'mockmarket.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'  # Explicitly use UTF-8 for log files
    )
    file_handler.setLevel(numeric_level)
    
    # Formatter - use SafeFormatter for Windows compatibility
    formatter = SafeFormatter(
        '%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('engineio').setLevel(logging.WARNING)
    logging.getLogger('socketio').setLevel(logging.WARNING)
    logging.getLogger('gevent').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    logging.info(f"Logging initialized at {log_level} level")
    
    return root_logger
