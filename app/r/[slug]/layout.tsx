import type { Metadata, Viewport } from 'next';

const origin = 'https://buyer.kronix.co';
const title = 'La Fortuna del Sabor';
const description = 'Consulta nuestro menú y haz tu pedido directamente en La Fortuna del Sabor.';
const image = `${origin}/lunch/Header/compartir.jpg?v=3`;

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = `${origin}/r/${encodeURIComponent(slug)}`;
  return {
    metadataBase: new URL(origin),
    title: { absolute: title },
    description,
    applicationName: 'La Fortuna',
    manifest: `/r/${slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: 'La Fortuna', statusBarStyle: 'default' },
    icons: {
      icon: '/lunch/iconos/icono.png?v=2',
      apple: '/lunch/iconos/icono.png?v=2',
    },
    openGraph: {
      type: 'website', locale: 'es_CO', siteName: title,
      title, description, url,
      images: [{ url: image, width: 1200, height: 800, alt: title, type: 'image/jpeg' }],
    },
    twitter: {
      card: 'summary_large_image', title, description, images: [image],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

export const viewport: Viewport = { themeColor: '#6b19d1' };
