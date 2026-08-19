import type { Metadata } from 'next';
import { NotFoundPanel } from '@/components/NotFoundPanel';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundPanel />;
}
