import math
from flask import jsonify

def clean_for_json(obj):
    """Recursively replaces NaN, Infinity, and -Infinity with None for valid JSON serialization."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    return obj

def success_response(data, metadata=None, status_code=200):
    payload = {
        "success": True,
        "data": clean_for_json(data)
    }
    if metadata is not None:
        payload["metadata"] = clean_for_json(metadata)
    return jsonify(payload), status_code

def error_response(message, details=None, status_code=400):
    payload = {
        "success": False,
        "error": message
    }
    if details is not None:
        payload["details"] = clean_for_json(details)
    return jsonify(payload), status_code

def paginated_response(items, total, page, limit, metadata=None):
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    pagination = {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
    payload = {
        "success": True,
        "data": clean_for_json(items),
        "pagination": pagination
    }
    if metadata is not None:
        payload["metadata"] = clean_for_json(metadata)
    return jsonify(payload), 200
