import { createFileRoute } from '@tanstack/react-router';
import { bindings } from '@/lib/bindings.server';
import { marketHandler } from '@/lib/market.server';
export const Route=createFileRoute('/api/market')({server:{handlers:{GET:({request})=>marketHandler(request,bindings().DB),POST:({request})=>marketHandler(request,bindings().DB)}}});
