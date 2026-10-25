import {useEffect,useRef,type ImgHTMLAttributes} from 'react';
import dimensions from '@/lib/textile-images.json';

type Textile = keyof typeof dimensions;
export function TextileImage({name,...props}:{name:Textile}&ImgHTMLAttributes<HTMLImageElement>){
  const d=dimensions[name],src='/assets/textile-'+name;
  return <img decoding="async" {...props} src={src+'.webp'} width={d.width} height={d.height}
    srcSet={d.width>480?src+'-480.webp 480w, '+src+'.webp '+d.width+'w':undefined}
    sizes={props.sizes||'(max-width: 760px) 100vw, 50vw'}/>;
}
const scenes:Textile[]=['navy','swatches','checks','prints','rolls','earth'];
const markers=['.hero','#how','#marketplace','#services','.locations','.faq'];
/** Decorative photo crossfades. Native scrolling and readable content work without JS. */
export function FabricBackdrop(){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=ref.current;
    if(!root)return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sections=markers.map(selector=>document.querySelector<HTMLElement>(selector));
    let frame=0,positions:number[]=[];
    const paint=()=>{
      frame=0;
      const weights=scenes.map(()=>0);
      weights[0]=1;
      if(!motion.matches){
        const focus=window.scrollY+window.innerHeight*.48;
        for(let i=1;i<positions.length;i++){
          const fade=Math.min(360,window.innerHeight*.45);
          const t=Math.max(0,Math.min(1,(focus-positions[i]+fade/2)/fade));
          if(t>0){weights.fill(0);weights[i-1]=1-t;weights[i]=t;}
        }
      }
      Array.from(root.children).forEach((node,i)=>{
        (node as HTMLElement).style.opacity=String(weights[i]||0);
      });
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)};
    const measure=()=>{
      positions=sections.map(el=>el?el.getBoundingClientRect().top+window.scrollY:Infinity);
      schedule();
    };
    const observer=new ResizeObserver(measure);
    sections.forEach(section=>{if(section)observer.observe(section)});
    if(root.parentElement)observer.observe(root.parentElement);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',measure);
    motion.addEventListener('change',schedule);
    measure();
    return()=>{
      observer.disconnect();cancelAnimationFrame(frame);
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',measure);
      motion.removeEventListener('change',schedule);
    };
  },[]);
  return <div className="fabric-backdrop" ref={ref} aria-hidden="true">
    {scenes.map((name,i)=><div className={'fabric-scene fabric-scene-'+name} key={name} style={{opacity:i===0?1:0}}>
      <TextileImage name={name} alt="" fetchPriority={i===0?'high':'low'} loading={i===0?'eager':'lazy'}/>
    </div>)}
  </div>;
}
