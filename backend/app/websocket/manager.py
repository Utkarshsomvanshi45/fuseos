from fastapi import WebSocket


class ConnectionManager:
    """Singleton — import `manager` from this module anywhere you need to
    push a live update to connected dashboards (e.g. after a new risk event
    is created by the ml/ risk model)."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        for connection in self.active:
            await connection.send_json(message)


manager = ConnectionManager()
