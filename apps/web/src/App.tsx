import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, BellRing, Boxes, BrainCircuit, ChevronDown, CircleHelp, ClipboardList, Database, Download, FileBarChart, Gauge, Globe2, Layers3, MapPinned, Menu, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, Waves, X, CheckCircle2, Clock3, ExternalLink, Plus, RadioTower, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
type AnyRow = Record<string, any>
const modules = [
  {id:'dashboard',label:'Dashboard',icon:Gauge,group:'OPERACIÓN'},
  {id:'events',label:'Eventos sísmicos',icon:Waves,group:'OPERACIÓN'},
  {id:'map',label:'Mapa sísmico',icon:MapPinned,group:'OPERACIÓN'},
  {id:'datasets',label:'Preparación de datos',icon:Database,group:'ANÁLISIS'},
  {id:'ml',label:'Modelos de Machine Learning',icon:BrainCircuit,group:'ANÁLISIS'},
  {id:'estimates',label:'Estimaciones experimentales',icon:Activity,group:'ANÁLISIS'},
  {id:'rules',label:'Reglas de alertas',icon:SlidersHorizontal,group:'ALERTAS'},
  {id:'alerts',label:'Centro de alertas',icon:BellRing,group:'ALERTAS'},
  {id:'sources',label:'Fuentes de datos',icon:RadioTower,group:'ADMINISTRACIÓN'},
  {id:'reports',label:'Reportes',icon:FileBarChart,group:'ADMINISTRACIÓN'},
  {id:'users',label:'Usuarios y roles',icon:Users,group:'ADMINISTRACIÓN'},
  
{
  id: "audit",
  label: "Auditoría",
  icon: ShieldCheck,
  group: "ADMINISTRACIÓN",
},
{
  id: "config",
  label: "Configuración",
  icon: Settings,
  group: "ADMINISTRACIÓN",
},

]
const get = async (path:string) => { const r=await fetch(API+path); if(!r.ok) throw new Error((await r.json().catch(()=>({detail:'Error de API'}))).detail||'Error de API'); return r.json() }
const post = async (path:string, body?:AnyRow) => { const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}); if(!r.ok) throw new Error((await r.json().catch(()=>({detail:'Error de API'}))).detail||'Error de API'); return r.json() }
const fmtDate = (s:string) => s ? new Date(s).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC' : '—'
const n = (v:any,d=1) => Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:d})
const colors = ['#1e9cf0','#35c6b4','#7b8cff','#f0ae4e','#ec7188']
function App(){
  const [active,setActive]=useState('dashboard'),[collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false)
  const [summary,setSummary]=useState<AnyRow|null>(null),[events,setEvents]=useState<AnyRow[]>([])
  const [rows,setRows]=useState<AnyRow[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('')
  const [search,setSearch]=useState(''),[minMag,setMinMag]=useState(''),[formOpen,setFormOpen]=useState(false),[formName,setFormName]=useState(''),[formExtra,setFormExtra]=useState('')
  const [health,setHealth]=useState(false)
  const refresh = useCallback(async()=>{
    setBusy(true);setError('')
    try{
      const [s,e,h]=await Promise.all([get('/api/v1/dashboard/summary'),get('/api/v1/events'),get('/api/v1/health')])
      setSummary(s);setEvents(Array.isArray(e)?e:(e.items||e.events||[]));setHealth(h.status==='ok')
      const map:Record<string,string>={datasets:'/api/v1/datasets',ml:'/api/v1/ml/experiments',estimates:'/api/v1/estimates',rules:'/api/v1/alert-rules',alerts:'/api/v1/alerts',sources:'/api/v1/sources',users:'/api/v1/users',audit:'/api/v1/audit-logs'}
      if(map[active]) setRows(await get(map[active]))
    }catch(e:any){setError(e.message||'No se pudo conectar con la API.');setHealth(false)}finally{setBusy(false)}
  },[active])
  useEffect(()=>{refresh()},[refresh])
  const filtered=useMemo(()=>events.filter(e=>(!search||`${e.place} ${e.source} ${e.external_id}`.toLowerCase().includes(search.toLowerCase()))&&(!minMag||e.magnitude>=Number(minMag))),[events,search,minMag])
  const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(''),3500)}
  const sync=async()=>{setBusy(true);try{const r=await post('/api/v1/sources/sync-usgs');notify(r.message);await refresh()}catch(e:any){notify(e.message)}finally{setBusy(false)}}
  const downloadReport=()=>{window.open(API+'/api/v1/reports/events.csv','_blank');notify('Se solicitó el reporte CSV de eventos.')}
  const saveForm=async()=>{
    try{
      let endpoint='',body:AnyRow={}
      if(active==='datasets'){endpoint='/api/v1/datasets';body={name:formName}}
      if(active==='ml'){endpoint='/api/v1/ml/experiments';body={name:formName,algorithm:formExtra||'Baseline'}}
      if(active==='estimates'){endpoint='/api/v1/estimates';body={model_name:formName,area:formExtra||'Perú',metric_name:'indicador_exploratorio',value:0}}
      if(active==='rules'){endpoint='/api/v1/alert-rules';body={name:formName,min_magnitude:Number(formExtra)||4,zone:'Perú',severity:'Media'}}
     
if (active === "users") {
  endpoint = "/api/v1/users";

  const separator = formName.indexOf("|");

  const full_name =
    separator >= 0
      ? formName.slice(0, separator).trim()
      : "";

  const email =
    separator >= 0
      ? formName.slice(separator + 1).trim().toLowerCase()
      : "";

  const allowedRoles = [
    "Administrador",
    "Analista",
    "Operador de alertas",
    "Auditor",
    "Solo lectura",
  ];

  if (!full_name || !email || !email.includes("@")) {
    notify(
      "Escribe el nombre y el correo con el formato Nombre completo|correo@empresa.com."
    );
    return;
  }

  const role = formExtra || "Solo lectura";

  if (!allowedRoles.includes(role)) {
    notify("El rol seleccionado no es válido.");
    return;
  }

  body = { full_name, email, role };
}

      if(!endpoint) return
      await post(endpoint,body);setFormOpen(false);setFormName('');setFormExtra('');notify('Registro guardado correctamente.');await refresh()
    }catch(e:any){notify(e.message)}
  }
  const title=modules.find(m=>m.id===active)?.label||'Dashboard'
  return <div className="shell">
    <aside className={`sidebar ${collapsed?'collapsed':''} ${mobile?'mobile-open':''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><div className="brand-copy"><strong>SISMO<span>PLATFORM</span></strong><small>ENTERPRISE MONITORING</small></div><button className="icon-button close-mobile" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="workspace"><span className="workspace-dot"/><div><b>Centro de monitoreo</b><small>Entorno de demostración</small></div><ChevronDown size={15}/></div>
      {['OPERACIÓN','ANÁLISIS','ALERTAS','ADMINISTRACIÓN'].map(group=><div className="nav-group" key={group}><div className="nav-label">{group}</div>{modules.filter(m=>m.group===group).map(m=><button key={m.id} className={`nav-item ${active===m.id?'active':''}`} onClick={()=>{setActive(m.id);setMobile(false)}} title={m.label}><m.icon size={18}/><span>{m.label}</span>{m.id==='alerts'&&<i className="nav-count">{rows.filter(r=>r.status==='Pendiente').length||'•'}</i>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="secure"><ShieldCheck size={17}/><div><b>Operación responsable</b><small>Alertas oficiales deshabilitadas</small></div></div><div className="profile"><div className="avatar">AD</div><div><b>Administrador demo</b><small>Administrador</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className={`main ${collapsed?'wide':''}`}>
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setMobile(true)}><Menu size={19}/></button><div className="crumb">Plataforma <span>/</span> <b>{title}</b></div></div><div className="top-actions"><div className={`api-status ${health?'online':'offline'}`}><span/>{health?'API conectada':'API desconectada'}</div><button className="icon-button" title="Actualizar" onClick={refresh}><RefreshCw size={17} className={busy?'spin':''}/></button><button className="icon-button help" title="Ayuda"><CircleHelp size={18}/></button><div className="top-avatar">AD</div></div></header>
      <div className="content">
        {error&&<div className="error-banner"><AlertTriangle size={18}/><div><b>No se pudo cargar toda la información</b><p>{error} Inicia primero el backend siguiendo README.md.</p></div><button className="icon-button" onClick={()=>setError('')}><X size={17}/></button></div>}
        <div className="page-heading"><div><div className="eyebrow">{active==='dashboard'?'VISTA GENERAL':modules.find(m=>m.id===active)?.group}</div><h1>{title}</h1><p>{pageDescription(active)}</p></div><div className="heading-actions">{['events','dashboard'].includes(active)&&<button className="btn btn-secondary" onClick={downloadReport}><Download size={16}/> Exportar CSV</button>}{active==='events'&&<button className="btn btn-primary" disabled={busy} onClick={sync}><RefreshCw size={16}/> Sincronizar USGS</button>}{['datasets','ml','estimates','rules','users'].includes(active)&&<button className="btn btn-primary" onClick={()=>setFormOpen(!formOpen)}><Plus size={16}/> Nuevo registro</button>}</div></div>
        {formOpen&&<div className="form-panel"><div className="form-head"><b>Nuevo registro</b><button className="icon-button" onClick={()=>setFormOpen(false)}><X size={16}/></button></div><div className="form-fields"><input value={formName} onChange={e=>setFormName(e.target.value)} placeholder={active==='users'?'Nombre completo|correo@empresa.com':'Nombre del registro'} />{active!=='datasets'&&<input value={formExtra} onChange={e=>setFormExtra(e.target.value)} placeholder={active==='rules'?'Magnitud mínima (ej. 4.0)':active==='ml'?'Algoritmo (ej. Baseline)':active==='users'?'Rol':active==='estimates'?'Zona':'Valor opcional'}/>}<button className="btn btn-primary" onClick={saveForm}>Guardar</button></div>{active==='users'&&<small>Formato del primer campo: Nombre completo|correo@empresa.com</small>}</div>}
        {active==='dashboard'&&<Dashboard summary={summary} events={events} busy={busy} onSync={sync} onOpen={setActive}/>}
        {active==='events'&&<><div className="filterbar"><div className="searchbox"><Search size={17}/><input placeholder="Buscar por ubicación, fuente o ID..." value={search} onChange={e=>setSearch(e.target.value)}/></div><label>Magnitud mínima <select value={minMag} onChange={e=>setMinMag(e.target.value)}><option value="">Todas</option><option value="2">2.0+</option><option value="3">3.0+</option><option value="4">4.0+</option><option value="5">5.0+</option></select></label><span className="result-count">{filtered.length} eventos</span></div><div className="panel"><PanelTitle title="Catálogo de eventos" subtitle="Eventos observados con procedencia y estado de revisión"/><EventsTable events={filtered}/></div></>}
        {active==='map'&&<MapPage events={events}/>}

        {['datasets','ml','estimates','rules','alerts','sources','users','audit'].includes(active)&&<DataPage active={active} rows={rows} events={events} onRefresh={refresh} notify={notify}/>}
        {active==='reports'&&<Reports onDownload={downloadReport} events={events}/>}
        {active==='audit'&&<div className="footnote"><ShieldCheck size={16}/> La bitácora registra acciones del sistema. Esta versión es una base funcional de demostración; para producción debe reforzarse la identidad y autorización en servidor.</div>}
        <footer className="footer"><span>© 2026 Sismo Platform Enterprise</span><span><span className="footer-dot"/> Datos y estimaciones con trazabilidad</span><span>Versión 1.0.0 · <a href={`${API}/docs`} target="_blank" rel="noreferrer">Documentación API <ExternalLink size={11}/></a></span></footer>
      </div>
    </main>
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}
function pageDescription(id:string){const d:Record<string,string>={dashboard:'Indicadores ejecutivos de actividad sísmica registrada y estado de la plataforma.',events:'Consulta, filtra y revisa los metadatos de cada evento y su fuente original.',map:'Exploración geográfica con filtros por fecha, magnitud y calidad de coordenadas.',datasets:'Control de calidad y versionado inicial de conjuntos de datos para análisis.',ml:'Registro trazable de experimentos y evaluación supervisada.',estimates:'Resultados exploratorios con contexto, fecha y advertencia científica.',rules:'Define umbrales internos aplicados a eventos recibidos.',alerts:'Seguimiento de avisos internos, revisión y trazabilidad.',sources:'Conectores de datos, estado de sincronización y procedencia.',reports:'Exportación de datos y reportes operativos con fecha de corte.',users:'Usuarios de referencia y roles sugeridos para control de acceso.',audit:'Historial de acciones y parámetros operativos.'};return d[id]||'Gestión de la plataforma de monitoreo sísmico.'}
function PanelTitle({title,subtitle,action}:{title:string,subtitle:string,action?:any}){return <div className="panel-title"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>}
function Stat({label,value,unit,change,icon:Icon,tone='blue'}:any){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}<small>{unit}</small></div><div className="stat-foot">{change}</div></div>}
function Dashboard({summary,events,busy,onSync,onOpen}:any){
 const [periodo,setPeriodo]=useState<'24h'|'7d'|'30d'>('7d')
 const ahora=Date.now()
 const duraciones={
   '24h':24*60*60*1000,
   '7d':7*24*60*60*1000,
   '30d':30*24*60*60*1000
   }
 const eventosPeriodo=useMemo(()=>events.filter((e:any)=>{
   const fecha=new Date(e.occurred_at).getTime()
   return Number.isFinite(fecha)&&fecha<=ahora&&fecha>=ahora-duraciones[periodo]
 }),[events,periodo,ahora])
 const magnitudes=eventosPeriodo.map((e:any)=>Number(e.magnitude)).filter((v:number)=>Number.isFinite(v))
 const profundidades=eventosPeriodo.map((e:any)=>Number(e.depth_km)).filter((v:number)=>Number.isFinite(v))
 const promedio=(valores:number[])=>valores.length?valores.reduce((a,b)=>a+b,0)/valores.length:0
 const profundidadesOrdenadas=[...profundidades].sort((a,b)=>a-b)
 const mitad=Math.floor(profundidadesOrdenadas.length/2)
 const mediana=profundidadesOrdenadas.length
   ?profundidadesOrdenadas.length%2
     ?profundidadesOrdenadas[mitad]
     :(profundidadesOrdenadas[mitad-1]+profundidadesOrdenadas[mitad])/2
   :0
 const s={
   total_events:eventosPeriodo.length,
   recent_events:eventosPeriodo.length,
   avg_magnitude:promedio(magnitudes),
   avg_depth:promedio(profundidades),
   median_depth:mediana,
   recent:[...eventosPeriodo].sort((a:any,b:any)=>new Date(b.occurred_at).getTime()-new Date(a.occurred_at).getTime()).slice(0,5)
 }
 const rangos=[
   {label:'< 2.0',min:0,max:2},
   {label:'2.0–2.9',min:2,max:3},
   {label:'3.0–3.9',min:3,max:4},
   {label:'4.0–4.9',min:4,max:5},
   {label:'5.0+',min:5,max:Infinity}
 ]
 const dist=rangos.map(r=>({label:r.label,count:magnitudes.filter((m:number)=>m>=r.min&&m<r.max).length}))
 const conteoPorDia:Record<string,number>={}
 eventosPeriodo.forEach((e:any)=>{
   const fecha=new Date(e.occurred_at)
   const dia=fecha.toISOString().slice(0,10)
   conteoPorDia[dia]=(conteoPorDia[dia]||0)+1
 })
 const ts=Object.entries(conteoPorDia).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count}))
 const etiquetaPeriodo=periodo==='24h'?'últimas 24 horas':periodo==='7d'?'últimos 7 días':'últimos 30 días'
 return <>
 <div className="demo-notice"><span className="notice-icon"><AlertTriangle size={16}/></span><div><b>Modo de demostración</b><span>Los registros de ejemplo están identificados. Sincroniza una fuente para consultar eventos reales publicados por el proveedor.</span></div><button onClick={onSync} disabled={busy}><RefreshCw size={14}/> Sincronizar fuente</button></div>
 <div className="period-filter"><div><b>Período de consulta</b><small>Mostrando eventos de las {etiquetaPeriodo}</small></div><div className="period-buttons">{([{value:'24h',label:'24 horas'},{value:'7d',label:'7 días'},{value:'30d',label:'30 días'}] as const).map(opcion=><button key={opcion.value} type="button" className={periodo===opcion.value?'selected':''} aria-pressed={periodo===opcion.value} onClick={()=>setPeriodo(opcion.value)}>{opcion.label}</button>)}</div></div>
 <div className="stat-grid"><Stat label="Eventos registrados" value={n(s.total_events,0)} unit="eventos" change={`En las ${etiquetaPeriodo}`} icon={Waves}/><Stat label="Magnitud media" value={n(s.avg_magnitude,2)} unit="Mw / ML*" change="Promedio del período seleccionado" icon={Activity} tone="cyan"/><Stat label="Profundidad media" value={n(s.avg_depth,1)} unit="km" change={`Mediana ${n(s.median_depth,1)} km`} icon={Layers3} tone="purple"/><Stat label="Fuentes y calidad" value="Monitoreo" unit="" change="Verifica estado de conectores" icon={RadioTower} tone="amber"/></div>
 <div className="dashboard-grid"><div className="panel chart-panel"><PanelTitle title="Actividad en el tiempo" subtitle={`Número de registros por día · ${etiquetaPeriodo} · fecha UTC`}/><div className="chart-wrap">{ts.length?<ResponsiveContainer width="100%" height={250}><LineChart data={ts}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="date" tick={{fontSize:11,fill:'#8290a5'}} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:'#8290a5'}} tickLine={false} axisLine={false}/><Tooltip/><Line type="monotone" dataKey="count" name="Eventos" stroke="#1e9cf0" strokeWidth={2.5} dot={{r:3,fill:'#1e9cf0'}}/></LineChart></ResponsiveContainer>:<Empty text="No hay eventos en este período."/>}</div></div>
 <div className="panel chart-panel"><PanelTitle title="Distribución por magnitud" subtitle={`Cantidad de eventos por rango · ${etiquetaPeriodo}`}/><div className="chart-wrap">{eventosPeriodo.length?<ResponsiveContainer width="100%" height={250}><BarChart data={dist}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="label" tick={{fontSize:10,fill:'#8290a5'}} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tick={{fontSize:11,fill:'#8290a5'}} tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="count" name="Eventos" fill="#1e9cf0" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<Empty text="No hay eventos para distribuir por magnitud."/>}</div></div></div>
 <div className="panel"><PanelTitle title="Eventos recientes" subtitle={`Últimos registros de las ${etiquetaPeriodo}`} action={<button className="text-action" onClick={()=>onOpen('events')}>Ver catálogo <ArrowUpRight size={14}/></button>}/><EventsTable events={s.recent}/></div>
 <div className="bottom-grid"><div className="panel"><PanelTitle title="Estado de la plataforma" subtitle="Salud operativa"/><div className="status-row"><span className="status-badge success"><span/>API disponible</span><span className="status-detail">Servicios REST</span></div><div className="status-row"><span className="status-badge info"><span/>Catálogo local</span><span className="status-detail">{n(s.total_events,0)} registros en el período</span></div><div className="status-row"><span className="status-badge warning"><span/>Alertas oficiales</span><span className="status-detail">No habilitadas</span></div></div><div className="panel responsible"><div className="responsible-icon"><ShieldCheck size={21}/></div><div><h3>Información responsable</h3><p>Los modelos estadísticos no pueden predecir con certeza cuándo, dónde ni con qué magnitud ocurrirá un terremoto. Las estimaciones experimentales no son alertas oficiales.</p><button className="text-action" onClick={()=>onOpen('estimates')}>Ver estimaciones <ArrowUpRight size={14}/></button></div></div></div>
 <div className="footnote"><Clock3 size={15}/> Última actualización de indicadores: {new Date().toLocaleString('es-PE')} · * Las magnitudes dependen del tipo reportado por cada fuente.</div></>
}
function EventsTable({events}:any){return <div className="table-scroll"><table><thead><tr><th>EVENTO / UBICACIÓN</th><th>FECHA UTC</th><th>MAGNITUD</th><th>PROFUNDIDAD</th><th>FUENTE</th><th>ESTADO</th></tr></thead><tbody>{events.length?events.map((e:any)=><tr key={e.id}><td><div className="event-place"><span className={`mag-dot ${e.magnitude>=4?'high':e.magnitude>=3?'mid':'low'}`}/><div><b>{e.place}</b><small>{e.external_id}</small></div></div></td><td>{fmtDate(e.occurred_at)}</td><td><span className={`mag-pill ${e.magnitude>=4?'high':e.magnitude>=3?'mid':'low'}`}>{n(e.magnitude,1)}</span></td><td>{n(e.depth_km,1)} km</td><td><span className="source-name">{e.source}</span></td><td><span className={`review ${e.is_demo?'demo':''}`}>{e.review_status}</span></td></tr>):<tr><td colSpan={6}><Empty/></td></tr>}</tbody></table></div>}
function MapPage({events}:any){
 const [period,setPeriod]=useState('30d')
 const [minMagnitude,setMinMagnitude]=useState('0')
 const [magnitudeBand,setMagnitudeBand]=useState('all')
 const [includeDemo,setIncludeDemo]=useState(false)
 const [search,setSearch]=useState('')
 const now=Date.now()
 const periods:Record<string,number>={'24h':24*60*60*1000,'7d':7*24*60*60*1000,'30d':30*24*60*60*1000,'90d':90*24*60*60*1000,'all':Infinity}
 const eventTimestamp=(e:any)=>{const raw=e.occurred_at||e.time||e.datetime||e.event_time||e.date; if(raw===undefined||raw===null||raw==='')return NaN; const value=typeof raw==='number'?(raw<1e12?raw*1000:raw):Date.parse(String(raw)); return Number.isFinite(value)?value:NaN}
 const validEvents=useMemo(()=>{
   const seen=new Set<string>()
   return (Array.isArray(events)?events:[]).filter((e:any)=>{
     const lat=Number(e.latitude),lon=Number(e.longitude),mag=Number(e.magnitude)
     if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180||!Number.isFinite(mag))return false
     const key=String(e.external_id||e.id||`${lat},${lon},${e.occurred_at||''}`)
     if(seen.has(key))return false
     seen.add(key);return true
   })
 },[events])
 const filtered=useMemo(()=>validEvents.filter((e:any)=>{
   const date=eventTimestamp(e),mag=Number(e.magnitude)
   const inPeriod=period==='all'||(Number.isFinite(date)&&date<=now&&date>=now-periods[period])
   const inBand=magnitudeBand==='all'||(magnitudeBand==='small'&&mag<3)||(magnitudeBand==='medium'&&mag>=3&&mag<4)||(magnitudeBand==='large'&&mag>=4)
   return inPeriod&&inBand&&mag>=Number(minMagnitude)&&(includeDemo||!(e.is_demo===true||e.is_demo===1||e.is_demo==='true'))&&(!search||`${e.place||''} ${e.source||''} ${e.external_id||''}`.toLowerCase().includes(search.toLowerCase()))
 }),[validEvents,period,minMagnitude,magnitudeBand,includeDemo,search,now])
 const center=filtered.length?([filtered.reduce((a:number,e:any)=>a+Number(e.latitude),0)/filtered.length,filtered.reduce((a:number,e:any)=>a+Number(e.longitude),0)/filtered.length] as [number,number]):([-12.3,-76.5] as [number,number])
 return <div className="panel map-panel"><PanelTitle title="Mapa sísmico" subtitle="Un solo mapa con filtros sobre los eventos sísmicos disponibles."/>
  <div className="filterbar" style={{flexWrap:'wrap'}}>
   <label>Período <select value={period} onChange={e=>setPeriod(e.target.value)}><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="all">Todo el historial</option></select></label>
   <label>Magnitud mínima <select value={minMagnitude} onChange={e=>setMinMagnitude(e.target.value)}><option value="0">Todas</option><option value="2">2.0+</option><option value="3">3.0+</option><option value="4">4.0+</option><option value="5">5.0+</option><option value="6">6.0+</option></select></label>
   <div className="searchbox"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ubicación, fuente o ID"/></div>
   <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={includeDemo} onChange={e=>setIncludeDemo(e.target.checked)}/> Incluir demostración</label>
   <span className="result-count">{filtered.length} puntos únicos</span>
  </div>
  <div className="map-legend" aria-label="Filtrar por rango de magnitud"><button type="button" aria-pressed={magnitudeBand==='all'} className={magnitudeBand==='all'?'legend-filter selected':'legend-filter'} style={{border: magnitudeBand==='all'?'1px solid #168ee0':'1px solid #d8e1eb',background:magnitudeBand==='all'?'#edf7ff':'#fff',borderRadius:8,padding:'6px 10px',cursor:'pointer'}} onClick={()=>setMagnitudeBand('all')}>Todas las magnitudes</button><button type="button" aria-pressed={magnitudeBand==='small'} className={magnitudeBand==='small'?'legend-filter selected':'legend-filter'} style={{border: magnitudeBand==='small'?'1px solid #168ee0':'1px solid #d8e1eb',background:magnitudeBand==='small'?'#edf7ff':'#fff',borderRadius:8,padding:'6px 10px',cursor:'pointer'}} onClick={()=>setMagnitudeBand(magnitudeBand==='small'?'all':'small')}><i className="legend-dot small"/> Menor a 3</button><button type="button" aria-pressed={magnitudeBand==='medium'} className={magnitudeBand==='medium'?'legend-filter selected':'legend-filter'} style={{border: magnitudeBand==='medium'?'1px solid #168ee0':'1px solid #d8e1eb',background:magnitudeBand==='medium'?'#edf7ff':'#fff',borderRadius:8,padding:'6px 10px',cursor:'pointer'}} onClick={()=>setMagnitudeBand(magnitudeBand==='medium'?'all':'medium')}><i className="legend-dot medium"/> 3.0–3.9</button><button type="button" aria-pressed={magnitudeBand==='large'} className={magnitudeBand==='large'?'legend-filter selected':'legend-filter'} style={{border: magnitudeBand==='large'?'1px solid #168ee0':'1px solid #d8e1eb',background:magnitudeBand==='large'?'#edf7ff':'#fff',borderRadius:8,padding:'6px 10px',cursor:'pointer'}} onClick={()=>setMagnitudeBand(magnitudeBand==='large'?'all':'large')}><i className="legend-dot large"/> 4.0 o más</button></div>
  <MapContainer key={`${period}-${minMagnitude}-${magnitudeBand}-${includeDemo}`} center={center} zoom={4} minZoom={2} maxBounds={[[-85,-180],[85,180]]} maxBoundsViscosity={1} scrollWheelZoom style={{height:'520px',width:'100%',borderRadius:'12px'}}><TileLayer noWrap attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{filtered.map((e:any)=><CircleMarker key={String(e.external_id||e.id)} center={[Number(e.latitude),Number(e.longitude)]} radius={Math.max(4,Math.min(14,Number(e.magnitude)*2.2))} pathOptions={{color:Number(e.magnitude)>=4?'#e45d70':Number(e.magnitude)>=3?'#e6a23c':'#168ee0',fillOpacity:.65}}><Popup><b>{e.place||'Ubicación no indicada'}</b><br/>Magnitud: {n(e.magnitude,1)}<br/>Profundidad: {n(e.depth_km,1)} km<br/>{fmtDate(e.occurred_at)}<br/>Fuente: {e.source||'No indicada'}{e.is_demo?' · DEMO':''}{e.source_url&&<><br/><a href={e.source_url} target="_blank" rel="noreferrer">Abrir evento original</a></>}</Popup></CircleMarker>)}</MapContainer>
  {!filtered.length&&<Empty text="No hay eventos con coordenadas que coincidan con los filtros."/>}
  <p className="map-disclaimer"><AlertTriangle size={14}/> Los puntos representan ubicaciones reportadas; no representan pronósticos ni zonas de impacto. El filtro solo cambia los eventos visibles.</p>
 </div>
}
function AnalysisPage({data,summary}:any){const a=data||{};return <><div className="stat-grid"><Stat label="Tamaño de muestra" value={n(a.count,0)} unit="eventos" change="Registros disponibles" icon={Database}/><Stat label="Magnitud media" value={n(a.mean_magnitude,2)} unit="" change="Media aritmética" icon={Activity} tone="cyan"/><Stat label="Magnitud mediana" value={n(a.median_magnitude,2)} unit="" change="Centro de la distribución" icon={BarChart3} tone="purple"/><Stat label="Profundidad media" value={n(a.mean_depth,1)} unit="km" change="Variable descriptiva" icon={Layers3} tone="amber"/></div><div className="panel"><PanelTitle title="Magnitud frente a profundidad" subtitle="Cada punto es un evento del catálogo; X = profundidad (km), Y = magnitud"/><div className="scatter">{(a.scatter||[]).map((p:any,i:number)=><div key={i} className="scatter-row"><span>{p.place}</span><div className="scatter-track"><i style={{left:`${Math.min(96,Math.max(1,(p.x/Math.max(1,...(a.scatter||[]).map((x:any)=>x.x)))*100))}%`}} title={`${p.x} km / M ${p.y}`}/></div><b>{n(p.x,1)} km · M {n(p.y,1)}</b></div>)}</div><div className="footnote"><AlertTriangle size={15}/>{a.warning||'El análisis es descriptivo. Correlación no implica causalidad.'} Correlación de Pearson: {a.correlation===null||a.correlation===undefined?'No disponible':n(a.correlation,3)}.</div></div><div className="panel"><PanelTitle title="Distribución por rango" subtitle="Frecuencia de los registros guardados"/><div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><BarChart data={summary?.magnitude_distribution||[]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#35b6b0" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div></>}

function SourcesPage({ rows, onRefresh, notify }: any) {
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState("30");

  const sources = rows.map((r: any) => {
    const isUsgs = String(r.name || "")
      .toLowerCase()
      .includes("usgs");

    return {
      ...r,
      officialUrl: isUsgs
        ? "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
        : r.base_url || "https://www.igp.gob.pe/",
      docsUrl: isUsgs
        ? "https://earthquake.usgs.gov/data/comcat/"
        : "https://www.igp.gob.pe/",
      isUsgs,
    };
  });

  const sync = async (history = false) => {
    if (running) return;

    setRunning(true);

    try {
      const endpoint = history
        ? `/api/v1/sources/sync-usgs-history?days=${encodeURIComponent(days)}&min_magnitude=2.5`
        : "/api/v1/sources/sync-usgs";

      const result = await post(endpoint);

      notify(
        result.message || "Sincronización finalizada."
      );

      await onRefresh();
    } catch (error: any) {
      notify(
        error.message || "No se pudo sincronizar la fuente."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="panel">
      <PanelTitle
        title="Administrar conectores"
        subtitle="Procedencia, sincronización, estado y confiabilidad de la ingesta."
        action={
          <button
            className="btn btn-secondary btn-small"
            onClick={onRefresh}
            disabled={running}
          >
            <RefreshCw size={14} />
            Actualizar estado
          </button>
        }
      />

      <div className="stat-grid">
        <Stat
          label="Conectores registrados"
          value={String(sources.length)}
          change="Fuentes configuradas"
          icon={Database}
        />

        <Stat
          label="Disponibles"
          value={String(
            sources.filter(
              (s: any) => s.status === "Disponible"
            ).length
          )}
          change="Según el estado registrado"
          icon={CheckCircle2}
          tone="cyan"
        />

        <Stat
          label="Con errores"
          value={String(
            sources.filter((s: any) =>
              String(s.status || "")
                .toLowerCase()
                .includes("error")
            ).length
          )}
          change="Requieren revisión"
          icon={AlertTriangle}
          tone="amber"
        />

        <Stat
          label="Credenciales"
          value="Protegidas"
          change="No mostrar claves en pantalla"
          icon={ShieldCheck}
          tone="purple"
        />
      </div>

      <div
        className="inline-actions"
        style={{ flexWrap: "wrap", margin: "16px 0" }}
      >
        <button
          className="btn btn-primary"
          disabled={running}
          onClick={() => sync(false)}
        >
          <RefreshCw size={15} />
          {running
            ? "Sincronizando..."
            : "Sincronizar USGS (última hora)"}
        </button>

        <label>
          Histórico (días)
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={running}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
            <option value="180">180 días</option>
            <option value="365">365 días</option>
          </select>
        </label>

        <button
          className="btn btn-secondary"
          disabled={running}
          onClick={() => sync(true)}
        >
          <Clock3 size={15} />
          Importar histórico
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre / organización</th>
              <th>URL / API</th>
              <th>Tipo</th>
              <th>Frecuencia</th>
              <th>Última ejecución</th>
              <th>Último éxito</th>
              <th>Latencia</th>
              <th>Estado</th>
              <th>Límites / licencia</th>
              <th>Contacto</th>
              <th>Secreto referenciado</th>
              <th>Último registro</th>
            </tr>
          </thead>

          <tbody>
            {sources.length > 0 ? (
              sources.map((s: any) => (
                <tr key={s.id || s.name}>
                  <td>
                    <strong>{s.name}</strong>
                    <div>
                      {s.organization ||
                        (s.isUsgs
                          ? "United States Geological Survey"
                          : "Organización por verificar")}
                    </div>
                  </td>

                  <td>
                    <a
                      href={s.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-action"
                    >
                      Abrir fuente original
                      <ExternalLink size={12} />
                    </a>

                    <div>
                      <a
                        href={s.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-action"
                      >
                        Documentación oficial
                      </a>
                    </div>

                    <small style={{ overflowWrap: "anywhere" }}>
                      {s.officialUrl}
                    </small>
                  </td>

                  <td>{s.source_type || "HTTP / GeoJSON"}</td>

                  <td>
                    {s.isUsgs
                      ? "Manual"
                      : "Pendiente de configurar"}
                  </td>

                  <td>{fmtDate(s.last_sync_at)}</td>

                  <td>
                    {s.status === "Disponible"
                      ? fmtDate(s.last_sync_at)
                      : "Sin confirmar"}
                  </td>

                  <td>No medida</td>

                  <td>
                    <span className="review">
                      {s.status || "Pendiente"}
                    </span>
                  </td>

                  <td>
                    {s.isUsgs
                      ? "Feed público; verificar condiciones vigentes"
                      : "Verificar límites y licencia"}
                  </td>

                  <td>
                    {s.isUsgs
                      ? "USGS ComCat"
                      : "Consultar web oficial"}
                  </td>

                  <td>
                    <code>
                      {s.isUsgs
                        ? "USGS_API_TOKEN (si aplica)"
                        : "IGP_API_KEY (si aplica)"}
                    </code>
                    <div>No exponer el valor secreto</div>
                  </td>

                  <td>
                    {s.last_message ||
                      "Sin registros de ejecución"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12}>
                  No hay conectores registrados en la API.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="footnote" style={{ marginTop: 16 }}>
        <ShieldCheck size={16} />
        Los secretos deben configurarse en el backend o en
        un gestor de secretos. No se deben guardar en el
        frontend ni en los logs. El conector IGP necesita
        una integración de API verificada antes de sincronizar.
      </div>
    </div>
  );
}

function DataPage({active,rows,events: eventRowsProp=[],onRefresh,notify}:any){
  
 const configs:Record<string,{title:string,sub:string,cols:string[]}>={datasets:{title:'Conjuntos de datos',sub:'Versiones, tamaño de muestra y validación básica.',cols:['name','source','version','row_count','null_count','status']},ml:{title:'Registro de experimentos',sub:'Trazabilidad de algoritmos, variables y limitaciones.',cols:['name','task_type','algorithm','target','status','created_at']},estimates:{title:'Estimaciones experimentales',sub:'Indicadores exploratorios; no constituyen alertas oficiales.',cols:['model_name','area','metric_name','value','disclaimer','created_at']},rules:{title:'Reglas configuradas',sub:'Umbrales que se aplican a eventos recibidos del proveedor.',cols:['name','min_magnitude','zone','severity','enabled']},alerts:{title:'Bandeja de alertas internas',sub:'Avisos generados por reglas; no se envían a canales públicos.',cols:['title','severity','status','channel','created_at']},sources:{title:'Fuentes registradas',sub:'Procedencia, estado y última sincronización de conectores.',cols:['name','organization','source_type','status','last_sync_at','last_message']},users:{title:'Directorio de usuarios',sub:'Roles de referencia. La autenticación real debe completarse antes de producción.',cols:['full_name','email','role','status','created_at']},audit:{title:'Bitácora de auditoría',sub:'Registro de acciones administrativas y operativas.',cols:['actor','action','entity_type','entity_id','detail','occurred_at']}}
 const c=configs[active]
 const headers:Record<string,string>={name:'Nombre',source:'Fuente',version:'Versión',row_count:'Filas',null_count:'Nulos',status:'Estado',task_type:'Tipo de tarea',algorithm:'Algoritmo',target:'Variable objetivo',created_at:'Fecha',model_name:'Modelo',area:'Zona',metric_name:'Indicador',value:'Valor',disclaimer:'Advertencia',min_magnitude:'Magnitud mínima',zone:'Zona',severity:'Severidad',enabled:'Activa',title:'Título',channel:'Canal',organization:'Organización',source_type:'Tipo',last_sync_at:'Última sincronización',last_message:'Mensaje',full_name:'Nombre',email:'Correo',role:'Rol',actor:'Usuario',action:'Acción',entity_type:'Entidad',entity_id:'ID',detail:'Detalle',occurred_at:'Fecha UTC'}
 const eventRows=Array.isArray(eventRowsProp)?eventRowsProp:[]
 const validEvents=eventRows.filter((e:any)=>Number.isFinite(Number(e.latitude))&&Number.isFinite(Number(e.longitude))&&Number.isFinite(Number(e.magnitude))&&e.occurred_at)
 const [preparedMinMag,setPreparedMinMag]=useState('0')
 const [preparedIncludeDemo,setPreparedIncludeDemo]=useState(false)
 const prepared=validEvents.filter((e:any)=>Number(e.magnitude)>=Number(preparedMinMag)&&(preparedIncludeDemo||!e.is_demo))
 const exportPrepared=()=>{
   const cols=['external_id','source','occurred_at','latitude','longitude','magnitude','depth_km','place','source_url','is_demo']
   const cell=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`
   const csv=[cols.join(','),...prepared.map((e:any)=>cols.map(k=>cell(e[k])).join(','))].join('\r\n')
   const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='dataset_sismico_preparado.csv';a.click();URL.revokeObjectURL(url);notify(`CSV preparado: ${prepared.length} eventos exportados.`)
 }
 if (active === "sources") {
   return <SourcesPage rows={rows} onRefresh={onRefresh} notify={notify} />;
 }
 const magnitudes=eventRows.map((e:any)=>Number(e.magnitude)).filter((v:number)=>Number.isFinite(v))
 const meanMagnitude=magnitudes.length?magnitudes.reduce((a:number,b:number)=>a+b,0)/magnitudes.length:0
 const uniqueIds=new Set(eventRows.map((e:any)=>e.external_id||e.id).filter(Boolean)).size
 return <>{active==='datasets'&&<div className="panel"><PanelTitle title="Preparación rápida del catálogo" subtitle="Revisa la calidad de los eventos y exporta un CSV para análisis externo."/><div className="stat-grid"><Stat label="Eventos cargados" value={n(eventRows.length,0)} change="Registros recibidos de la API" icon={Database}/><Stat label="Con coordenadas y magnitud" value={n(validEvents.length,0)} change="Candidatos para análisis geográfico" icon={CheckCircle2} tone="cyan"/><Stat label="Identificadores únicos" value={n(uniqueIds,0)} change="Estimación basada en ID externo o interno" icon={ShieldCheck} tone="purple"/><Stat label="Filas exportables" value={n(prepared.length,0)} change="Después de los filtros de abajo" icon={Download} tone="amber"/></div><div className="inline-actions" style={{flexWrap:'wrap',margin:'16px 0'}}><label>Magnitud mínima <select value={preparedMinMag} onChange={e=>setPreparedMinMag(e.target.value)}><option value="0">Todas</option><option value="2">2.0+</option><option value="3">3.0+</option><option value="4">4.0+</option><option value="5">5.0+</option></select></label><label><input type="checkbox" checked={preparedIncludeDemo} onChange={e=>setPreparedIncludeDemo(e.target.checked)}/> Incluir demostración</label><button className="btn btn-primary" onClick={exportPrepared} disabled={!prepared.length}><Download size={15}/> Descargar dataset CSV</button></div><p className="footnote"><ShieldCheck size={15}/> Este paso filtra y exporta datos disponibles en el navegador; no altera el catálogo de la base de datos ni sustituye una validación científica.</p></div>}{active==='ml'&&<div className="panel"><PanelTitle title="Diagnóstico antes de entrenar" subtitle="Comprobaciones básicas sobre el catálogo actual; no representa un modelo entrenado."/><div className="stat-grid"><Stat label="Eventos disponibles" value={n(eventRows.length,0)} change="Muestra cargada desde API" icon={Database}/><Stat label="Magnitud media" value={n(meanMagnitude,2)} change="Referencia descriptiva, no predicción" icon={BrainCircuit} tone="cyan"/><Stat label="Eventos con coordenadas" value={n(validEvents.length,0)} change="Útiles para tareas geoespaciales" icon={MapPinned} tone="purple"/><Stat label="Experimentos registrados" value={n(rows.length,0)} change="Registros persistidos por backend" icon={ClipboardList} tone="amber"/></div><p>Flujo recomendado: prepara y exporta el catálogo, define una variable objetivo verificable, separa entrenamiento y prueba por tiempo, compara contra una línea base y registra métricas. No se entrenará un modelo automáticamente desde esta pantalla si la API no expone un endpoint de entrenamiento.</p><button className="btn btn-secondary" onClick={()=>notify('Primero prepara el dataset y define una variable objetivo; no se ha iniciado entrenamiento.')}> <BrainCircuit size={15}/> Revisar requisitos de entrenamiento</button><p className="footnote"><AlertTriangle size={15}/> Los terremotos no se pueden predecir con certeza mediante este diagnóstico. No usarlo para decisiones de seguridad.</p></div>}{active==='estimates'&&<div className="panel"><PanelTitle title="Indicadores experimentales del catálogo" subtitle="Resumen descriptivo calculado en el navegador, no pronóstico sísmico."/><div className="stat-grid"><Stat label="Eventos evaluados" value={n(magnitudes.length,0)} change="Registros con magnitud numérica" icon={Activity}/><Stat label="Magnitud media observada" value={n(meanMagnitude,2)} change="Promedio histórico cargado" icon={Gauge} tone="cyan"/><Stat label="Mayor magnitud en muestra" value={n(magnitudes.length?Math.max(...magnitudes):0,1)} change="Máximo observado, no esperado" icon={Waves} tone="purple"/><Stat label="Estimaciones guardadas" value={n(rows.length,0)} change="Registros de la API" icon={ClipboardList} tone="amber"/></div><p>Estos indicadores describen la muestra recibida. Para comparar períodos, documenta fuente, intervalo temporal, tamaño de muestra y limitaciones; no extrapoles estos valores como predicciones futuras.</p><p className="footnote"><AlertTriangle size={15}/> Las estimaciones experimentales no son alertas oficiales ni predicen cuándo o dónde ocurrirá un sismo.</p></div>}{active==='alerts'&&<div className="panel"><PanelTitle title="Cómo operar las alertas internas" subtitle="Las reglas evalúan eventos registrados; no son un sistema oficial de alerta temprana."/><ol><li>En <b>Reglas de alertas</b>, crea una regla con nombre, magnitud mínima, zona y severidad.</li><li>Verifica que los eventos provengan de una fuente real y sincronizada.</li><li>En este centro, pulsa <b>Evaluar reglas</b> para pedir al backend que evalúe el catálogo.</li><li>Revisa y reconoce los avisos generados para dejar constancia de seguimiento.</li></ol><p className="footnote"><AlertTriangle size={15}/> No se envían avisos públicos ni se debe usar esta función como sustituto de los canales oficiales.</p></div>}{active==='rules'&&<div className="panel"><PanelTitle title="Criterios para reglas" subtitle="Configura umbrales internos prudentes."/><p>Una regla no predice un sismo: solo genera un aviso interno cuando un evento ya registrado cumple las condiciones configuradas. Ajusta magnitud, zona y severidad y luego ejecuta la evaluación desde el Centro de alertas.</p></div>}<div className="panel"><PanelTitle title={c.title} subtitle={c.sub} action={<button className="btn btn-secondary btn-small" onClick={onRefresh}><RefreshCw size={14}/> Actualizar</button>}/>{active==='alerts'&&<div className="inline-actions"><button className="btn btn-primary" onClick={async()=>{try{const r=await post('/api/v1/alerts/evaluate');notify(r.message);onRefresh()}catch(e:any){notify(e.message)}}}><BellRing size={15}/> Evaluar reglas</button><span>Solo evalúa eventos reales sincronizados; se crean avisos internos deduplicados.</span></div>}<div className="table-scroll"><table><thead><tr>{c.cols.map(k=><th key={k}>{headers[k]||k}</th>)}{active==='alerts'&&<th>ACCIÓN</th>}</tr></thead><tbody>{rows.length?rows.map((r:any)=><tr key={r.id}>{c.cols.map(k=><td key={k}>{k==='enabled'?<span className={`review ${r[k]?'good':'demo'}`}>{r[k]?'Sí':'No'}</span>:k==='status'?<span className="review">{r[k]}</span>:k==='created_at'||k==='last_sync_at'||k==='occurred_at'?fmtDate(r[k]):k==='disclaimer'||k==='detail'||k==='last_message'?<span className="truncate" title={String(r[k]||'')}>{String(r[k]||'—')}</span>:String(r[k]??'—')}</td>)}{active==='alerts'&&<td>{r.status==='Pendiente'&&<button className="text-action" onClick={async()=>{await post(`/api/v1/alerts/${r.id}/acknowledge`);notify('Alerta marcada como revisada.');onRefresh()}}>Marcar revisada</button>}</td>}</tr>):<tr><td colSpan={c.cols.length+1}><Empty text="Todavía no hay registros en este módulo."/></td></tr>}</tbody></table></div></div>{active==='ml'&&<div className="footnote"><BrainCircuit size={16}/> Esta versión registra experimentos, pero no simula un entrenamiento válido. Para activar ML se necesita una variable objetivo defendible, datasets versionados y evaluación temporal.</div>}{active==='users'&&<div className="footnote"><ShieldCheck size={16}/> Los roles son metadatos de referencia en esta versión; no deben considerarse control de acceso completo en producción.</div>}</>
}

