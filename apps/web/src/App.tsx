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
  {id:'analysis',label:'Análisis estadístico',icon:BarChart3,group:'ANÁLISIS'},
  {id:'datasets',label:'Preparación de datos',icon:Database,group:'ANÁLISIS'},
  {id:'ml',label:'Modelos de Machine Learning',icon:BrainCircuit,group:'ANÁLISIS'},
  {id:'estimates',label:'Estimaciones experimentales',icon:Activity,group:'ANÁLISIS'},
  {id:'rules',label:'Reglas de alertas',icon:SlidersHorizontal,group:'ALERTAS'},
  {id:'alerts',label:'Centro de alertas',icon:BellRing,group:'ALERTAS'},
  {id:'sources',label:'Fuentes de datos',icon:RadioTower,group:'ADMINISTRACIÓN'},
  {id:'reports',label:'Reportes',icon:FileBarChart,group:'ADMINISTRACIÓN'},
  {id:'users',label:'Usuarios y roles',icon:Users,group:'ADMINISTRACIÓN'},
  {id:'audit',label:'Auditoría y configuración',icon:ShieldCheck,group:'ADMINISTRACIÓN'}
]
const get = async (path:string) => { const r=await fetch(API+path); if(!r.ok) throw new Error((await r.json().catch(()=>({detail:'Error de API'}))).detail||'Error de API'); return r.json() }
const post = async (path:string, body?:AnyRow) => { const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}); if(!r.ok) throw new Error((await r.json().catch(()=>({detail:'Error de API'}))).detail||'Error de API'); return r.json() }
const fmtDate = (s:string) => s ? new Date(s).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC' : '—'
const n = (v:any,d=1) => Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:d})
const colors = ['#1e9cf0','#35c6b4','#7b8cff','#f0ae4e','#ec7188']
function App(){
  const [active,setActive]=useState('dashboard'),[collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false)
  const [summary,setSummary]=useState<AnyRow|null>(null),[events,setEvents]=useState<AnyRow[]>([]),[analysis,setAnalysis]=useState<AnyRow|null>(null)
  const [rows,setRows]=useState<AnyRow[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('')
  const [search,setSearch]=useState(''),[minMag,setMinMag]=useState(''),[formOpen,setFormOpen]=useState(false),[formName,setFormName]=useState(''),[formExtra,setFormExtra]=useState('')
  const [health,setHealth]=useState(false)
  const refresh = useCallback(async()=>{
    setBusy(true);setError('')
    try{
      const [s,e,a,h]=await Promise.all([get('/api/v1/dashboard/summary'),get('/api/v1/events'),get('/api/v1/analytics/summary'),get('/api/v1/health')])
      setSummary(s);setEvents(e);setAnalysis(a);setHealth(h.status==='ok')
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
      if(active==='users'){endpoint='/api/v1/users';const [full_name,email]=formName.split('|');body={full_name,email,role:formExtra||'Solo lectura'}}
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
        {active==='analysis'&&<AnalysisPage data={analysis} summary={summary}/>}
        {['datasets','ml','estimates','rules','alerts','sources','users','audit'].includes(active)&&<DataPage active={active} rows={rows} onRefresh={refresh} notify={notify}/>}
        {active==='reports'&&<Reports onDownload={downloadReport} events={events}/>}
        {active==='audit'&&<div className="footnote"><ShieldCheck size={16}/> La bitácora registra acciones del sistema. Esta versión es una base funcional de demostración; para producción debe reforzarse la identidad y autorización en servidor.</div>}
        <footer className="footer"><span>© 2026 Sismo Platform Enterprise</span><span><span className="footer-dot"/> Datos y estimaciones con trazabilidad</span><span>Versión 1.0.0 · <a href={`${API}/docs`} target="_blank" rel="noreferrer">Documentación API <ExternalLink size={11}/></a></span></footer>
      </div>
    </main>
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}
function pageDescription(id:string){const d:Record<string,string>={dashboard:'Indicadores ejecutivos de actividad sísmica registrada y estado de la plataforma.',events:'Consulta, filtra y revisa los metadatos de cada evento y su fuente original.',map:'Exploración geográfica de eventos observados. El mapa no representa zonas de impacto.',analysis:'Estadística descriptiva reproducible sobre el catálogo de eventos registrado.',datasets:'Control de calidad y versionado inicial de conjuntos de datos para análisis.',ml:'Registro trazable de experimentos y evaluación supervisada.',estimates:'Resultados exploratorios con contexto, fecha y advertencia científica.',rules:'Define umbrales internos aplicados a eventos recibidos.',alerts:'Seguimiento de avisos internos, revisión y trazabilidad.',sources:'Conectores de datos, estado de sincronización y procedencia.',reports:'Exportación de datos y reportes operativos con fecha de corte.',users:'Usuarios de referencia y roles sugeridos para control de acceso.',audit:'Historial de acciones y parámetros operativos.'};return d[id]||'Gestión de la plataforma de monitoreo sísmico.'}
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
function MapPage({events}:any){return <div className="panel map-panel"><PanelTitle title="Mapa de eventos" subtitle="Ubicaciones publicadas por las fuentes seleccionadas"/><div className="map-legend"><span><i className="legend-dot small"/> Magnitud menor a 3</span><span><i className="legend-dot medium"/> 3.0–3.9</span><span><i className="legend-dot large"/> 4.0 o más</span><span className="map-count">{events.length} puntos</span></div><MapContainer center={[-12.3,-76.5]} zoom={4} scrollWheelZoom style={{height:'520px',width:'100%',borderRadius:'12px'}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{events.map((e:any)=><CircleMarker key={e.id} center={[e.latitude,e.longitude]} radius={Math.max(5,Math.min(14,e.magnitude*2.2))} pathOptions={{color:e.magnitude>=4?'#e45d70':e.magnitude>=3?'#e6a23c':'#168ee0',fillOpacity:.65}}><Popup><b>{e.place}</b><br/>Magnitud: {e.magnitude}<br/>Profundidad: {e.depth_km} km<br/>{fmtDate(e.occurred_at)}<br/>Fuente: {e.source}{e.is_demo?' · DEMO':''}</Popup></CircleMarker>)}</MapContainer><p className="map-disclaimer"><AlertTriangle size={14}/> Los puntos representan ubicaciones reportadas; no representan pronósticos ni zonas de impacto.</p></div>}
function AnalysisPage({data,summary}:any){const a=data||{};return <><div className="stat-grid"><Stat label="Tamaño de muestra" value={n(a.count,0)} unit="eventos" change="Registros disponibles" icon={Database}/><Stat label="Magnitud media" value={n(a.mean_magnitude,2)} unit="" change="Media aritmética" icon={Activity} tone="cyan"/><Stat label="Magnitud mediana" value={n(a.median_magnitude,2)} unit="" change="Centro de la distribución" icon={BarChart3} tone="purple"/><Stat label="Profundidad media" value={n(a.mean_depth,1)} unit="km" change="Variable descriptiva" icon={Layers3} tone="amber"/></div><div className="panel"><PanelTitle title="Magnitud frente a profundidad" subtitle="Cada punto es un evento del catálogo; X = profundidad (km), Y = magnitud"/><div className="scatter">{(a.scatter||[]).map((p:any,i:number)=><div key={i} className="scatter-row"><span>{p.place}</span><div className="scatter-track"><i style={{left:`${Math.min(96,Math.max(1,(p.x/Math.max(1,...(a.scatter||[]).map((x:any)=>x.x)))*100))}%`}} title={`${p.x} km / M ${p.y}`}/></div><b>{n(p.x,1)} km · M {n(p.y,1)}</b></div>)}</div><div className="footnote"><AlertTriangle size={15}/>{a.warning||'El análisis es descriptivo. Correlación no implica causalidad.'} Correlación de Pearson: {a.correlation===null||a.correlation===undefined?'No disponible':n(a.correlation,3)}.</div></div><div className="panel"><PanelTitle title="Distribución por rango" subtitle="Frecuencia de los registros guardados"/><div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><BarChart data={summary?.magnitude_distribution||[]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#35b6b0" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div></>}
function DataPage({active,rows,onRefresh,notify}:any){
 const configs:Record<string,{title:string,sub:string,cols:string[]}>={datasets:{title:'Conjuntos de datos',sub:'Versiones, tamaño de muestra y validación básica.',cols:['name','source','version','row_count','null_count','status']},ml:{title:'Registro de experimentos',sub:'Trazabilidad de algoritmos, variables y limitaciones.',cols:['name','task_type','algorithm','target','status','created_at']},estimates:{title:'Estimaciones experimentales',sub:'Indicadores exploratorios; no constituyen alertas oficiales.',cols:['model_name','area','metric_name','value','disclaimer','created_at']},rules:{title:'Reglas configuradas',sub:'Umbrales que se aplican a eventos recibidos del proveedor.',cols:['name','min_magnitude','zone','severity','enabled']},alerts:{title:'Bandeja de alertas internas',sub:'Avisos generados por reglas; no se envían a canales públicos.',cols:['title','severity','status','channel','created_at']},sources:{title:'Fuentes registradas',sub:'Procedencia, estado y última sincronización de conectores.',cols:['name','organization','source_type','status','last_sync_at','last_message']},users:{title:'Directorio de usuarios',sub:'Roles de referencia. La autenticación real debe completarse antes de producción.',cols:['full_name','email','role','status','created_at']},audit:{title:'Bitácora de auditoría',sub:'Registro de acciones administrativas y operativas.',cols:['actor','action','entity_type','entity_id','detail','occurred_at']}}
 const c=configs[active]
 const headers:Record<string,string>={name:'Nombre',source:'Fuente',version:'Versión',row_count:'Filas',null_count:'Nulos',status:'Estado',task_type:'Tipo de tarea',algorithm:'Algoritmo',target:'Variable objetivo',created_at:'Fecha',model_name:'Modelo',area:'Zona',metric_name:'Indicador',value:'Valor',disclaimer:'Advertencia',min_magnitude:'Magnitud mínima',zone:'Zona',severity:'Severidad',enabled:'Activa',title:'Título',channel:'Canal',organization:'Organización',source_type:'Tipo',last_sync_at:'Última sincronización',last_message:'Mensaje',full_name:'Nombre',email:'Correo',role:'Rol',actor:'Usuario',action:'Acción',entity_type:'Entidad',entity_id:'ID',detail:'Detalle',occurred_at:'Fecha UTC'}
 return <><div className="panel"><PanelTitle title={c.title} subtitle={c.sub} action={<button className="btn btn-secondary btn-small" onClick={onRefresh}><RefreshCw size={14}/> Actualizar</button>}/>{active==='alerts'&&<div className="inline-actions"><button className="btn btn-primary" onClick={async()=>{try{const r=await post('/api/v1/alerts/evaluate');notify(r.message);onRefresh()}catch(e:any){notify(e.message)}}}><BellRing size={15}/> Evaluar reglas</button><span>Solo evalúa eventos reales sincronizados; se crean avisos internos deduplicados.</span></div>}<div className="table-scroll"><table><thead><tr>{c.cols.map(k=><th key={k}>{headers[k]||k}</th>)}{active==='alerts'&&<th>ACCIÓN</th>}</tr></thead><tbody>{rows.length?rows.map((r:any)=><tr key={r.id}>{c.cols.map(k=><td key={k}>{k==='enabled'?<span className={`review ${r[k]?'good':'demo'}`}>{r[k]?'Sí':'No'}</span>:k==='status'?<span className="review">{r[k]}</span>:k==='created_at'||k==='last_sync_at'||k==='occurred_at'?fmtDate(r[k]):k==='disclaimer'||k==='detail'||k==='last_message'?<span className="truncate" title={String(r[k]||'')}>{String(r[k]||'—')}</span>:String(r[k]??'—')}</td>)}{active==='alerts'&&<td>{r.status==='Pendiente'&&<button className="text-action" onClick={async()=>{await post(`/api/v1/alerts/${r.id}/acknowledge`);notify('Alerta marcada como revisada.');onRefresh()}}>Marcar revisada</button>}</td>}</tr>):<tr><td colSpan={c.cols.length+1}><Empty text="Todavía no hay registros en este módulo."/></td></tr>}</tbody></table></div></div>{active==='ml'&&<div className="footnote"><BrainCircuit size={16}/> Esta versión registra experimentos, pero no simula un entrenamiento válido. Para activar ML se necesita una variable objetivo defendible, datasets versionados y evaluación temporal.</div>}{active==='users'&&<div className="footnote"><ShieldCheck size={16}/> Los roles son metadatos de referencia en esta versión; no deben considerarse control de acceso completo en producción.</div>}</>
}
function Reports({onDownload,events}:any){return <><div className="stat-grid"><Stat label="Eventos disponibles" value={n(events.length,0)} unit="filas" change="Incluye columna de origen demo/real" icon={Database}/><Stat label="Formatos disponibles" value="CSV" unit="" change="Exportación tabular" icon={FileBarChart} tone="cyan"/><Stat label="Fecha de corte" value={new Date().toLocaleDateString('es-PE')} unit="" change="Momento de consulta" icon={Clock3} tone="purple"/><Stat label="Trazabilidad" value="Incluida" unit="" change="Fuente y enlace cuando existe" icon={ShieldCheck} tone="amber"/></div><div className="panel report-card"><div className="report-icon"><FileBarChart size={25}/></div><div className="report-copy"><h3>Catálogo de eventos sísmicos</h3><p>Descarga CSV con identificador, fuente, fecha UTC, coordenadas, magnitud, profundidad, localidad, estado y marca de datos de demostración.</p><div className="report-meta"><span><Database size={14}/>{events.length} registros actuales</span><span><ShieldCheck size={14}/>Exportación registrada en auditoría</span></div></div><button className="btn btn-primary" onClick={onDownload}><Download size={16}/> Descargar CSV</button></div><div className="footnote"><AlertTriangle size={15}/> La exportación incluye datos de demostración. Filtra o identifica esos registros antes de cualquier uso operativo.</div></>}
function Empty({text='No hay datos disponibles para mostrar.'}:any){return <div className="empty"><div><Boxes size={23}/></div><b>{text}</b></div>}
export default App
