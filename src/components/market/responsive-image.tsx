import type {ImgHTMLAttributes} from 'react';
import dimensions from '@/lib/image-dimensions.json';
export function ResponsiveImage({src,sizes='(max-width: 760px) 100vw, 50vw',...props}:ImgHTMLAttributes<HTMLImageElement>){const d=dimensions[src as keyof typeof dimensions];const base=src?.replace(/\.webp$/,'');return <img decoding="async" {...props} src={src} width={d?.width||props.width} height={d?.height||props.height} srcSet={d?`${base}-480.webp 480w, ${base}-800.webp 800w, ${src} ${d.width}w`:undefined} sizes={d?sizes:undefined}/>}
