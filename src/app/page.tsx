import type { Metadata } from 'next';
import Dashboard from './Dashboard';

export const metadata: Metadata = {
  description: 'Build, manage, and export professional forms with drag-and-drop fields, AI generation, conditional logic, and React code export.',
};

export default function HomePage() {
  return <Dashboard />;
}
