import {NextResponse} from 'next/server';
export function GET(request:Request){return NextResponse.redirect(new URL('/lunch/iconos/icono.png?v=2',request.url));}
