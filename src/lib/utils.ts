import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from "nanoid"
import type { FormSchema } from "@/types/form"
import { DEFAULT_FORM_SETTINGS } from "@/constants/defaults"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function makeNewForm(): FormSchema {
  const id = nanoid();
  const ts = new Date().toISOString();
  return {
    id,
    title: 'Untitled Form',
    description: '',
    fields: [],
    mode: 'single',
    steps: [],
    settings: { ...DEFAULT_FORM_SETTINGS },
    createdAt: ts,
    updatedAt: ts,
  };
}