function Reports({ onDownload, events }: any) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const [minimumMagnitude, setMinimumMagnitude] = useState("0");

  const filteredEvents = events.filter((event: any) => {
    const isDemo = Boolean(event.is_demo);
    return (
      (includeDemo || !isDemo) &&
      Number(event.magnitude || 0) >= Number(minimumMagnitude)
    );
  });

  const exportFilteredCSV = () => {
    const columns = [
      "external_id",
      "source",
      "occurred_at",
      "latitude",
      "longitude",
      "magnitude",
      "depth_km",
      "place",
      "source_url",
      "review_status",
      "is_demo",
    ];

    const escapeCSV = (value: any) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      columns.join(","),
      ...filteredEvents.map((event: any) =>
        columns.map((column) => escapeCSV(event[column])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reporte_sismico_filtrado.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Registros del reporte"
          value={n(filteredEvents.length, 0)}
          unit="eventos"
          change="Resultado de los filtros aplicados"
          icon={Database}
        />

        <Stat
          label="Magnitud mínima"
          value={minimumMagnitude}
          unit=""
          change="Filtro del informe"
          icon={BarChart3}
          tone="cyan"
        />

        <Stat
          label="Fecha de generación"
          value={new Date().toLocaleDateString("es-PE")}
          unit=""
          change="Fecha local del navegador"
          icon={Clock3}
          tone="purple"
        />

        <Stat
          label="Formato"
          value="CSV"
          unit=""
          change="Compatible con Excel"
          icon={FileBarChart}
          tone="amber"
        />
      </div>

      <div className="panel">
        <PanelTitle
          title="Filtros del reporte"
          subtitle="Selecciona los registros que deseas exportar."
        />

        <div className="inline-actions">
          <label>
            Magnitud mínima
            <select
              value={minimumMagnitude}
              onChange={(e) => setMinimumMagnitude(e.target.value)}
            >
              <option value="0">Todas</option>
              <option value="2">2.0 o más</option>
              <option value="3">3.0 o más</option>
              <option value="4">4.0 o más</option>
              <option value="5">5.0 o más</option>
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            Incluir datos de demostración
          </label>

          <button
            className="btn btn-primary"
            onClick={exportFilteredCSV}
          >
            <Download size={16} />
            Exportar reporte filtrado
          </button>

          <button
            className="btn btn-secondary"
            onClick={onDownload}
          >
            <Database size={16} />
            Exportar catálogo completo del servidor
          </button>
        </div>
      </div>

      <div className="panel">
        <PanelTitle
          title="Vista previa del reporte"
          subtitle="Se muestran los datos que coinciden con los filtros."
        />

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Fuente</th>
                <th>Fecha UTC</th>
                <th>Magnitud</th>
                <th>Ubicación</th>
                <th>Tipo de dato</th>
              </tr>
            </thead>

            <tbody>
              {filteredEvents.length > 0 ? (
                filteredEvents.slice(0, 100).map((event: any) => (
                  <tr key={event.id}>
                    <td>{event.external_id || event.id}</td>
                    <td>{event.source || "—"}</td>
                    <td>{fmtDate(event.occurred_at)}</td>
                    <td>{n(event.magnitude, 1)}</td>
                    <td>{event.place || "—"}</td>
                    <td>
                      {event.is_demo ? "Demostración" : "Registrado"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    No hay registros que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="footnote">
          La vista previa muestra hasta 100 registros. El CSV filtrado
          incluye todos los registros disponibles en el navegador.
          El catálogo completo se exporta desde el servidor.
        </p>
      </div>
    </>
  );
}

function AuditPage({
  rows,
  onRefresh,
}: {
  rows: any[];
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("Todas");

  const actions = Array.from(
    new Set(rows.map((row) => row.action).filter(Boolean))
  );

  const filtered = rows.filter((row) => {
    const text = [
      row.actor,
      row.action,
      row.entity_type,
      row.entity_id,
      row.detail,
    ]
      .join(" ")
      .toLowerCase();

    return (
      text.includes(query.toLowerCase()) &&
      (actionFilter === "Todas" || row.action === actionFilter)
    );
  });

  return (
    <div className="panel">
      <PanelTitle
        title="Auditoría del sistema"
        subtitle="Consulta las acciones registradas por el backend."
        action={
          <button
            className="btn btn-secondary btn-small"
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
            Actualizar bitácora
          </button>
        }
      />

      <div className="filterbar">
        <div className="searchbox">
          <Search size={17} />
          <input
            placeholder="Buscar usuario, acción o detalle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <label>
          Acción
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="Todas">Todas las acciones</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <span className="result-count">
          {filtered.length} registros
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha UTC</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>ID</th>
              <th>Detalle</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row: any) => (
                <tr key={row.id}>
                  <td>{fmtDate(row.occurred_at)}</td>
                  <td>{row.actor || "Sistema"}</td>
                  <td>
                    <span className="review">
                      {row.action || "—"}
                    </span>
                  </td>
                  <td>{row.entity_type || "—"}</td>
                  <td>{row.entity_id || "—"}</td>
                  <td>
                    <span
                      className="truncate"
                      title={String(row.detail || "")}
                    >
                      {row.detail || "—"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  No se encontraron registros de auditoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="footnote">
        Esta pantalla filtra los registros recibidos. La integridad,
        retención y protección contra modificaciones de la bitácora
        deben garantizarse en el backend.
      </p>
    </div>
  );
}

function ConfigurationPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadConfig = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await get("/api/v1/config");
      setConfig(data);
    } catch (e: any) {
      setError(
        e.message || "No se pudo cargar la configuración."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div className="panel">
      <PanelTitle
        title="Configuración del sistema"
        subtitle="Consulta los parámetros operativos publicados por el backend."
        action={
          <button
            className="btn btn-secondary btn-small"
            onClick={loadConfig}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {loading ? "Consultando..." : "Actualizar"}
          </button>
        }
      />

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !config && (
        <p>Consultando configuración del servidor...</p>
      )}

      {config && (
        <>
          <div className="stat-grid">
            <Stat
              label="Versión"
              value={config.version || "No indicada"}
              unit=""
              change="Versión publicada por la API"
              icon={Settings}
            />

            <Stat
              label="Entorno"
              value={config.environment || "No indicado"}
              unit=""
              change="Configuración del servidor"
              icon={Database}
              tone="cyan"
            />

            <Stat
              label="Zona horaria"
              value={config.timezone || "No indicada"}
              unit=""
              change="Referencia temporal"
              icon={Clock3}
              tone="purple"
            />

            <Stat
              label="Alertas oficiales"
              value={
                config.official_alerts_enabled
                  ? "Habilitadas"
                  : "Deshabilitadas"
              }
              unit=""
              change="Estado informado por la API"
              icon={ShieldCheck}
              tone="amber"
            />
          </div>

          <div className="table-scroll">
            <table>
              <tbody>
                <tr>
                  <th>Aplicación</th>
                  <td>{config.application || "—"}</td>
                </tr>
                <tr>
                  <th>Integración principal</th>
                  <td>{config.source_integration || "—"}</td>
                </tr>
                <tr>
                  <th>Alertas oficiales</th>
                  <td>
                    {config.official_alerts_enabled
                      ? "Habilitadas"
                      : "Deshabilitadas"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Notas operativas</h3>

          {Array.isArray(config.notes) &&
          config.notes.length > 0 ? (
            <ul>
              {config.notes.map(
                (note: string, index: number) => (
                  <li key={index}>{note}</li>
                )
              )}
            </ul>
          ) : (
            <p>No hay notas operativas publicadas.</p>
          )}

          <p className="footnote">
            Esta pantalla consulta la configuración del servidor.
            No modifica parámetros ni secretos.
          </p>
        </>
      )}
    </div>
  );
}

function Empty({text='No hay datos disponibles para mostrar.'}:any){return <div className="empty"><div><Boxes size={23}/></div><b>{text}</b></div>}
export default App
