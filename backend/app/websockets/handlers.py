import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websockets.manager import manager
from app.core.config import settings

logger = logging.getLogger("knot.ws")
ws_router = APIRouter()


def _decode_ws_token(token: str) -> dict | None:
    """Lightweight JWT decode for WebSocket (no DB lookup)."""
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") == "access":
            return payload
    except Exception:
        pass
    return None


@ws_router.websocket("/ws/connect")
async def websocket_endpoint(ws: WebSocket, token: str | None = Query(default=None)):
    user_id = None
    if token:
        payload = _decode_ws_token(token)
        if payload:
            user_id = payload.get("sub")

    await manager.connect(ws, user_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_json(), timeout=60.0)
                if data.get("type") == "ping":
                    await ws.send_json({"type": "pong", "ts": data.get("ts")})
            except asyncio.TimeoutError:
                # Send server-side ping to detect dead connections
                await ws.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(ws, user_id)
        logger.info(f"WS disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WS error: {e}")
        manager.disconnect(ws, user_id)


async def redis_pubsub_listener():
    """
    Background task: bridges Redis pub/sub to WebSocket clients.
    Start this in FastAPI lifespan or as a background thread.
    """
    import redis.asyncio as aioredis
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    channels = ["knot:reports", "knot:alerts"]
    await pubsub.subscribe(*channels)
    # Pattern subscribe for user notifications
    await pubsub.psubscribe("knot:notifications:*")

    async for message in pubsub.listen():
        if message["type"] not in ("message", "pmessage"):
            continue
        try:
            data = json.loads(message["data"])
            channel = message.get("channel") or message.get("pattern", "")
            if isinstance(channel, bytes):
                channel = channel.decode()

            if channel == "knot:alerts":
                await manager.broadcast_all(data)
            elif channel == "knot:reports":
                await manager.broadcast_public(data)
            elif "knot:notifications:" in channel:
                uid = channel.split(":")[-1]
                await manager.send_to_user(uid, data)
        except Exception as e:
            logger.error(f"PubSub error: {e}")
