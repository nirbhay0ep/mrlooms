import {decorateListing,validateProduct,productDetails,reviewAction} from './product.server';
import type { D1Database } from '@cloudflare/workers-types';
const segments = ['Fibre','Yarn','Greige fabric','Dyeing & processing','Finished fabric','Garments','Wholesale'];
const kinds = ['Sourcing','Sample','Transport','Warehousing','Payment support'];
export class PublicError extends Error { constructor(message:string,public status=400){super(message)} }
export const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
function constantEqual(a:string,b:string){let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0}
export function field(body:Record<string,unknown>,key:string,max=500,required=true){const v=body[key];if(v===undefined&&!required)return '';if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new PublicError('Please check '+key+'.');return v.trim()}
function emailValue(s:string){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new PublicError('Enter a valid email address.');return s.toLowerCase()}
export async function rate(db:D1Database,key:string,limit:number,seconds:number){const now=Date.now();const row=await db.prepare('INSERT INTO wl_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,now+seconds*1000,now,now).first<{count:number}>();if((row?.count||0)>limit)throw new PublicError('Too many attempts. Please try again later.',429)}
export async function user(req:Request,db:D1Database){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)wl_session=([a-f0-9-]+)/)?.[1];if(!token)return null;return db.prepare('SELECT u.id,u.name,u.email FROM wl_users u JOIN wl_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first<{id:string;name:string;email:string}>()}
async function session(db:D1Database,id:string){const token=crypto.randomUUID()+crypto.randomUUID();await db.prepare('INSERT INTO wl_sessions VALUES(?,?,?)').bind(await digest(token),id,Date.now()+604800000).run();return 'wl_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'}
export async function marketHandler(req:Request,db:D1Database|undefined){
 try{
  if(!db)return json({error:'The marketplace is being prepared. Please try again shortly.'},503);
  const url=new URL(req.url);
  if(req.method==='GET'){
   const op=url.searchParams.get('op')||'listings';
   if(op==='product')return await productDetails(req,db);
   if(op==='listings'){
    const search=(url.searchParams.get('q')||'').slice(0,100);const segment=(url.searchParams.get('segment')||'').slice(0,40);const city=(url.searchParams.get('city')||'').slice(0,80);
    const rows=await db.prepare("SELECT id,company,segment,city,state,title,description,moq,capacity,phone,email,gstin,website,specs_json,photo_ids FROM wl_listings WHERE active=1 AND (?='' OR segment=?) AND (?='' OR city LIKE ?) AND (?='' OR company LIKE ? OR title LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT 100").bind(segment,segment,city,'%'+city+'%',search,'%'+search+'%','%'+search+'%','%'+search+'%').all();return json({listings:rows.results.map(decorateListing)});
   }
   const me=await user(req,db);if(op==='session')return json({user:me});if(!me)throw new PublicError('Please sign in to continue.',401);
   if(op==='workspace'){const listings=await db.prepare('SELECT * FROM wl_listings WHERE user_id=? ORDER BY created_at DESC').bind(me.id).all();const requests=await db.prepare('SELECT r.*,l.company,l.title AS listing_title FROM wl_requests r LEFT JOIN wl_listings l ON l.id=r.listing_id WHERE r.user_id=? OR r.supplier_id=? ORDER BY r.created_at DESC LIMIT 100').bind(me.id,me.id).all();return json({user:me,listings:listings.results.map(decorateListing),requests:requests.results});}
   throw new PublicError('Not found.',404);
  }
  if(req.method!=='POST')throw new PublicError('Method not allowed.',405);
  if(req.headers.get('origin')!==url.origin)throw new PublicError('Request origin was not accepted.',403);
  if(!(req.headers.get('content-type')||'').includes('application/json'))throw new PublicError('JSON required.',415);
  const raw=await req.text();if(raw.length>16000)throw new PublicError('Request is too large.',413);
  let body:Record<string,unknown>;try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw 0}catch{throw new PublicError('Invalid request.')}
  const action=field(body,'action',30);const ip=await digest(req.headers.get('cf-connecting-ip')||'unknown');await rate(db,'ip:'+ip,60,600);
  if(action==='register'||action==='login'){
   const email=emailValue(field(body,'email',254));const password=field(body,'password',128);await rate(db,'auth:'+email,10,900);
   if(action==='register'){
    if(password.length<12)throw new PublicError('Use a password with at least 12 characters.');
    const name=field(body,'name',100);const existing=await db.prepare('SELECT id FROM wl_users WHERE email=?').bind(email).first();if(existing)throw new PublicError('Unable to create this account. Try signing in.');
    const id=crypto.randomUUID(),salt=crypto.randomUUID();await db.prepare('INSERT INTO wl_users VALUES(?,?,?,?,?,?)').bind(id,email,await passwordHash(password,salt),salt,name,Date.now()).run();return json({user:{id,email,name}},201,{'Set-Cookie':await session(db,id)});
   }
   const account=await db.prepare('SELECT * FROM wl_users WHERE email=?').bind(email).first<{id:string;name:string;email:string;password_hash:string;salt:string}>();const calculated=await passwordHash(password,account?.salt||'not-an-account');if(!account||!constantEqual(calculated,account.password_hash))throw new PublicError('Email or password is incorrect.',401);return json({user:{id:account.id,name:account.name,email:account.email}},200,{'Set-Cookie':await session(db,account.id)});
  }
  const me=await user(req,db);if(!me)throw new PublicError('Please sign in to continue.',401);
  if(action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)wl_session=([a-f0-9-]+)/)?.[1];if(token)await db.prepare('DELETE FROM wl_sessions WHERE token_hash=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':'wl_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});}
  if(action==='review'||action==='delete_review')return await reviewAction(req,db,me,body);
  if(action==='listing'){
   await rate(db,'list:'+me.id,15,3600);const id=field(body,'id',40,false)||crypto.randomUUID();const old=await db.prepare('SELECT user_id FROM wl_listings WHERE id=?').bind(id).first<{user_id:string}>();if(old&&old.user_id!==me.id)throw new PublicError('Not allowed.',403);
   const segment=field(body,'segment',40);if(!segments.includes(segment))throw new PublicError('Select a textile segment.');const email=emailValue(field(body,'email',254));const phone=field(body,'phone',25);if(!/^\+?[\d\s()-]{8,25}$/.test(phone))throw new PublicError('Enter a valid business phone.');const gst=field(body,'gstin',15,false).toUpperCase();if(gst&&!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst))throw new PublicError('Please check the GSTIN format.');const website=field(body,'website',300,false);if(website&&!/^https:\/\//i.test(website))throw new PublicError('Website must start with https://');
   const product=await validateProduct(db,me.id,body);
   const values=[id,me.id,field(body,'company',100),segment,field(body,'city',80),field(body,'state',80),field(body,'title',120),field(body,'description',8000),field(body,'moq',80),field(body,'capacity',100,false),phone,email,gst,website,1,Date.now(),JSON.stringify(product.specs),JSON.stringify(product.photo_ids)];
   await db.prepare('INSERT INTO wl_listings(id,user_id,company,segment,city,state,title,description,moq,capacity,phone,email,gstin,website,active,created_at,specs_json,photo_ids) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET company=excluded.company,segment=excluded.segment,city=excluded.city,state=excluded.state,title=excluded.title,description=excluded.description,moq=excluded.moq,capacity=excluded.capacity,phone=excluded.phone,email=excluded.email,gstin=excluded.gstin,website=excluded.website,specs_json=excluded.specs_json,photo_ids=excluded.photo_ids').bind(...values).run();return json({id});
  }
  if(action==='visibility'){const id=field(body,'id',40);if(typeof body.active!=='boolean')throw new PublicError('Invalid visibility.');const r=await db.prepare('UPDATE wl_listings SET active=? WHERE id=? AND user_id=?').bind(body.active?1:0,id,me.id).run();if(!r.meta.changes)throw new PublicError('Listing not found.',404);return json({ok:true});}
  if(action==='request'){
   await rate(db,'request:'+me.id,20,3600);const kind=field(body,'kind',30);if(!kinds.includes(kind))throw new PublicError('Choose a request type.');const listingId=field(body,'listing_id',40,false);const listing=listingId?await db.prepare('SELECT user_id FROM wl_listings WHERE id=? AND active=1').bind(listingId).first<{user_id:string}>():null;if(listingId&&!listing)throw new PublicError('This listing is no longer available.');if(listing?.user_id===me.id)throw new PublicError('Choose a business other than your own.');const needed=field(body,'needed_by',10,false);if(needed&&(!/^\d{4}-\d{2}-\d{2}$/.test(needed)||Number.isNaN(Date.parse(needed))))throw new PublicError('Please check the required date.');const id=crypto.randomUUID();await db.prepare('INSERT INTO wl_requests(id,user_id,supplier_id,listing_id,kind,title,details,quantity,origin,destination,needed_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,me.id,listing?.user_id||null,listingId||null,kind,field(body,'title',120),field(body,'details',3000),field(body,'quantity',100),field(body,'origin',150,false),field(body,'destination',150),needed,Date.now()).run();return json({id,status:'Submitted'},201);
  }
  if(action==='quote'){const id=field(body,'id',40),quote=field(body,'quote',2000);const r=await db.prepare("UPDATE wl_requests SET quote=?,status='Responded' WHERE id=? AND supplier_id=? AND status!='Closed'").bind(quote,id,me.id).run();if(!r.meta.changes)throw new PublicError('Request not found or closed.',404);return json({ok:true});}
  if(action==='close'){const id=field(body,'id',40);const r=await db.prepare("UPDATE wl_requests SET status='Closed' WHERE id=? AND user_id=?").bind(id,me.id).run();if(!r.meta.changes)throw new PublicError('Request not found.',404);return json({ok:true});}
  throw new PublicError('Unknown action.',400);
 }catch(e){if(e instanceof PublicError)return json({error:e.message},e.status);return json({error:'We could not complete this request. Please try again.'},500)}
}
