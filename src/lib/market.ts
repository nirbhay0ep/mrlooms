import {demoEnabled,demoApi} from './demo';
export const segments=['Fibre','Yarn','Greige fabric','Dyeing & processing','Finished fabric','Garments','Wholesale'];
export const kinds=['Sourcing','Sample','Transport','Warehousing','Payment support'];
export type User={id:string;name:string;email:string};
export type Listing={id:string;user_id?:string;company:string;segment:string;city:string;state:string;title:string;description:string;moq:string;capacity:string;phone:string;email:string;gstin:string;website:string;active?:number;specs?:ProductSpecs;photos?:ProductPhoto[]};
export type TradeRequest={id:string;user_id:string;supplier_id:string|null;kind:string;title:string;details:string;quantity:string;origin:string;destination:string;needed_by:string;status:string;quote:string;company?:string;created_at:number};
export async function api(path='',body?:Record<string,unknown>){if(demoEnabled())return demoApi(path,body);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{const r=await fetch('/api/market'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',signal:controller.signal});let data:any;try{data=await r.json()}catch{throw new Error('The service returned an unexpected response. Please try again.')}if(!r.ok)throw new Error(data.error||'We could not complete this action. Please try again.');return data}catch(e){if(controller.signal.aborted)throw new Error('This request took too long. Check your connection, then refresh to check whether your changes were saved.');if(e instanceof TypeError)throw new Error('Unable to connect. Check your internet connection and try again.');throw e}finally{clearTimeout(timer)}}

export function segmentImage(segment:string){return segment==='Yarn'||segment==='Fibre'?'/assets/yarn.webp':segment==='Dyeing & processing'?'/assets/thread.webp':'/assets/fabric.webp'}

export type ProductSpecs={fabric?:string;composition?:string;colour?:string;gsm?:number;price?:number;price_unit?:string;width?:string;yarn_count?:string;weave?:string;finish?:string;lead_time?:string;price_note?:string};
export type ProductPhoto={id:string;url:string};
export type ProductReview={id:string;display_name:string;rating:number;quality_rating:number;experience:string;title:string;body:string;created_at:number;updated_at:number};
export function productPrice(l:Listing){return l.specs?.price?'₹'+l.specs.price.toLocaleString('en-IN')+' / '+(l.specs.price_unit||'metre'):'Price on request'}
