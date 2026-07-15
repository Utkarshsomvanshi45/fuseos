"""
Imports the raw simulated datasets (gas sensors, SCADA, permits, shift logs)
produced by ml/Generate_Data into our actual DB tables — replacing the
hand-seeded demo data with real simulator output.

Column names are already very close to our schema (see docs/data_schema.md);
the only real difference is "zone" -> "zone_id" and permit_id -> id. Any zone
code referenced in the CSVs that isn't already in our zones table gets
auto-created so nothing silently fails on an unrecognized zone.

IMPORTANT: gas_sensor_readings.csv / scada_states.csv are the full ML TRAINING
datasets — 30 simulated days at 20-second intervals, ~1.5M+ rows. That's the
right scale for training a model, but far more than a live dashboard needs (and
enough to OOM-crash a naive full import). This importer only pulls the most
recent RECENT_HOURS of readings for gas/SCADA, and batches commits regardless
so memory stays flat no matter how large the source file is. Permits and shift
logs are small and imported in full.

Usage:
    python -m app.import_data /path/to/Generate_Data/data
    python -m app.import_data /path/to/Generate_Data/data --recent-hours 12
"""
import csv
import sys
from datetime import datetime, timedelta
from app.database.database import SessionLocal, Base, engine
from app.database import models

Base.metadata.create_all(bind=engine)

BATCH_SIZE = 500


def parse_dt(value: str) -> datetime:
    value = value.strip().replace(" ", "T", 1)
    return datetime.fromisoformat(value)


def ensure_zone(db, zone_id: str, known_zones: set):
    if zone_id not in known_zones:
        existing = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
        if not existing:
            db.add(models.Zone(id=zone_id, name=zone_id, sector="Unassigned"))
            db.commit()
        known_zones.add(zone_id)


def find_max_timestamp(path: str, ts_field: str = "timestamp") -> datetime:
    """Single streaming pass to find the latest timestamp in a large CSV,
    without loading the whole file into memory."""
    max_ts = None
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ts = parse_dt(row[ts_field])
            if max_ts is None or ts > max_ts:
                max_ts = ts
    return max_ts


def import_gas_readings(db, path: str, known_zones: set, recent_hours: int):
    db.query(models.GasReading).delete()
    db.commit()

    print("  Scanning for latest timestamp (large file, one streaming pass)...")
    max_ts = find_max_timestamp(path)
    cutoff = max_ts - timedelta(hours=recent_hours)
    print(f"  Latest reading: {max_ts}. Importing from {cutoff} onward.")

    count = 0
    batch = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ts = parse_dt(row["timestamp"])
            if ts < cutoff:
                continue
            ensure_zone(db, row["zone"], known_zones)
            batch.append(models.GasReading(
                sensor_id=row["sensor_id"], zone_id=row["zone"], gas_type=row["gas_type"],
                reading=float(row["reading"]), unit=row["unit"], threshold=float(row["threshold"]),
                timestamp=ts,
            ))
            count += 1
            if len(batch) >= BATCH_SIZE:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
    return count


def import_permits(db, path: str, known_zones: set):
    db.query(models.Permit).delete()
    db.commit()
    count = 0
    seen_ids = set()
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ensure_zone(db, row["zone"], known_zones)
            if row["permit_id"] in seen_ids:
                continue  # skip duplicate permit_ids rather than crash the whole import
            seen_ids.add(row["permit_id"])
            db.add(models.Permit(
                id=row["permit_id"], type=row["type"], zone_id=row["zone"],
                hazard_class=row["hazard_class"], issuer=row["issuer"],
                start_time=parse_dt(row["start_time"]), end_time=parse_dt(row["end_time"]),
                status=row["status"],
            ))
            count += 1
    db.commit()
    return count


def import_scada(db, path: str, known_zones: set, recent_hours: int):
    db.query(models.ScadaReading).delete()
    db.commit()

    print("  Scanning for latest timestamp (large file, one streaming pass)...")
    max_ts = find_max_timestamp(path)
    cutoff = max_ts - timedelta(hours=recent_hours)
    print(f"  Latest reading: {max_ts}. Importing from {cutoff} onward.")

    count = 0
    batch = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ts = parse_dt(row["timestamp"])
            if ts < cutoff:
                continue
            ensure_zone(db, row["zone"], known_zones)
            batch.append(models.ScadaReading(
                equipment_id=row["equipment_id"], zone_id=row["zone"], parameter=row["parameter"],
                value=float(row["value"]), unit=row.get("unit"), timestamp=ts,
            ))
            count += 1
            if len(batch) >= BATCH_SIZE:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
    return count


def import_shift_logs(db, path: str, known_zones: set):
    db.query(models.ShiftLog).delete()
    db.commit()
    count = 0
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            ensure_zone(db, row["zone"], known_zones)
            db.add(models.ShiftLog(
                worker_id=row["worker_id"], role=row.get("role"), zone_id=row["zone"],
                shift=row["shift"], shift_start=parse_dt(row["shift_start"]),
                shift_end=parse_dt(row["shift_end"]),
            ))
            count += 1
    db.commit()
    return count


def main(data_dir: str, recent_hours: int):
    db = SessionLocal()
    known_zones = {z.id for z in db.query(models.Zone).all()}

    print("Importing permits...")
    n_permits = import_permits(db, f"{data_dir}/work_permits.csv", known_zones)
    print("Importing shift logs...")
    n_shifts = import_shift_logs(db, f"{data_dir}/shift_logs.csv", known_zones)
    print("Importing gas readings (recent window only)...")
    n_gas = import_gas_readings(db, f"{data_dir}/gas_sensor_readings.csv", known_zones, recent_hours)
    print("Importing SCADA readings (recent window only)...")
    n_scada = import_scada(db, f"{data_dir}/scada_states.csv", known_zones, recent_hours)

    db.close()
    print(f"\nImported: {n_gas} gas readings, {n_permits} permits, "
          f"{n_scada} scada readings, {n_shifts} shift logs.")
    print(f"Zones now known: {sorted(known_zones)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.import_data /path/to/Generate_Data/data [--recent-hours 6]")
        sys.exit(1)

    data_dir = sys.argv[1]
    recent_hours = 6
    if "--recent-hours" in sys.argv:
        recent_hours = int(sys.argv[sys.argv.index("--recent-hours") + 1])

    main(data_dir, recent_hours)
