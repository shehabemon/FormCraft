'use client';

import type { FieldType, FieldCategory } from '@/types/form';

export interface FieldMeta {
  label: string;
  icon: string;
  description: string;
}

export const FIELD_META: Record<FieldType, FieldMeta> = {
  text:          { label: 'Short Text',     icon: 'Type',               description: 'Single line text' },
  textarea:      { label: 'Long Text',      icon: 'AlignLeft',          description: 'Multi-line text' },
  number:        { label: 'Number',         icon: 'Hash',               description: 'Numeric input' },
  email:         { label: 'Email',          icon: 'Mail',               description: 'Email address' },
  phone:         { label: 'Phone',          icon: 'Phone',              description: 'Phone number' },
  url:           { label: 'URL',            icon: 'Link2',              description: 'Web address' },
  password:      { label: 'Password',       icon: 'Lock',               description: 'Masked input' },
  select:        { label: 'Dropdown',       icon: 'ChevronsUpDown',     description: 'Single select' },
  multiselect:   { label: 'Multi-select',   icon: 'ListChecks',         description: 'Multiple choices' },
  radio:         { label: 'Radio Group',    icon: 'CircleDot',          description: 'Single choice' },
  checkbox:      { label: 'Checkbox',       icon: 'CheckSquare',        description: 'Boolean toggle' },
  checkboxGroup: { label: 'Checkbox Group', icon: 'SquareStack',        description: 'Multiple checkboxes' },
  date:          { label: 'Date',           icon: 'Calendar',           description: 'Date picker' },
  time:          { label: 'Time',           icon: 'Clock',              description: 'Time picker' },
  file:          { label: 'File Upload',    icon: 'Paperclip',          description: 'File attachment' },
  range:         { label: 'Slider',         icon: 'SlidersHorizontal',  description: 'Range slider' },
  hidden:        { label: 'Hidden Field',   icon: 'EyeOff',             description: 'Hidden value' },
  heading:       { label: 'Heading',        icon: 'Heading1',           description: 'Section title' },
  paragraph:     { label: 'Paragraph',      icon: 'Pilcrow',            description: 'Description text' },
  divider:       { label: 'Divider',        icon: 'Minus',              description: 'Horizontal rule' },
};

export interface FieldCategoryEntry {
  category: FieldCategory;
  label: string;
  types: FieldType[];
}

export const FIELD_CATEGORIES: FieldCategoryEntry[] = [
  {
    category: 'input',
    label: 'Input Fields',
    types: ['text', 'textarea', 'number', 'email', 'phone', 'url', 'password'],
  },
  {
    category: 'choice',
    label: 'Choice Fields',
    types: ['select', 'multiselect', 'radio', 'checkbox', 'checkboxGroup'],
  },
  {
    category: 'advanced',
    label: 'Advanced Fields',
    types: ['date', 'time', 'file', 'range', 'hidden'],
  },
  {
    category: 'layout',
    label: 'Layout Elements',
    types: ['heading', 'paragraph', 'divider'],
  },
];

export const LAYOUT_FIELD_TYPES = new Set<FieldType>([
  'heading',
  'paragraph',
  'divider',
]);
