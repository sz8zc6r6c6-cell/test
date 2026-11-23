import {useQuery} from '@tanstack/react-query';
import {queryEntities,getDocument,openEntity,type DocumentNodeJson} from '@/lib/fibery';
const DB='RD TEST Гипотезы/Гипотезы Notion', NS='RD TEST Гипотезы/';
type Ref={'Collaboration~Documents/secret':string};
type Row={ 'fibery/id':string; 'fibery/public-id':string; 'RD TEST Гипотезы/Name':string; 'RD TEST Гипотезы/Notion Link':string; 'RD TEST Гипотезы/Статус':{'enum/name':string}|null; 'RD TEST Гипотезы/Дата появления TEST':string|null; 'RD TEST Гипотезы/Archived':boolean; 'RD TEST Гипотезы/Deleted in Notion':string|null; 'RD TEST Гипотезы/ID':Ref|null; 'RD TEST Гипотезы/Предшественники ID':Ref|null; };
type Node={uuid:string;publicId:string;id:string;title:string;status:string;date:string;notion:string;parents:string[]};
function plain(n:DocumentNodeJson):string{return (n.text||'')+(n.content||[]).map(plain).join(n.type==='doc'?'\n':'');}
async function text(r:Ref|null){return r?.['Collaboration~Documents/secret']?plain((await getDocument({secret:r['Collaboration~Documents/secret']})).doc).trim():'';}
async function load():Promise<Node[]>{
 const rows:Row[]=[];
 for(let offset=0;offset<10000;offset+=100){
  const page=await queryEntities<Row>({type:DB,fields:['fibery/id','fibery/public-id',NS+'Name',NS+'Notion Link',NS+'Дата появления TEST',NS+'Archived',NS+'Deleted in Notion',{[NS+'Статус']:['enum/name']},{[NS+'ID']:['Collaboration~Documents/secret']},{[NS+'Предшественники ID']:['Collaboration~Documents/secret']}],orderBy:{field:'fibery/public-id',direction:'asc'},limit:100,offset});
  rows.push(...page);if(page.length<100)break;if(offset===9900)throw Error('Карта превышает предел 10 000 записей.');
 }
 const nodes:Node[]=[];
 for(const r of rows){
  if(r['RD TEST Гипотезы/Archived']||r['RD TEST Гипотезы/Deleted in Notion']==='yes')continue;
  const [id,parents]=await Promise.all([text(r['RD TEST Гипотезы/ID']),text(r['RD TEST Гипотезы/Предшественники ID'])]);
  nodes.push({uuid:r['fibery/id'],publicId:r['fibery/public-id'],id:id||r['RD TEST Гипотезы/Name'].match(/^H-[A-Z0-9-]+/)?.[0]||r['fibery/public-id'],title:r['RD TEST Гипотезы/Name'],status:r['RD TEST Гипотезы/Статус']?.['enum/name']||'Без статуса',notion:r['RD TEST Гипотезы/Notion Link'],date:r['RD TEST Гипотезы/Дата появления TEST']||'',parents:[...new Set(parents.split(/[,;\s]+/).filter(Boolean))]});
 }
 return nodes;
}
function arrange(nodes:Node[]){
 const byId=new Map<string,Node[]>();nodes.forEach(n=>byId.set(n.id,[...(byId.get(n.id)||[]),n]));
 const depths=new Map<string,number>(),warnings=new Set<string>();
 for(const [id,ns] of byId)if(ns.length>1)warnings.add('Повтор ID: '+id);
 function depth(n:Node,path:Set<string>):number{
  if(path.has(n.uuid)){warnings.add('Цикл у '+n.id);return 0;}
  if(depths.has(n.uuid))return depths.get(n.uuid)!;
  const next=new Set(path);next.add(n.uuid);let d=0;
  for(const id of n.parents){const ps=byId.get(id);if(!ps){warnings.add(n.id+': не найден '+id);continue;}if(ps.length===1)d=Math.max(d,depth(ps[0],next)+1);}
  depths.set(n.uuid,d);return d;
 }
 nodes.forEach(n=>depth(n,new Set()));
 const groups=new Map<number,Node[]>();nodes.forEach(n=>{const d=depths.get(n.uuid)||0;groups.set(d,[...(groups.get(d)||[]),n]);});
 const width=Math.max(720,Math.max(1,...[...groups.values()].map(g=>g.length))*350+80);
 const pos=new Map<string,{x:number;y:number}>();groups.forEach((g,d)=>g.forEach((n,i)=>pos.set(n.uuid,{x:(width-g.length*350)/2+i*350,y:40+d*260})));
 return{byId,pos,width,height:Math.max(300,(Math.max(0,...depths.values())+1)*260),warnings:[...warnings]};
}
function tone(s:string){return s==='Опровергнута'?'highlight-red':s.startsWith('Подтверждена')?'highlight-green':s==='Объединена'?'highlight-purple':s==='На проверке'?'highlight-blue':'bg-secondary text-secondary-foreground';}
export default function App(){
 const q=useQuery({queryKey:['hypotheses-live-map'],queryFn:load,refetchInterval:15000,refetchOnWindowFocus:true});
 const nodes=q.data||[],g=arrange(nodes);
 return <main className="min-h-screen bg-background text-foreground p-6 space-y-5">
 <header className="flex flex-wrap gap-4 items-start justify-between"><div><h1 className="text-2xl font-semibold">Эволюция гипотез</h1><p className="text-sm text-muted-foreground mt-1">Notion → Fibery · автоматическое построение карты</p></div><button className="px-3 py-2 rounded-md border border-border text-sm" onClick={()=>q.refetch()} disabled={q.isFetching}>{q.isFetching?'Проверка…':'Обновить карту'}</button></header>
 <div className="flex flex-wrap gap-3 text-sm"><span className="rounded-md bg-secondary text-secondary-foreground px-3 py-1">Гипотез: {nodes.length}</span><span className="text-muted-foreground">Синхронизация Notion раз в час · проверка карты каждые 15 секунд</span></div>
 {q.isPending&&<p role="status">Загрузка гипотез…</p>}{q.error&&<p role="alert" className="text-destructive">{q.error.message}</p>}
 {g.warnings.length>0&&<p role="alert" className="highlight-yellow rounded-md p-3">{g.warnings.join(' · ')}</p>}
 {!q.isPending&&!q.error&&nodes.length===0&&<p>Создай гипотезу в личной базе Notion. После очередной синхронизации она появится здесь автоматически.</p>}
 {nodes.length>0&&<div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground"><svg width={g.width} height={g.height} className="block mx-auto" role="img" aria-label={`Карта: ${nodes.length} гипотез. Стрелки от предшественников к новым идеям.`}>
 <defs><marker id="hyp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 9 5 L 0 10 z" className="fill-muted-foreground"/></marker></defs>
 {nodes.flatMap(n=>n.parents.flatMap(id=>{const parents=g.byId.get(id);if(parents?.length!==1)return [];const f=g.pos.get(parents[0].uuid)!,t=g.pos.get(n.uuid)!;return <path key={parents[0].uuid+'-'+n.uuid} d={`M ${f.x+155} ${f.y+180} C ${f.x+155} ${f.y+220}, ${t.x+155} ${t.y-40}, ${t.x+155} ${t.y}`} fill="none" className="stroke-muted-foreground" strokeWidth="2" markerEnd="url(#hyp-arrow)"/>;}))}
 {nodes.map(n=>{const p=g.pos.get(n.uuid)!;return <foreignObject key={n.uuid} x={p.x} y={p.y} width="310" height="180"><div className="rounded-lg border border-border bg-background p-4 h-full flex flex-col gap-2"><div className="flex justify-between gap-2 text-xs"><span className="font-mono">{n.id}</span><span className={`rounded px-2 py-1 ${tone(n.status)}`}>{n.status}</span></div><button className="text-left font-medium underline-offset-4 hover:underline break-words line-clamp-3" onClick={()=>openEntity({type:DB,publicId:n.publicId})}>{n.title}</button><div className="mt-auto flex gap-3 justify-between text-xs text-muted-foreground"><span>{n.date?new Date(n.date).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}):'Дата не задана'}</span>{/^https:\/\/(app\.)?notion\.(com|so)\//.test(n.notion)&&<a className="underline" href={n.notion} target="_blank" rel="noreferrer">Notion ↗</a>}</div></div></foreignObject>;})}
 </svg></div>}
 <footer className="text-xs text-muted-foreground" aria-live="polite">{q.dataUpdatedAt?`Карта прочитана: ${new Date(q.dataUpdatedAt).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow'})} МСК`:'Ожидание данных'} · Связи: поле «Предшественники ID». Закрытые гипотезы сохраняются; архивированные скрыты.</footer>
 </main>;
}
