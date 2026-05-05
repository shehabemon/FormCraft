import type { Metadata } from 'next';
import BuilderClient from './BuilderClient';

export const metadata: Metadata = {
  description: 'Design your form with drag-and-drop fields, conditional logic, and AI-assisted generation.',
  robots: { index: false, follow: false },
};

export default function BuilderPage() {
  return <BuilderClient />;
}
