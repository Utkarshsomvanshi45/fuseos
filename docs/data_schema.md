# FUSE.OS Data Schema — Shared Contract

This is the source of truth for data shapes across `backend/` and `ml/`. If either side changes a
field, update this file and tell the other person.

## zones
| field | type | notes |
|---|---|---|
| id | string | e.g. `Z-B1` |
| name | string | e.g. `By-Product Plant` |
| sector | string | e.g. `Coke & Chemicals` |

## permits
| field | type | notes |
|---|---|---|
| id | string | e.g. `PTW-226` |
| type | string | Hot Work / Confined Space / Electrical / Working at Height / Line Break / Excavation |
| zone_id | string | FK → zones.id |
| hazard_class | string | Class I / II / III |
| issuer | string | |
| start_time | datetime | |
| end_time | datetime | |
| status | string | Active / Upcoming / Closed |

## gas_readings
| field | type | notes |
|---|---|---|
| sensor_id | string | e.g. `GS-2301` |
| zone_id | string | FK → zones.id |
| gas_type | string | CO / H2S / NH3 / CH4 / C6H6 |
| reading | float | current value |
| unit | string | ppm |
| threshold | float | danger limit |
| timestamp | datetime | |

## scada_readings
| field | type | notes |
|---|---|---|
| equipment_id | string | |
| zone_id | string | FK → zones.id |
| parameter | string | e.g. `vent_fan_output` |
| value | float | |
| unit | string | |
| timestamp | datetime | |

## shift_logs
| field | type | notes |
|---|---|---|
| worker_id | string | |
| role | string | |
| zone_id | string | FK → zones.id |
| shift | string | Shift A / B / C |
| shift_start | datetime | |
| shift_end | datetime | |

## risk_events  (the output of both the rules engine and the trained model)
| field | type | notes |
|---|---|---|
| id | string | |
| zone_id | string | FK → zones.id |
| risk_type | string | e.g. `Hot Work + Rising Gas` |
| severity | string | critical / high / elevated / low |
| confidence | int | 0-100 |
| contributing_signals | list[string] | e.g. `["permit","sensor"]` |
| lead_time_minutes | int \| null | |
| description | string | human-readable reason |
| status | string | new / acknowledged / resolved |
| timestamp | datetime | |

This exact `risk_events` shape is what `ml/` hands to `backend/` — either as a JSON file the backend
imports, or written directly to the DB via the seed/import script.
