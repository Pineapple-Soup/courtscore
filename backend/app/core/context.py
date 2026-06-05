from dataclasses import dataclass

@dataclass(frozen=True)
class ServiceContext:
    user_id: str
    is_admin: bool
