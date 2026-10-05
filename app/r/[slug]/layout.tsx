import type {Metadata,Viewport} from 'next';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;return {title:{absolute:'La Fortuna del Sabor'},applicationName:'La Fortuna',manifest:`/r/${slug}/manifest.webmanifest`,appleWebApp:{capable:true,title:'La Fortuna',statusBarStyle:'default'},icons:{icon:"/lunch/iconos/icono.png?v=2",apple:"/lunch/iconos/icono.png?v=2"}};}
export default function Layout({children}:{children:React.ReactNode}){return children;}

export const viewport:Viewport={themeColor:"#6b19d1"};
