from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path
import os, json, csv, io, urllib.request, urllib.error, urllib.parse, math
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Float, DateTime, Integer, Text, Boolean, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sismo_platform.db")
# Render may provide postgres:// or postgresql://; normalize to the installed psycopg v3 driver.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase): pass

class Event(Base):
    __tablename__ = "seismic_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(100), default="Demo")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    magnitude: Mapped[float] = mapped_column(Float)
    magnitude_type: Mapped[str] = mapped_column(String(30), default="ML")
    depth_km: Mapped[float] = mapped_column(Float)
    place: Mapped[str] = mapped_column(String(300))
    source_url: Mapped[str] = mapped_column(String(600), default="")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    review_status: Mapped[str] = mapped_column(String(40), default="Pendiente de revisión")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

class DataSource(Base):
    __tablename__ = "data_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    organization: Mapped[str] = mapped_column(String(160), default="")
    base_url: Mapped[str] = mapped_column(String(500), default="")
    source_type: Mapped[str] = mapped_column(String(60), default="GeoJSON")
    status: Mapped[str] = mapped_column(String(40), default="Pendiente")
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message: Mapped[str] = mapped_column(Text, default="Sin sincronización")

class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    source: Mapped[str] = mapped_column(String(120), default="Eventos registrados")
    version: Mapped[str] = mapped_column(String(40), default="1.0")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    null_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="Borrador")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Experiment(Base):
    __tablename__ = "ml_experiments"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    task_type: Mapped[str] = mapped_column(String(60), default="Clasificación exploratoria")
    algorithm: Mapped[str] = mapped_column(String(100), default="Baseline")
    dataset_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    features: Mapped[str] = mapped_column(Text, default="magnitud, profundidad")
    target: Mapped[str] = mapped_column(String(120), default="rango_magnitud")
    metrics: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(50), default="Registrado")
    limitations: Mapped[str] = mapped_column(Text, default="Experimento exploratorio; no predice con certeza futuros terremotos.")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Estimate(Base):
    __tablename__ = "risk_estimates"
    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String(180))
    area: Mapped[str] = mapped_column(String(180))
    metric_name: Mapped[str] = mapped_column(String(120))
    value: Mapped[float] = mapped_column(Float)
    lower_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    upper_bound: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    disclaimer: Mapped[str] = mapped_column(Text, default="Estimación experimental; no equivale a alerta oficial.")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AlertRule(Base):
    __tablename__ = "alert_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    min_magnitude: Mapped[float] = mapped_column(Float, default=4.0)
    zone: Mapped[str] = mapped_column(String(180), default="Todas las zonas")
    severity: Mapped[str] = mapped_column(String(40), default="Media")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=1800)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rule_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    severity: Mapped[str] = mapped_column(String(40), default="Media")
    title: Mapped[str] = mapped_column(String(220))
    message: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(String(600), default="")
    status: Mapped[str] = mapped_column(String(50), default="Pendiente")
    channel: Mapped[str] = mapped_column(String(50), default="Interno")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AppUser(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(180))
    email: Mapped[str] = mapped_column(String(180), unique=True)
    role: Mapped[str] = mapped_column(String(60), default="Solo lectura")
    status: Mapped[str] = mapped_column(String(40), default="Activo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str] = mapped_column(String(180), default="Sistema")
    action: Mapped[str] = mapped_column(String(120))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(100), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ReportJob(Base):
    __tablename__ = "report_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    report_type: Mapped[str] = mapped_column(String(100))
    filters: Mapped[str] = mapped_column(Text, default="{}")
    requested_by: Mapped[str] = mapped_column(String(180), default="Administrador demo")
    status: Mapped[str] = mapped_column(String(40), default="Listo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(engine)
app = FastAPI(title="Sismo Platform Enterprise API", version="1.0.0", description="API modular de monitoreo sísmico, análisis y alertas internas.")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def audit(db, action, entity, entity_id="", detail=""):
    db.add(AuditLog(actor="Administrador demo", action=action, entity_type=entity, entity_id=str(entity_id), detail=detail))
    db.commit()

def asdict(obj):
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    for k,v in d.items():
        if isinstance(v, datetime): d[k] = v.isoformat()
    return d

def seed():
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(DataSource)) == 0:
            db.add_all([
                DataSource(name="USGS Earthquake Feed", organization="U.S. Geological Survey", base_url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson", status="Disponible", last_message="Conector configurado; sincronización manual."),
                DataSource(name="IGP Perú", organization="Instituto Geofísico del Perú", base_url="https://www.igp.gob.pe/", status="Por validar", last_message="Confirmar API, licencia y condiciones de uso antes de integración.")
            ])
        if db.scalar(select(func.count()).select_from(AppUser)) == 0:
            db.add_all([
                AppUser(full_name="Administrador de demostración", email="admin@demo.local", role="Administrador"),
                AppUser(full_name="Analista de demostración", email="analista@demo.local", role="Analista"),
                AppUser(full_name="Operador de alertas", email="operador@demo.local", role="Operador de alertas"),
                AppUser(full_name="Auditor de demostración", email="auditor@demo.local", role="Auditor")
            ])
        if os.getenv("LOAD_DEMO_DATA", "true").lower() in ("1", "true", "yes") and db.scalar(select(func.count()).select_from(Event)) == 0:
            now = datetime.now(timezone.utc)
            demo = [
                ("demo-1",-12.05,-77.04,2.8,38.0,"Cerca de Lima, Perú",1),
                ("demo-2",-15.84,-70.02,3.6,120.0,"Región Puno, Perú",2),
                ("demo-3",-9.19,-78.38,4.1,45.0,"Costa de Áncash, Perú",5),
                ("demo-4",-16.40,-73.20,3.2,65.0,"Región Arequipa, Perú",8),
                ("demo-5",-5.10,-81.20,4.4,22.0,"Costa norte del Perú",11),
                ("demo-6",-13.52,-71.97,2.4,14.0,"Región Cusco, Perú",15),
            ]
            for ext,lat,lon,mag,dep,place,days in demo:
                db.add(Event(external_id=ext, source="Datos de demostración", occurred_at=now-timedelta(days=days), latitude=lat, longitude=lon, magnitude=mag, magnitude_type="ML", depth_km=dep, place=place, source_url="", review_status="Demo", is_demo=True))
        db.commit()
seed()

@app.get("/")
def root(): return {"name":"Sismo Platform Enterprise API","version":"1.0.0","docs":"/docs","status":"ok"}
@app.get("/api/v1/health")
def health(): return {"status":"ok","database":"connected","timestamp":datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/events")
def list_events(
    q: str = "",
    min_magnitude: Optional[float] = Query(None, ge=-1, le=10),
    max_magnitude: Optional[float] = Query(None, ge=-1, le=10),
    source: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    days: Optional[int] = Query(None, ge=1, le=3650),
    include_demo: bool = True,
    limit: int = Query(300, ge=1, le=2000),
):
    """Lista eventos con filtros opcionales para mapa, revisión y exportación.

    start_date/end_date aceptan fecha ISO (YYYY-MM-DD) o fecha-hora ISO.
    El filtro temporal se calcula en UTC. Los eventos demo se pueden excluir.
    """
    now = datetime.now(timezone.utc)
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None
        if start_dt and start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        if end_dt and end_dt.tzinfo is None:
            # Una fecha sin hora debe incluir todo el día indicado.
            if len(end_date) == 10:
                end_dt = end_dt + timedelta(days=1) - timedelta(microseconds=1)
            end_dt = end_dt.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        raise HTTPException(422, "start_date y end_date deben usar formato ISO, por ejemplo 2026-10-29.")
    if min_magnitude is not None and max_magnitude is not None and min_magnitude > max_magnitude:
        raise HTTPException(422, "min_magnitude no puede ser mayor que max_magnitude.")
    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(422, "start_date no puede ser posterior a end_date.")
    if days is not None:
        cutoff = now - timedelta(days=days)
        start_dt = max(start_dt, cutoff) if start_dt else cutoff
    with SessionLocal() as db:
        rows = db.scalars(select(Event).order_by(Event.occurred_at.desc())).all()
        if q:
            needle = q.casefold()
            rows = [e for e in rows if needle in (e.place or "").casefold()
                    or needle in (e.source or "").casefold()
                    or needle in (e.external_id or "").casefold()]
        if min_magnitude is not None:
            rows = [e for e in rows if e.magnitude >= min_magnitude]
        if max_magnitude is not None:
            rows = [e for e in rows if e.magnitude <= max_magnitude]
        if source:
            needle = source.casefold()
            rows = [e for e in rows if needle in (e.source or "").casefold()]
        if not include_demo:
            rows = [e for e in rows if not e.is_demo]
        if start_dt:
            rows = [e for e in rows if (e.occurred_at.replace(tzinfo=timezone.utc) if e.occurred_at.tzinfo is None else e.occurred_at) >= start_dt]
        if end_dt:
            rows = [e for e in rows if (e.occurred_at.replace(tzinfo=timezone.utc) if e.occurred_at.tzinfo is None else e.occurred_at) <= end_dt]
        return [asdict(e) for e in rows[:limit]]

@app.get("/api/v1/events/{event_id:int}")
def event_detail(event_id: int):
    with SessionLocal() as db:
        e=db.get(Event,event_id)
        if not e: raise HTTPException(404,"Evento no encontrado")
        return asdict(e)

@app.get("/api/v1/events/geojson")
def geojson(
    days: Optional[int] = Query(None, ge=1, le=3650),
    min_magnitude: Optional[float] = Query(None, ge=-1, le=10),
    max_magnitude: Optional[float] = Query(None, ge=-1, le=10),
    include_demo: bool = True,
    q: str = "",
):
    """Devuelve eventos filtrados como GeoJSON (coordenadas en orden longitud, latitud)."""
    if min_magnitude is not None and max_magnitude is not None and min_magnitude > max_magnitude:
        raise HTTPException(422, "min_magnitude no puede ser mayor que max_magnitude.")
    cutoff = datetime.now(timezone.utc) - timedelta(days=days) if days is not None else None
    needle = q.casefold().strip()
    with SessionLocal() as db:
        rows = db.scalars(select(Event).order_by(Event.occurred_at.desc())).all()
        features = []
        for e in rows:
            occurred = e.occurred_at.replace(tzinfo=timezone.utc) if e.occurred_at.tzinfo is None else e.occurred_at.astimezone(timezone.utc)
            if cutoff and occurred < cutoff:
                continue
            if min_magnitude is not None and e.magnitude < min_magnitude:
                continue
            if max_magnitude is not None and e.magnitude > max_magnitude:
                continue
            if not include_demo and e.is_demo:
                continue
            if needle and needle not in " ".join([e.place or "", e.source or "", e.external_id or ""]).casefold():
                continue
            if not (-90 <= e.latitude <= 90 and -180 <= e.longitude <= 180):
                continue
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [e.longitude, e.latitude]},
                "properties": {
                    "id": e.id, "external_id": e.external_id, "place": e.place,
                    "magnitude": e.magnitude, "magnitude_type": e.magnitude_type,
                    "depth_km": e.depth_km, "occurred_at": occurred.isoformat(),
                    "source": e.source, "source_url": e.source_url,
                    "is_demo": e.is_demo, "review_status": e.review_status,
                },
            })
        return {"type": "FeatureCollection", "features": features, "count": len(features),
                "filters": {"days": days, "min_magnitude": min_magnitude,
                            "max_magnitude": max_magnitude, "include_demo": include_demo}}

