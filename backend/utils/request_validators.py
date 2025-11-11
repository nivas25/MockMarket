# utils/request_validators.py
"""
Production-ready request validation utilities.
Provides reusable validators for route handlers.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)


def validate_required_fields(required_fields: List[str]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Validate that all required fields are present in request JSON.
    
    Args:
        required_fields: List of field names that must be present
        
    Returns:
        Tuple of (is_valid, error_response)
        If valid: (True, None)
        If invalid: (False, error_dict)
    """
    if not request.is_json:
        return False, {
            "status": "error",
            "message": "Content-Type must be application/json"
        }
    
    data = request.get_json()
    if data is None:
        return False, {
            "status": "error",
            "message": "Invalid JSON in request body"
        }
    
    missing_fields = []
    for field in required_fields:
        value = data.get(field)
        # Check if field is missing or empty string
        if value is None or (isinstance(value, str) and value.strip() == ''):
            missing_fields.append(field)
    
    if missing_fields:
        return False, {
            "status": "error",
            "message": f"Missing required fields: {', '.join(missing_fields)}"
        }
    
    return True, None


def require_fields(*field_names):
    """
    Decorator to validate required fields in request JSON.
    
    Usage:
        @require_fields('user_id', 'stock_name', 'quantity')
        def my_route():
            data = request.get_json()
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            is_valid, error_response = validate_required_fields(list(field_names))
            if not is_valid:
                logger.warning(
                    f"Validation failed for {request.endpoint}: {error_response['message']}"
                )
                return jsonify(error_response), 400
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_positive_integer(value: Any, field_name: str) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Validate that a value is a positive integer.
    
    Args:
        value: Value to validate
        field_name: Name of field for error messages
        
    Returns:
        Tuple of (is_valid, converted_value, error_message)
    """
    try:
        int_value = int(value)
        if int_value <= 0:
            return False, None, f"{field_name} must be positive"
        return True, int_value, None
    except (ValueError, TypeError):
        return False, None, f"{field_name} must be a valid integer"


def validate_positive_number(value: Any, field_name: str) -> Tuple[bool, Optional[float], Optional[str]]:
    """
    Validate that a value is a positive number.
    
    Args:
        value: Value to validate
        field_name: Name of field for error messages
        
    Returns:
        Tuple of (is_valid, converted_value, error_message)
    """
    try:
        float_value = float(value)
        if float_value <= 0:
            return False, None, f"{field_name} must be positive"
        return True, float_value, None
    except (ValueError, TypeError):
        return False, None, f"{field_name} must be a valid number"


def validate_trade_type(trade_type: str) -> Tuple[bool, Optional[str]]:
    """
    Validate trade type is either 'Buy' or 'Sell'.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if trade_type not in ["Buy", "Sell"]:
        return False, "trade_type must be 'Buy' or 'Sell'"
    return True, None


def log_request_info():
    """Log incoming request details for debugging."""
    logger.info(
        f"Request: {request.method} {request.path} | "
        f"IP: {request.remote_addr} | "
        f"User-Agent: {request.user_agent.string[:100]}"
    )
