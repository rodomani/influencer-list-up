from typing import Any, Dict, Optional

from .normalizers import first_value, normalize_profile_image_url, split_csv_keywords, to_int


def normalize_common_account_fields(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "account_name": first_value(item, "username", "uniqueId", "channelName", "screen_name"),
        "account_url": first_value(item, "account_url", "profileUrl", "channelUrl", "url"),
        "profile_image_url": normalize_profile_image_url(
            first_value(item, "profile_image_url", "avatarUrl", "thumbnailUrl", "profilePicUrl")
        ),
        "followers": to_int(first_value(item, "followers", "followersCount", "subscriberCount")),
        "posts": to_int(first_value(item, "posts", "postsCount", "videosCount")),
        "maximum_likes": to_int(first_value(item, "maximum_likes", "maxLikes", "likesCount")),
        "keywords": split_csv_keywords(first_value(item, "keywords", "tags")),
    }


def normalize_platform_user_id(item: Dict[str, Any], *keys: str) -> Optional[str]:
    value = first_value(item, *keys)
    if value is None:
        return None
    text = str(value).strip()
    return text or None