@app.get("/api/v1/dashboard/summary")
def summary():
    with SessionLocal() as db:
        events=db.scalars(select(Event)).all()
        now=datetime.now(timezone.utc); recent=[e for e in events if (now-e.occurred_at.replace(tzinfo=timezone.utc) if e.occurred_at.tzinfo is None else now-e.occurred_at).days < 7]
        mags=[e.magnitude for e in events]; depths=[e.depth_km for e in events]
        ordered=sorted(depths)
        median=(ordered[len(ordered)//2] if len(ordered)%2 else (ordered[len(ordered)//2-1]+ordered[len(ordered)//2])/2) if ordered else 0
        bins={"< 2.0":0,"2.0–2.9":0,"3.0–3.9":0,"4.0–4.9":0,"5.0+":0}
        for m in mags:
            key="< 2.0" if m<2 else "2.0–2.9" if m<3 else "3.0–3.9" if m<4 else "4.0–4.9" if m<5 else "5.0+"
            bins[key]+=1
        byday={}
        for e in events:
            occurred = e.occurred_at.replace(tzinfo=timezone.utc) if e.occurred_at.tzinfo is None else e.occurred_at.astimezone(timezone.utc)
            key=occurred.strftime("%Y-%m-%d"); byday[key]=byday.get(key,0)+1
        return {"total_events":len(events),"recent_events":len(recent),"avg_magnitude":round(sum(mags)/len(mags),2) if mags else 0,"avg_depth":round(sum(depths)/len(depths),2) if depths else 0,"median_depth":round(median,2),"last_sync":max([e.received_at for e in events]).isoformat() if events else None,"demo_events":sum(1 for e in events if e.is_demo),"magnitude_distribution":[{"label":k,"count":v} for k,v in bins.items()],"timeseries":[{"date":k,"count":v} for k,v in sorted(byday.items())[-14:]],"recent":[asdict(e) for e in sorted(events,key=lambda x:x.occurred_at,reverse=True)[:6]]}

@app.post("/api/v1/sources/sync-usgs")
def sync_usgs():
    url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    try:
        req=urllib.request.Request(url, headers={"User-Agent":"SismoPlatformEnterprise/1.0"})
        with urllib.request.urlopen(req,timeout=12) as r: payload=json.loads(r.read().decode("utf-8"))
        inserted=0
        with SessionLocal() as db:
            for f in payload.get("features",[]):
                p=f.get("properties") or {}; g=f.get("geometry") or {}; coords=g.get("coordinates") or []
                if len(coords)<3 or p.get("mag") is None: continue
                ext=str(f.get("id") or "")
                if not ext or db.scalar(select(Event.id).where(Event.external_id==ext)): continue
                db.add(Event(external_id=ext,source="USGS",occurred_at=datetime.fromtimestamp((p.get("time") or 0)/1000,tz=timezone.utc),longitude=float(coords[0]),latitude=float(coords[1]),depth_km=float(coords[2]),magnitude=float(p["mag"]),magnitude_type=str(p.get("magType") or "unknown"),place=str(p.get("place") or "Ubicación no informada"),source_url=str(p.get("url") or ""),review_status="Pendiente de revisión",is_demo=False)); inserted+=1
            src=db.scalar(select(DataSource).where(DataSource.name=="USGS Earthquake Feed"))
            if src: src.last_sync_at=datetime.now(timezone.utc); src.status="Disponible"; src.last_message=f"Consulta completada. {inserted} eventos nuevos."
            db.commit(); audit(db,"SYNC_USGS","data_sources",src.id if src else "",f"{inserted} eventos nuevos")
        return {"status":"ok","received":len(payload.get("features",[])),"inserted":inserted,"message":f"Sincronización completada: {inserted} nuevos eventos."}
    except Exception as ex:
        with SessionLocal() as db:
            src=db.scalar(select(DataSource).where(DataSource.name=="USGS Earthquake Feed"))
            if src: src.status="Error de conexión"; src.last_message=str(ex)[:400]; db.commit()
            audit(db,"SYNC_USGS_ERROR","data_sources","",str(ex)[:250])
        raise HTTPException(502, "No se pudo sincronizar con USGS. Verifique la conexión y vuelva a intentar.")

@app.post("/api/v1/sources/sync-usgs-history")
def sync_usgs_history(days: int = Query(30, ge=1, le=365), min_magnitude: float = Query(2.5, ge=-1, le=10)):
    """Importa eventos históricos reales del catálogo oficial USGS (hasta 365 días por consulta)."""
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    params = urllib.parse.urlencode({
        "format": "geojson", "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime": end.strftime("%Y-%m-%dT%H:%M:%S"), "minmagnitude": min_magnitude,
        "orderby": "time", "limit": 20000
    })
    url = "https://earthquake.usgs.gov/fdsnws/event/1/query?" + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SismoPlatformEnterprise/1.1 (educational research; USGS ComCat)"})
        with urllib.request.urlopen(req, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
        inserted = 0
        skipped = 0
        with SessionLocal() as db:
            for feature in payload.get("features", []):
                props = feature.get("properties") or {}
                coords = (feature.get("geometry") or {}).get("coordinates") or []
                ext = str(feature.get("id") or "")
                if len(coords) < 3 or props.get("mag") is None or not ext:
                    skipped += 1
                    continue
                if db.scalar(select(Event.id).where(Event.external_id == ext)):
                    skipped += 1
                    continue
                try:
                    lat, lon, depth = float(coords[1]), float(coords[0]), float(coords[2])
                    mag = float(props["mag"])
                    if not (-90 <= lat <= 90 and -180 <= lon <= 180 and math.isfinite(mag) and math.isfinite(depth)):
                        skipped += 1
                        continue
                    event_time = datetime.fromtimestamp((props.get("time") or 0) / 1000, tz=timezone.utc)
                except (ValueError, TypeError, OverflowError):
                    skipped += 1
                    continue
                db.add(Event(external_id=ext, source="USGS ComCat", occurred_at=event_time,
                    latitude=lat, longitude=lon, depth_km=depth, magnitude=mag,
                    magnitude_type=str(props.get("magType") or "unknown"),
                    place=str(props.get("place") or "Ubicación no informada"),
                    source_url=str(props.get("url") or ""), review_status="Pendiente de revisión", is_demo=False))
                inserted += 1
            source = db.scalar(select(DataSource).where(DataSource.name == "USGS Earthquake Feed"))
            if source:
                source.last_sync_at = datetime.now(timezone.utc)
                source.status = "Disponible"
                source.last_message = f"Catálogo histórico consultado ({days} días, M≥{min_magnitude}); {inserted} eventos nuevos."
            db.commit()
            audit(db, "SYNC_USGS_HISTORY", "data_sources", source.id if source else "", f"{inserted} insertados; {skipped} omitidos")
        return {"status": "ok", "source": "USGS ComCat FDSN Event API", "period_days": days,
                "min_magnitude": min_magnitude, "received": len(payload.get("features", [])),
                "inserted": inserted, "skipped_existing_or_invalid": skipped,
                "source_url": "https://earthquake.usgs.gov/fdsnws/event/1/", 
                "message": f"Importación histórica finalizada: {inserted} eventos nuevos. Los datos son reportes del catálogo USGS, no predicciones."}
    except Exception as ex:
        with SessionLocal() as db:
            source = db.scalar(select(DataSource).where(DataSource.name == "USGS Earthquake Feed"))
            if source:
                source.status = "Error de conexión"
                source.last_message = str(ex)[:400]
                db.commit()
            audit(db, "SYNC_USGS_HISTORY_ERROR", "data_sources", "", str(ex)[:250])
        raise HTTPException(502, "No se pudo consultar el catálogo histórico USGS. Intente nuevamente más tarde.")

@app.get("/api/v1/sources/usgs-info")
def usgs_info():
    return {"name": "USGS Earthquake Catalog (ComCat)",
            "organization": "U.S. Geological Survey", "feed_url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
            "official_catalog": "https://earthquake.usgs.gov/earthquakes/search/",
            "historical_api": "https://earthquake.usgs.gov/fdsnws/event/1/",
            "documentation": "https://earthquake.usgs.gov/data/comcat/",
            "data_note": "Eventos observados/publicados por USGS. Magnitudes, ubicaciones y tiempos pueden revisarse por la fuente.",
            "official_alerts": False}

@app.get("/api/v1/sources")
def sources():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(DataSource).order_by(DataSource.id)).all()]

@app.get("/api/v1/analytics/summary")
def analytics():
    with SessionLocal() as db:
        rows=db.scalars(select(Event)).all()
        if not rows: return {"count":0,"mean_magnitude":0,"median_magnitude":0,"mean_depth":0,"correlation":None,"scatter":[],"warning":"Sin datos"}
        mags=sorted(e.magnitude for e in rows); depths=[e.depth_km for e in rows]; n=len(mags)
        med=mags[n//2] if n%2 else (mags[n//2-1]+mags[n//2])/2
        mx=sum(mags)/n; dy=sum(depths)/n
        cov=sum((e.magnitude-mx)*(e.depth_km-dy) for e in rows)/n
        vx=sum((e.magnitude-mx)**2 for e in rows)/n; vy=sum((e.depth_km-dy)**2 for e in rows)/n
        corr=cov/(vx*vy)**.5 if vx and vy else None
        return {"count":n,"mean_magnitude":round(mx,3),"median_magnitude":round(med,3),"mean_depth":round(dy,3),"correlation":round(corr,3) if corr is not None else None,"scatter":[{"x":e.depth_km,"y":e.magnitude,"place":e.place} for e in rows],"warning":"Análisis descriptivo de registros; correlación no implica causalidad."}

@app.get("/api/v1/datasets")
def datasets():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(Dataset).order_by(Dataset.created_at.desc())).all()]

