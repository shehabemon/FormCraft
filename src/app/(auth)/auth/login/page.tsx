import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to FormCraft to access your saved forms, sync across devices, and pick up right where you left off.',
};

export default function LoginPage() {
  return <LoginForm />;
}
