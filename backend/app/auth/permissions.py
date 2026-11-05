"""Pure functional-permission helpers."""

from app.auth.principal import CurrentPrincipal


def has_permissions(principal: CurrentPrincipal, *codes: str) -> bool:
    return principal.has_permissions(*codes)


def missing_permissions(principal: CurrentPrincipal, *codes: str) -> frozenset[str]:
    return frozenset(codes).difference(principal.permissions)
