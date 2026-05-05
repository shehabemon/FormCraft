import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a free FormCraft account to save your forms to the cloud and access them from any device.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
