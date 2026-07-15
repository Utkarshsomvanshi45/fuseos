"""
Takes risk flags produced by ml/Rules_Engine (Stage 1) or ml/Model_Training's
inference.py (Stage 2) and adapts them to our exact schema (docs/data_schema.md),
then POSTs them to our /api/ingest/risk-events endpoint — which handles storing,
websocket broadcast, and email alerting, all already tested.

Field differences this adapter handles:
    "zone"              -> "zone_id"
    (missing) "id"       -> generated as RX-<counter> based on timestamp+zone hash
    (missing) "status"   -> defaults to "new"
    signal name variants -> normalized ("shift_log" -> "shift", "sensor_gap" -> "sensor",
                             "model" and any other unrecognized signal passed through as-is)

Usage:
    python -m app.import_risk_flags /path/to/risk_flags.json
    python -m app.import_risk_flags /path/to/risk_flags.json --api-url http://localhost:8000
"""
import json
import sys
import hashlib
import urllib.request

SIGNAL_MAP = {
    "shift_log": "shift",
    "sensor_gap": "sensor",
    "permit": "permit",
    "sensor": "sensor",
    "scada": "scada",
    "shift": "shift",
}


def normalize_signal(s: str) -> str:
    return SIGNAL_MAP.get(s, s)


def make_id(entry: dict) -> str:
    basis = f"{entry['zone']}-{entry['risk_type']}-{entry['timestamp']}"
    digest = hashlib.sha1(basis.encode()).hexdigest()[:8].upper()
    return f"RX-{digest}"


def adapt(entry: dict) -> dict:
    return {
        "id": make_id(entry),
        "zone_id": entry["zone"],
        "risk_type": entry["risk_type"],
        "severity": entry["severity"],
        "confidence": entry["confidence"],
        "contributing_signals": [normalize_signal(s) for s in entry.get("contributing_signals", [])],
        "lead_time_minutes": entry.get("lead_time_minutes"),
        "description": entry["description"],
        "status": "new",
        "timestamp": entry["timestamp"],
    }


def post_batch(api_url: str, events: list[dict]):
    body = json.dumps(events).encode()
    req = urllib.request.Request(
        f"{api_url}/api/ingest/risk-events", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main(json_path: str, api_url: str):
    with open(json_path) as f:
        raw_entries = json.load(f)

    adapted = [adapt(e) for e in raw_entries]
    print(f"Loaded {len(adapted)} risk flags from {json_path}, posting to {api_url} ...")

    result = post_batch(api_url, adapted)
    print(f"Server response: {result}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.import_risk_flags /path/to/risk_flags.json [--api-url http://localhost:8000]")
        sys.exit(1)

    json_path = sys.argv[1]
    api_url = "http://localhost:8000"
    if "--api-url" in sys.argv:
        api_url = sys.argv[sys.argv.index("--api-url") + 1]

    main(json_path, api_url)