@app.get("/api/v1/datasets/quality")
def dataset_quality(include_demo: bool = False):
    """Resumen de calidad de los eventos registrados; no modifica los datos."""
    with SessionLocal() as db:
        stmt = select(Event)
        if not include_demo:
            stmt = stmt.where(Event.is_demo == False)
        rows = db.scalars(stmt).all()
        total = len(rows)
        invalid_coordinates = sum(1 for e in rows if not (-90 <= e.latitude <= 90 and -180 <= e.longitude <= 180))
        invalid_magnitude = sum(1 for e in rows if not math.isfinite(e.magnitude) or not (-1 <= e.magnitude <= 10))
        invalid_depth = sum(1 for e in rows if not math.isfinite(e.depth_km) or e.depth_km < 0)
        missing_source_url = sum(1 for e in rows if not e.source_url)
        duplicate_external_ids = total - len({e.external_id for e in rows})
        issues = invalid_coordinates + invalid_magnitude + invalid_depth + duplicate_external_ids
        return {
            "records": total,
            "include_demo": include_demo,
            "valid_coordinates": total - invalid_coordinates,
            "invalid_coordinates": invalid_coordinates,
            "invalid_magnitude": invalid_magnitude,
            "invalid_depth": invalid_depth,
            "missing_source_url": missing_source_url,
            "duplicate_external_ids": duplicate_external_ids,
            "quality_score_percent": round(100 * max(0, total - issues) / total, 2) if total else None,
            "note": "Indicadores de validación automática; revisar la fuente antes de usar datos en investigación.",
        }
