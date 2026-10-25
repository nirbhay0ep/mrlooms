import {createFileRoute} from '@tanstack/react-router';
import {bindings} from '@/lib/bindings.server';
import {photoHandler} from '@/lib/product-photo.server';
export const Route=createFileRoute('/api/product-photo')({server:{handlers:{GET:({request})=>photoHandler(request,bindings().DB,bindings().STORAGE),POST:({request})=>photoHandler(request,bindings().DB,bindings().STORAGE)}}});
