import type {Metadata} from 'next';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;return {title:{absolute:'La Fortuna del Sabor'},applicationName:'La Fortuna',manifest:`/r/${slug}/manifest.webmanifest`,appleWebApp:{capable:true,title:'La Fortuna',statusBarStyle:'default'},icons:{icon:`/r/${slug}/icon`,apple:`/r/${slug}/icon`}};}
export default function Layout({children}:{children:React.ReactNode}){return children;}