@app.post("/api/v1/datasets")
def create_dataset(payload: dict):
    with SessionLocal() as db:
        events=db.scalars(select(Event)).all()
        obj=Dataset(name=str(payload.get("name") or "Dataset de eventos"),source="Eventos registrados",version="1.0",row_count=len(events),null_count=sum(1 for e in events if e.magnitude is None or e.depth_km is None),duplicate_count=0,status="Validado" if events else "Vacío")
        db.add(obj); db.commit(); db.refresh(obj); audit(db,"CREATE_DATASET","datasets",obj.id,obj.name); return asdict(obj)

@app.get("/api/v1/ml/experiments")
def experiments():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(Experiment).order_by(Experiment.created_at.desc())).all()]
@app.post("/api/v1/ml/experiments")
def create_experiment(payload: dict):
    with SessionLocal() as db:
        n=db.scalar(select(func.count()).select_from(Event))
        obj=Experiment(name=str(payload.get("name") or "Experimento exploratorio"),task_type=str(payload.get("task_type") or "Clasificación exploratoria"),algorithm=str(payload.get("algorithm") or "Baseline"),features=str(payload.get("features") or "magnitud, profundidad"),target=str(payload.get("target") or "rango_magnitud"),metrics=json.dumps({"records_available":n,"note":"No se ha entrenado un modelo científico con estas métricas."}),status="Registrado",limitations="Registro de experimento; requiere target científicamente validado, dataset versionado y evaluación temporal.")
        db.add(obj); db.commit(); db.refresh(obj); audit(db,"CREATE_EXPERIMENT","ml_experiments",obj.id,obj.name); return asdict(obj)

