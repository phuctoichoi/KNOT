from typing import Dict, Set, Optional
from fastapi import WebSocket
import logging

logger = logging.getLogger("knot.ws")


class ConnectionManager:
    def __init__(self):
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        self.public_connections: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket, user_id: Optional[str] = None):
        await ws.accept()
        if user_id:
            self.user_connections.setdefault(user_id, set()).add(ws)
        else:
            self.public_connections.add(ws)
        logger.info(f"WS connected: user={user_id}, total_public={len(self.public_connections)}")

    def disconnect(self, ws: WebSocket, user_id: Optional[str] = None):
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(ws)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        else:
            self.public_connections.discard(ws)

    async def send_to_user(self, user_id: str, payload: dict):
        dead = set()
        for ws in list(self.user_connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        if dead and user_id in self.user_connections:
            self.user_connections[user_id] -= dead

    async def broadcast_public(self, payload: dict):
        dead = set()
        for ws in list(self.public_connections):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self.public_connections -= dead

    async def broadcast_all(self, payload: dict):
        await self.broadcast_public(payload)
        for uid in list(self.user_connections.keys()):
            await self.send_to_user(uid, payload)

    @property
    def total_connections(self) -> int:
        return len(self.public_connections) + sum(len(v) for v in self.user_connections.values())


manager = ConnectionManager()
