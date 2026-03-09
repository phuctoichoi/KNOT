from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.redis import close_redis
from app.api.v1 import auth, users, reports, alerts, zones, support, notifications, map_data, search, analytics, admin
from app.websockets.handlers import ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # startup complete
    await close_redis()


limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

app = FastAPI(
    title="KNOT API",
    description="Kết Nối Ứng Phó Thiên Tai – Disaster Response Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=PREFIX)
app.include_router(users.router,         prefix=PREFIX)
app.include_router(reports.router,       prefix=PREFIX)
app.include_router(alerts.router,        prefix=PREFIX)
app.include_router(zones.router,         prefix=PREFIX)
app.include_router(support.router,       prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(map_data.router,      prefix=PREFIX)
app.include_router(search.router,        prefix=PREFIX)
app.include_router(analytics.router,     prefix=PREFIX)
app.include_router(admin.router,         prefix=PREFIX)

app.include_router(ws_router)


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