@app.post("/api/v1/ml/train-baseline")
def train_baseline():
    """Entrena un baseline didáctico para clasificar rangos de magnitud de eventos ya registrados.

    No pronostica terremotos futuros. Usa ubicación/profundidad para clasificar categorías del catálogo.
    """
    with SessionLocal() as db:
        rows = db.scalars(select(Event).where(Event.is_demo == False, Event.source_url != "")).all()
        if len(rows) < 30:
            raise HTTPException(422, "Se necesitan al menos 30 eventos reales importados desde USGS. Use primero /api/v1/sources/sync-usgs-history.")
        try:
            from sklearn.model_selection import train_test_split
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
            from sklearn.dummy import DummyClassifier
            import numpy as np
        except ImportError:
            raise HTTPException(503, "Falta scikit-learn o numpy. Instale las dependencias actualizadas de requirements.txt.")
        # Target is a descriptive magnitude category of an already reported event.
        def label(m): return "<3" if m < 3 else "3-3.9" if m < 4 else "4-4.9" if m < 5 else "5+"
        X = np.array([[r.latitude, r.longitude, r.depth_km] for r in rows], dtype=float)
        y = np.array([label(r.magnitude) for r in rows])
        classes, counts = np.unique(y, return_counts=True)
        if len(classes) < 2 or min(counts) < 2:
            raise HTTPException(422, "Los datos reales no contienen suficientes registros en al menos dos rangos de magnitud para evaluar el baseline.")
        test_size = max(0.25, len(classes) / len(rows))
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=min(test_size, 0.4), random_state=42, stratify=y)
        model = RandomForestClassifier(n_estimators=150, random_state=42, class_weight="balanced", min_samples_leaf=2)
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, pred, average="weighted", zero_division=0)
        baseline = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
        baseline_accuracy = accuracy_score(y_test, baseline.predict(X_test))
        metrics = {"accuracy": round(float(accuracy_score(y_test, pred)), 4), "weighted_precision": round(float(precision), 4),
                   "weighted_recall": round(float(recall), 4), "weighted_f1": round(float(f1), 4),
                   "baseline_accuracy": round(float(baseline_accuracy), 4), "train_rows": int(len(X_train)),
                   "test_rows": int(len(X_test)), "class_distribution": {str(c): int(n) for c,n in zip(classes, counts)},
                   "confusion_matrix_labels": [str(c) for c in classes],
                   "confusion_matrix": confusion_matrix(y_test, pred, labels=classes).tolist(),
                   "features": ["latitude", "longitude", "depth_km"], "target": "rango de magnitud de evento ya reportado",
                   "warning": "Experimento educativo/descriptivo; no predice ocurrencia, fecha ni ubicación de futuros terremotos."}
        experiment = Experiment(name="Baseline USGS: clasificación descriptiva de magnitud", task_type="Clasificación supervisada exploratoria",
            algorithm="RandomForestClassifier", features="latitude, longitude, depth_km", target="rango de magnitud del evento ya reportado",
            metrics=json.dumps(metrics, ensure_ascii=False), status="Evaluado (experimental)",
            limitations="Modelo exploratorio; no predice terremotos futuros. Validación aleatoria de eventos históricos; no usar para decisiones de seguridad.")
        db.add(experiment); db.commit(); db.refresh(experiment)
        audit(db, "TRAIN_ML_BASELINE", "ml_experiments", experiment.id, "Baseline clasificador entrenado con registros USGS")
        return {"experiment": asdict(experiment), "metrics": metrics}

