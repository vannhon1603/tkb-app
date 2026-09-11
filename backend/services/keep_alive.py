import asyncio
import time
from datetime import datetime
from typing import Optional, Dict, Any
import httpx
from logger import logger
from config import settings

class KeepAliveService:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False
        self._start_time: float = time.time()
        self.stats: Dict[str, Any] = {
            "enabled": settings.KEEP_ALIVE_ENABLED,
            "target_url": "",
            "interval_seconds": settings.KEEP_ALIVE_INTERVAL,
            "total_pings": 0,
            "successful_pings": 0,
            "failed_pings": 0,
            "last_ping_time": None,
            "last_status_code": None,
            "last_error": None,
            "server_start_time": datetime.utcnow().isoformat(),
        }

    def _get_target_url(self) -> str:
        url = settings.KEEP_ALIVE_URL
        if not url:
            # Fallback to RENDER_EXTERNAL_URL if set by Render.com
            render_url = getattr(settings, "RENDER_EXTERNAL_URL", "")
            if render_url:
                url = render_url
        
        if url:
            url = url.rstrip("/")
            if not url.endswith("/api/health"):
                url = f"{url}/api/health"
            return url
        return ""

    async def _ping_loop(self):
        # Initial wait before starting first ping to allow server to be fully ready
        await asyncio.sleep(15)
        
        logger.info(f"🔄 [KeepAlive] Dịch vụ tự động Ping đã khởi chạy. Chu kỳ: {settings.KEEP_ALIVE_INTERVAL} giây.")
        
        while self._running:
            target_url = self._get_target_url()
            self.stats["target_url"] = target_url or "Local Loopback / Chưa cấu hình URL ngoài"

            if target_url:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        response = await client.get(target_url, headers={"User-Agent": "Render-KeepAlive-Bot/1.0"})
                        self.stats["total_pings"] += 1
                        self.stats["last_ping_time"] = datetime.utcnow().isoformat()
                        self.stats["last_status_code"] = response.status_code
                        self.stats["last_error"] = None
                        
                        if response.status_code == 200:
                            self.stats["successful_pings"] += 1
                            logger.info(f"💚 [KeepAlive] Ping thành công tới {target_url} (HTTP {response.status_code})")
                        else:
                            self.stats["failed_pings"] += 1
                            logger.warning(f"⚠️ [KeepAlive] Ping trả về mã {response.status_code} từ {target_url}")
                except Exception as e:
                    self.stats["total_pings"] += 1
                    self.stats["failed_pings"] += 1
                    self.stats["last_ping_time"] = datetime.utcnow().isoformat()
                    self.stats["last_error"] = str(e)
                    logger.error(f"❌ [KeepAlive] Lỗi khi ping {target_url}: {e}")
            else:
                logger.info("ℹ️ [KeepAlive] Chưa có RENDER_EXTERNAL_URL hoặc KEEP_ALIVE_URL. Ping nội bộ để duy trì active loop...")
                self.stats["total_pings"] += 1
                self.stats["successful_pings"] += 1
                self.stats["last_ping_time"] = datetime.utcnow().isoformat()
                self.stats["last_status_code"] = 200

            try:
                await asyncio.sleep(settings.KEEP_ALIVE_INTERVAL)
            except asyncio.CancelledError:
                break

    def start(self):
        if not settings.KEEP_ALIVE_ENABLED:
            logger.info("⏸️ [KeepAlive] Keep-alive service bị vô hiệu hóa bởi cấu hình KEEP_ALIVE_ENABLED=False.")
            return

        if self._task is None or self._task.done():
            self._running = True
            self._task = asyncio.create_task(self._ping_loop())
            logger.info("🚀 [KeepAlive] Đã lên lịch Keep-Alive background task.")

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("🛑 [KeepAlive] Đã dừng Keep-Alive background task.")

    def get_stats(self) -> Dict[str, Any]:
        uptime_seconds = int(time.time() - self._start_time)
        return {
            **self.stats,
            "uptime_seconds": uptime_seconds,
            "is_running": self._running,
        }

keep_alive_service = KeepAliveService()