@app.get("/api/v1/estimates")
def estimates():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(Estimate).order_by(Estimate.created_at.desc())).all()]
@app.post("/api/v1/estimates")
def create_estimate(payload: dict):
    with SessionLocal() as db:
        obj=Estimate(model_name=str(payload.get("model_name") or "Indicador descriptivo"),area=str(payload.get("area") or "Perú"),metric_name=str(payload.get("metric_name") or "magnitud_media_historica"),value=float(payload.get("value") or 0),lower_bound=None,upper_bound=None,disclaimer="Dato exploratorio ingresado por usuario. No es probabilidad validada ni alerta oficial.")
        db.add(obj); db.commit(); db.refresh(obj); audit(db,"CREATE_ESTIMATE","risk_estimates",obj.id,obj.metric_name); return asdict(obj)

@app.get("/api/v1/alert-rules")
def rules():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(AlertRule).order_by(AlertRule.id.desc())).all()]
@app.post("/api/v1/alert-rules")
def create_rule(payload: dict):
    with SessionLocal() as db:
        obj=AlertRule(name=str(payload.get("name") or "Regla nueva"),min_magnitude=float(payload.get("min_magnitude") or 4),zone=str(payload.get("zone") or "Todas las zonas"),severity=str(payload.get("severity") or "Media"),enabled=bool(payload.get("enabled",True)),cooldown_seconds=int(payload.get("cooldown_seconds") or 1800))
        db.add(obj); db.commit(); db.refresh(obj); audit(db,"CREATE_ALERT_RULE","alert_rules",obj.id,obj.name); return asdict(obj)
@app.get("/api/v1/alerts")
def alerts():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(Alert).order_by(Alert.created_at.desc()).limit(500)).all()]
@app.post("/api/v1/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id:int):
    with SessionLocal() as db:
        obj=db.get(Alert,alert_id)
        if not obj: raise HTTPException(404,"Alerta no encontrada")
        obj.status="Revisada"; db.commit(); audit(db,"ACK_ALERT","alerts",obj.id,"Revisión interna"); return asdict(obj)
@app.post("/api/v1/alerts/evaluate")
def evaluate_alerts():
    with SessionLocal() as db:
        rules=db.scalars(select(AlertRule).where(AlertRule.enabled==True)).all()
        events=db.scalars(select(Event).where(Event.is_demo==False)).all()
        created=0
        for e in events:
            for r in rules:
                exists=db.scalar(select(Alert.id).where(Alert.event_id==e.id,Alert.rule_id==r.id))
                if e.magnitude >= r.min_magnitude and not exists:
                    db.add(Alert(event_id=e.id,rule_id=r.id,severity=r.severity,title=f"Evento M {e.magnitude:.1f}: {e.place}",message=f"Evento reportado por {e.source}. Verifique la fuente antes de difundir información.",source_url=e.source_url,status="Pendiente",channel="Interno")); created+=1
        db.commit(); audit(db,"EVALUATE_ALERTS","alerts","",f"{created} alertas internas creadas")
        return {"created":created,"message":"Evaluación terminada. Son avisos internos y no alertas oficiales."}

@app.get("/api/v1/users")
def users():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(AppUser).order_by(AppUser.id)).all()]
@app.post("/api/v1/users")
def create_user(payload: dict):
    email=str(payload.get("email") or "").strip().lower()
    if "@" not in email: raise HTTPException(422,"Correo inválido")
    with SessionLocal() as db:
        if db.scalar(select(AppUser.id).where(AppUser.email==email)): raise HTTPException(409,"El correo ya existe")
        obj=AppUser(full_name=str(payload.get("full_name") or "Usuario"),email=email,role=str(payload.get("role") or "Solo lectura"),status="Activo")
        db.add(obj); db.commit(); db.refresh(obj); audit(db,"CREATE_USER","users",obj.id,email); return asdict(obj)
@app.get("/api/v1/audit-logs")
def audit_logs():
    with SessionLocal() as db: return [asdict(x) for x in db.scalars(select(AuditLog).order_by(AuditLog.occurred_at.desc()).limit(500)).all()]
@app.get("/api/v1/config")
def config():
    return {"application":"Sismo Platform Enterprise","version":"1.0.0","environment":os.getenv("APP_ENV","development"),"timezone":"UTC","official_alerts_enabled":False,"source_integration":"USGS GeoJSON latest hour","notes":["Los eventos demo no son reales.","Estimaciones ML experimentales no predicen con certeza futuros sismos.","Las alertas generadas son internas; no se envían a terceros."]}
@app.get("/api/v1/reports/events.csv")
def report_csv():
    with SessionLocal() as db:
        rows=db.scalars(select(Event).order_by(Event.occurred_at.desc())).all()
        buf=io.StringIO(); writer=csv.writer(buf)
        writer.writerow(["id","external_id","source","occurred_at_utc","latitude","longitude","magnitude","magnitude_type","depth_km","place","source_url","review_status","is_demo"])
        for e in rows: writer.writerow([e.id,e.external_id,e.source,e.occurred_at.isoformat(),e.latitude,e.longitude,e.magnitude,e.magnitude_type,e.depth_km,e.place,e.source_url,e.review_status,e.is_demo])
        db.add(ReportJob(report_type="Eventos CSV",filters="{}",requested_by="Administrador demo",status="Listo")); db.commit(); audit(db,"EXPORT_REPORT","report_jobs","",f"{len(rows)} filas")
        return StreamingResponse(iter([buf.getvalue()]),media_type="text/csv",headers={"Content-Disposition":"attachment; filename=eventos_sismicos.csv"})
