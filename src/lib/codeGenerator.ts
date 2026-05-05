import type { FormSchema, FieldSchema, FieldType } from '@/types/form';
import type { ValidationRule, ConditionalRule } from '@/types/form';
import { isMultiStepForm } from '@/types/form';


const LAYOUT_TYPES = new Set<FieldType>(['heading', 'paragraph', 'divider', 'hidden']);

function isInputField(type: FieldType): boolean {
  return !LAYOUT_TYPES.has(type);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function indent(n: number): string {
  return '  '.repeat(n);
}


function buildZodChain(field: FieldSchema): string {
  const { type, validation } = field;
  const rules = validation.filter((r) => r.enabled);

  // Multi-value fields
  if (type === 'checkboxGroup' || type === 'multiselect') {
    return `z.array(z.string())`;
  }
  if (type === 'checkbox') {
    const req = rules.find((r) => r.type === 'required');
    if (req) {
      const msg = req.message || 'This field is required';
      return `z.boolean().refine(val => val === true, { message: ${JSON.stringify(msg)} })`;
    }
    return `z.boolean().optional()`;
  }
  if (type === 'range' || type === 'number') {
    let chain = `z.coerce.number()`;
    for (const r of rules) {
      if (r.type === 'min') {
        const msg = r.message || `Must be at least ${r.value}`;
        chain += `.min(${Number(r.value)}, ${JSON.stringify(msg)})`;
      }
      if (r.type === 'max') {
        const msg = r.message || `Must be at most ${r.value}`;
        chain += `.max(${Number(r.value)}, ${JSON.stringify(msg)})`;
      }
    }
    if (!rules.find((r) => r.type === 'required')) {
      chain += `.optional()`;
    }
    return chain;
  }
  if (type === 'date' || type === 'time') {
    let chain = `z.string()`;
    if (!rules.find((r) => r.type === 'required')) {
      chain += `.optional()`;
    } else {
      const req = rules.find((r) => r.type === 'required')!;
      const msg = req.message || 'This field is required';
      chain += `.min(1, ${JSON.stringify(msg)})`;
    }
    return chain;
  }
  if (type === 'file') {
    const req = rules.find((r) => r.type === 'required');
    if (req) {
      const msg = req.message || 'A file is required';
      return `z.instanceof(File, { message: ${JSON.stringify(msg)} })`;
    }
    return `z.instanceof(File).optional()`;
  }

  // All string-like fields
  let chain = `z.string()`;
  for (const r of rules) {
    switch (r.type) {
      case 'required': {
        const msg = r.message || 'This field is required';
        chain += `.min(1, ${JSON.stringify(msg)})`;
        break;
      }
      case 'minLength': {
        const msg = r.message || `Must be at least ${r.value} characters`;
        chain += `.min(${Number(r.value)}, ${JSON.stringify(msg)})`;
        break;
      }
      case 'maxLength': {
        const msg = r.message || `Must be at most ${r.value} characters`;
        chain += `.max(${Number(r.value)}, ${JSON.stringify(msg)})`;
        break;
      }
      case 'email': {
        const msg = r.message || 'Please enter a valid email address';
        chain += `.email(${JSON.stringify(msg)})`;
        break;
      }
      case 'url': {
        const msg = r.message || 'Please enter a valid URL';
        chain += `.url(${JSON.stringify(msg)})`;
        break;
      }
      case 'pattern': {
        const msg = r.message || 'Invalid format';
        chain += `.regex(new RegExp(${JSON.stringify(String(r.value))}), ${JSON.stringify(msg)})`;
        break;
      }
    }
  }
  if (!rules.find((r) => r.type === 'required')) {
    chain += `.optional()`;
  }
  return chain;
}

function generateZodSchema(fields: FieldSchema[], componentName: string): string {
  const inputFields = fields.filter((f) => isInputField(f.type));
  if (inputFields.length === 0) return '';

  const lines: string[] = [
    `const ${componentName}Schema = z.object({`,
  ];
  for (const field of inputFields) {
    lines.push(`${indent(1)}${field.name}: ${buildZodChain(field)},`);
  }
  lines.push(`});`);
  lines.push(`type ${componentName}Values = z.infer<typeof ${componentName}Schema>;`);
  return lines.join('\n');
}


function buildYupChain(field: FieldSchema): string {
  const { type, validation } = field;
  const rules = validation.filter((r) => r.enabled);
  const reqRule = rules.find((r) => r.type === 'required');

  if (type === 'checkboxGroup' || type === 'multiselect') {
    return `yup.array().of(yup.string())`;
  }
  if (type === 'checkbox') {
    if (reqRule) {
      const msg = reqRule.message || 'This field is required';
      return `yup.boolean().oneOf([true], ${JSON.stringify(msg)})`;
    }
    return `yup.boolean()`;
  }
  if (type === 'range' || type === 'number') {
    let chain = `yup.number().typeError('Must be a number')`;
    for (const r of rules) {
      if (r.type === 'min') chain += `.min(${Number(r.value)}, ${JSON.stringify(r.message || `Must be at least ${r.value}`)})`;
      if (r.type === 'max') chain += `.max(${Number(r.value)}, ${JSON.stringify(r.message || `Must be at most ${r.value}`)})`;
    }
    if (reqRule) chain += `.required(${JSON.stringify(reqRule.message || 'This field is required')})`;
    return chain;
  }
  if (type === 'date' || type === 'time') {
    let chain = `yup.string()`;
    if (reqRule) chain += `.required(${JSON.stringify(reqRule.message || 'This field is required')})`;
    return chain;
  }
  if (type === 'file') {
    if (reqRule) return `yup.mixed().required(${JSON.stringify(reqRule.message || 'A file is required')})`;
    return `yup.mixed()`;
  }

  // String-like fields
  let chain = `yup.string()`;
  // Auto-add type-level validators
  if (type === 'email') {
    const r = rules.find((x) => x.type === 'email');
    chain += `.email(${JSON.stringify(r?.message || 'Please enter a valid email address')})`;
  }
  if (type === 'url') {
    const r = rules.find((x) => x.type === 'url');
    chain += `.url(${JSON.stringify(r?.message || 'Please enter a valid URL')})`;
  }
  for (const r of rules) {
    switch (r.type) {
      case 'required':  chain += `.required(${JSON.stringify(r.message || 'This field is required')})`; break;
      case 'minLength': chain += `.min(${Number(r.value)}, ${JSON.stringify(r.message || `Must be at least ${r.value} characters`)})`; break;
      case 'maxLength': chain += `.max(${Number(r.value)}, ${JSON.stringify(r.message || `Must be at most ${r.value} characters`)})`; break;
      case 'email':     if (type !== 'email') chain += `.email(${JSON.stringify(r.message || 'Please enter a valid email address')})`; break;
      case 'url':       if (type !== 'url')   chain += `.url(${JSON.stringify(r.message || 'Please enter a valid URL')})`; break;
      case 'pattern':   chain += `.matches(/${String(r.value)}/, ${JSON.stringify(r.message || 'Invalid format')})`; break;
    }
  }
  return chain;
}

function generateYupSchema(fields: FieldSchema[], componentName: string): string {
  const inputFields = fields.filter((f) => isInputField(f.type));
  if (inputFields.length === 0) return '';
  const lines = [
    `const ${componentName}Schema = yup.object({`,
    ...inputFields.map((f) => `${indent(1)}${f.name}: ${buildYupChain(f)},`),
    `});`,
    `type ${componentName}Values = yup.InferType<typeof ${componentName}Schema>;`,
  ];
  return lines.join('\n');
}


function generateOnSubmitType(componentName: string): string {
  return `type ${componentName}Props = {
  onSubmit?: (values: ${componentName}Values) => void | Promise<void>;
  defaultValues?: Partial<${componentName}Values>;
};`;
}


function hasConditionals(fields: FieldSchema[]): boolean {
  return fields.some((f) => f.conditional.enabled && f.conditional.rules.length > 0);
}

function generateEvaluateRule(): string {
  return `function evaluateRule(
  operator: string,
  actual: unknown,
  threshold: unknown
): boolean {
  const str = (v: unknown) => (v == null ? '' : String(v).toLowerCase());
  const num = (v: unknown) => Number(v);
  const s = str(actual);
  const t = str(threshold);
  const a = num(actual);
  const b = num(threshold);
  switch (operator) {
    case 'equals':              return s === t;
    case 'notEquals':           return s !== t;
    case 'contains':            return s.includes(t);
    case 'notContains':         return !s.includes(t);
    case 'startsWith':          return s.startsWith(t);
    case 'endsWith':            return s.endsWith(t);
    case 'greaterThan':         return !isNaN(a) && a > b;
    case 'lessThan':            return !isNaN(a) && a < b;
    case 'greaterThanOrEquals': return !isNaN(a) && a >= b;
    case 'lessThanOrEquals':    return !isNaN(a) && a <= b;
    case 'isEmpty':             return actual == null || str(actual) === '';
    case 'isNotEmpty':          return actual != null && str(actual) !== '';
    default:                    return true;
  }
}`;
}

function generateUseVisibilityHook(fields: FieldSchema[]): string {
  const conditionalFields = fields.filter(
    (f) => f.conditional.enabled && f.conditional.rules.length > 0 &&
      (f.conditional.action === 'show' || f.conditional.action === 'hide'),
  );
  if (conditionalFields.length === 0) return '';

  // Build the visibility map computation
  const lines: string[] = [
    `function useFieldVisibility(values: Record<string, unknown>) {`,
    `${indent(1)}return useMemo(() => {`,
    `${indent(2)}const v: Record<string, boolean> = {};`,
  ];

  for (const field of fields) {
    if (!field.conditional.enabled || field.conditional.rules.length === 0 ||
        field.conditional.action === 'require') {
      lines.push(`${indent(2)}v[${JSON.stringify(field.name)}] = true;`);
      continue;
    }

    const rules: ConditionalRule[] = field.conditional.rules;
    const logic = field.conditional.logic;
    const action = field.conditional.action;

    // Find source field names by id
    const ruleExprs = rules.map((r) => {
      const sourceField = fields.find((f) => f.id === r.sourceFieldId);
      if (!sourceField) return 'false';
      const srcName = JSON.stringify(sourceField.name);
      return `evaluateRule(${JSON.stringify(r.operator)}, values[${srcName}], ${JSON.stringify(r.value)})`;
    });

    const combined = logic === 'all'
      ? ruleExprs.join(' && ')
      : ruleExprs.join(' || ');
    const visible = action === 'show' ? `(${combined})` : `!(${combined})`;
    lines.push(`${indent(2)}v[${JSON.stringify(field.name)}] = ${visible};`);
  }

  lines.push(`${indent(2)}return v;`);
  lines.push(`${indent(1)}}, [values]);`);
  lines.push(`}`);
  return lines.join('\n');
}


function hasConditionalRequire(fields: FieldSchema[]): boolean {
  return fields.some(
    (f) => f.conditional.enabled && f.conditional.action === 'require' && f.conditional.rules.length > 0,
  );
}


function renderLabel(field: FieldSchema, hasError: boolean): string {
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');
  return [
    `<label`,
    `  htmlFor="${field.name}"`,
    `  className="block text-sm font-medium text-gray-700 mb-1"`,
    `>`,
    `  ${field.label}${isRequired ? ' <span aria-hidden="true" className="text-red-500">*</span>' : ''}`,
    `</label>`,
  ].join('\n' + indent(3));
}

function renderHelperText(field: FieldSchema): string {
  if (!field.helperText) return '';
  return `<p id="${field.name}-description" className="mt-1 text-xs text-gray-500">{${JSON.stringify(field.helperText)}}</p>`;
}

function ariaProps(field: FieldSchema): string {
  const parts: string[] = [];
  if (field.helperText) parts.push(`aria-describedby="${field.name}-description"`);
  parts.push(`aria-invalid={!!errors.${field.name}}`);
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');
  if (isRequired) parts.push(`aria-required`);
  return parts.join(' ');
}

function renderInputField(field: FieldSchema): string {
  const inputTypeMap: Partial<Record<FieldType, string>> = {
    email: 'email', phone: 'tel', url: 'url',
    password: 'password', number: 'number',
    date: 'date', time: 'time',
  };
  const htmlType = inputTypeMap[field.type] ?? 'text';
  const aria = ariaProps(field);
  return [
    renderLabel(field, true),
    `<input`,
    `  id="${field.name}"`,
    `  type="${htmlType}"`,
    `  placeholder={${JSON.stringify(field.placeholder || '')}}`,
    `  {...register(${JSON.stringify(field.name)})}`,
    `  ${aria}`,
    `  className={cn(`,
    `    "w-full h-9 rounded-md border px-3 text-sm transition-colors",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `/>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderTextarea(field: FieldSchema): string {
  const aria = ariaProps(field);
  return [
    renderLabel(field, true),
    `<textarea`,
    `  id="${field.name}"`,
    `  placeholder={${JSON.stringify(field.placeholder || '')}}`,
    `  rows={4}`,
    `  {...register(${JSON.stringify(field.name)})}`,
    `  ${aria}`,
    `  className={cn(`,
    `    "w-full rounded-md border px-3 py-2 text-sm transition-colors resize-y",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `/>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderSelect(field: FieldSchema): string {
  const aria = ariaProps(field);
  return [
    renderLabel(field, true),
    `<select`,
    `  id="${field.name}"`,
    `  {...register(${JSON.stringify(field.name)})}`,
    `  ${aria}`,
    `  className={cn(`,
    `    "w-full h-9 rounded-md border px-3 text-sm appearance-none cursor-pointer transition-colors",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `>`,
    `  <option value="">{${JSON.stringify(field.placeholder || '— select —')}}</option>`,
    ...field.options.map((opt) =>
      `  <option value={${JSON.stringify(opt.value)}}>{${JSON.stringify(opt.label)}}</option>`,
    ),
    `</select>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderRadio(field: FieldSchema): string {
  return [
    `<fieldset>`,
    `  <legend className="text-sm font-medium text-gray-700 mb-2">`,
    `    ${field.label}`,
    `  </legend>`,
    `  <div className="space-y-2">`,
    ...field.options.map((opt) => [
      `    <label className="flex items-center gap-2 cursor-pointer">`,
      `      <input`,
      `        type="radio"`,
      `        value={${JSON.stringify(opt.value)}}`,
      `        {...register(${JSON.stringify(field.name)})}`,
      `        className="w-4 h-4 text-blue-600"`,
      `      />`,
      `      <span className="text-sm text-gray-700">{${JSON.stringify(opt.label)}}</span>`,
      `    </label>`,
    ].join('\n' + indent(3))),
    `  </div>`,
    renderHelperText(field) ? `  ${renderHelperText(field)}` : '',
    `  {errors.${field.name} && (`,
    `    <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `  )}`,
    `</fieldset>`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderCheckbox(field: FieldSchema): string {
  return [
    `<label className="flex items-center gap-2 cursor-pointer">`,
    `  <input`,
    `    type="checkbox"`,
    `    id="${field.name}"`,
    `    {...register(${JSON.stringify(field.name)})}`,
    `    aria-invalid={!!errors.${field.name}}`,
    `    className="w-4 h-4 rounded text-blue-600"`,
    `  />`,
    `  <span className="text-sm text-gray-700">{${JSON.stringify(field.label)}}</span>`,
    `</label>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderCheckboxGroup(field: FieldSchema): string {
  return [
    `<fieldset>`,
    `  <legend className="text-sm font-medium text-gray-700 mb-2">`,
    `    ${field.label}`,
    `  </legend>`,
    `  <div className="space-y-2">`,
    ...field.options.map((opt) => [
      `    <label className="flex items-center gap-2 cursor-pointer">`,
      `      <input`,
      `        type="checkbox"`,
      `        value={${JSON.stringify(opt.value)}}`,
      `        {...register(${JSON.stringify(field.name)})}`,
      `        className="w-4 h-4 rounded text-blue-600"`,
      `      />`,
      `      <span className="text-sm text-gray-700">{${JSON.stringify(opt.label)}}</span>`,
      `    </label>`,
    ].join('\n' + indent(3))),
    `  </div>`,
    renderHelperText(field) ? `  ${renderHelperText(field)}` : '',
    `  {errors.${field.name} && (`,
    `    <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `  )}`,
    `</fieldset>`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderMultiselect(field: FieldSchema): string {
  // Rendered as a list of toggle buttons backed by a Controller
  return [
    renderLabel(field, true),
    `<Controller`,
    `  name={${JSON.stringify(field.name)}}`,
    `  control={control}`,
    `  render={({ field: ctrl }) => {`,
    `    const selected: string[] = ctrl.value ?? [];`,
    `    const toggle = (v: string) =>`,
    `      ctrl.onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);`,
    `    return (`,
    `      <div className="flex flex-wrap gap-1.5" role="group" aria-label={${JSON.stringify(field.label)}}>`,
    ...field.options.map((opt) =>
      `        <button type="button" onClick={() => toggle(${JSON.stringify(opt.value)})} className={cn("px-3 py-1 rounded-full text-sm border transition-colors", selected.includes(${JSON.stringify(opt.value)}) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400")}>{${JSON.stringify(opt.label)}}</button>`,
    ),
    `      </div>`,
    `    );`,
    `  }}`,
    `/>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderRange(field: FieldSchema): string {
  return [
    renderLabel(field, true),
    `<Controller`,
    `  name={${JSON.stringify(field.name)}}`,
    `  control={control}`,
    `  render={({ field: ctrl }) => (`,
    `    <div className="flex items-center gap-3">`,
    `      <input`,
    `        type="range"`,
    `        min={${field.min}}`,
    `        max={${field.max}}`,
    `        step={${field.step}}`,
    `        value={ctrl.value ?? ${field.min}}`,
    `        onChange={e => ctrl.onChange(+e.target.value)}`,
    `        className="flex-1 accent-blue-600"`,
    `        aria-label={${JSON.stringify(field.label)}}`,
    `      />`,
    `      <span className="font-mono text-sm text-gray-600 w-10 text-right">{ctrl.value ?? ${field.min}}</span>`,
    `    </div>`,
    `  )}`,
    `/>`,
    renderHelperText(field),
  ].filter(Boolean).join('\n' + indent(3));
}

function renderFile(field: FieldSchema): string {
  return [
    renderLabel(field, true),
    `<Controller`,
    `  name={${JSON.stringify(field.name)}}`,
    `  control={control}`,
    `  render={({ field: ctrl }) => (`,
    `    <label className={cn(`,
    `      "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors",`,
    `      errors.${field.name} ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"`,
    `    )}>`,
    `      <span className="text-sm text-gray-500">{${JSON.stringify(field.placeholder || 'Click to upload or drag & drop')}}</span>`,
    `      <input`,
    `        type="file"`,
    field.accept ? `        accept={${JSON.stringify(field.accept)}}` : '',
    `        onChange={e => ctrl.onChange(e.target.files?.[0])}`,
    `        className="sr-only"`,
    `        aria-invalid={!!errors.${field.name}}`,
    field.helperText ? `        aria-describedby="${field.name}-description"` : '',
    `      />`,
    `    </label>`,
    `  )}`,
    `/>`,
    renderHelperText(field),
    `{errors.${field.name} && (`,
    `  <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}?.message}</p>`,
    `)}`,
  ].filter(Boolean).join('\n' + indent(3));
}

function renderLayoutField(field: FieldSchema): string {
  if (field.type === 'divider') {
    return `<hr className="border-t border-gray-200 my-2" />`;
  }
  if (field.type === 'heading') {
    const sizeMap: Record<number, string> = { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl', 4: 'text-lg' };
    const Tag = `h${field.headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4';
    const size = sizeMap[field.headingLevel] ?? 'text-xl';
    return `<${Tag} className="${size} font-semibold text-gray-900">{${JSON.stringify(field.content || field.label)}}</${Tag}>`;
  }
  if (field.type === 'paragraph') {
    return `<p className="text-sm text-gray-600 leading-relaxed">{${JSON.stringify(field.content || '')}}</p>`;
  }
  return '';
}

function renderField(field: FieldSchema): string {
  switch (field.type) {
    case 'textarea':      return renderTextarea(field);
    case 'select':        return renderSelect(field);
    case 'radio':         return renderRadio(field);
    case 'checkbox':      return renderCheckbox(field);
    case 'checkboxGroup': return renderCheckboxGroup(field);
    case 'multiselect':   return renderMultiselect(field);
    case 'range':         return renderRange(field);
    case 'file':          return renderFile(field);
    case 'heading':
    case 'paragraph':
    case 'divider':       return renderLayoutField(field);
    default:              return renderInputField(field);
  }
}


function needsController(fields: FieldSchema[]): boolean {
  return fields.some((f) =>
    ['multiselect', 'range', 'file'].includes(f.type),
  );
}


function buildDefaultValues(fields: FieldSchema[]): string {
  const inputFields = fields.filter((f) => isInputField(f.type));
  if (inputFields.length === 0) return '{}';
  const pairs = inputFields.map((f) => {
    if (f.type === 'checkboxGroup' || f.type === 'multiselect') return `${f.name}: []`;
    if (f.type === 'checkbox') return `${f.name}: false`;
    if (f.type === 'range') return `${f.name}: ${f.min}`;
    return `${f.name}: ${JSON.stringify(f.defaultValue !== undefined ? String(f.defaultValue) : '')}`;
  });
  return `{\n${pairs.map((p) => `${indent(3)}${p}`).join(',\n')}\n${indent(2)}}`;
}



function msRenderLabel(field: FieldSchema): string {
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');
  return [
    `<label htmlFor="${field.name}" className="block text-sm font-medium text-gray-700 mb-1">`,
    `  ${field.label}${isRequired ? ' <span aria-hidden="true" className="text-red-500">*</span>' : ''}`,
    `</label>`,
  ].join('\n' + indent(4));
}

function msRenderError(field: FieldSchema): string {
  return `{errors.${field.name} && <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}}</p>}`;
}

function msRenderHelper(field: FieldSchema): string {
  if (!field.helperText) return '';
  return `<p className="mt-1 text-xs text-gray-500">{${JSON.stringify(field.helperText)}}</p>`;
}

function msRenderInputField(field: FieldSchema): string {
  const inputTypeMap: Partial<Record<FieldType, string>> = {
    email: 'email', phone: 'tel', url: 'url',
    password: 'password', number: 'number',
    date: 'date', time: 'time',
  };
  const htmlType = inputTypeMap[field.type] ?? 'text';
  return [
    msRenderLabel(field),
    `<input`,
    `  id="${field.name}"`,
    `  type="${htmlType}"`,
    `  value={String(values.${field.name} ?? '')}`,
    `  onChange={e => setValues(v => ({ ...v, ${field.name}: e.target.value }))}`,
    `  placeholder={${JSON.stringify(field.placeholder || '')}}`,
    `  className={cn(`,
    `    "w-full h-9 rounded-md border px-3 text-sm transition-colors",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `/>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderTextarea(field: FieldSchema): string {
  return [
    msRenderLabel(field),
    `<textarea`,
    `  id="${field.name}"`,
    `  value={String(values.${field.name} ?? '')}`,
    `  onChange={e => setValues(v => ({ ...v, ${field.name}: e.target.value }))}`,
    `  placeholder={${JSON.stringify(field.placeholder || '')}}`,
    `  rows={4}`,
    `  className={cn(`,
    `    "w-full rounded-md border px-3 py-2 text-sm transition-colors resize-y",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `/>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderSelect(field: FieldSchema): string {
  return [
    msRenderLabel(field),
    `<select`,
    `  id="${field.name}"`,
    `  value={String(values.${field.name} ?? '')}`,
    `  onChange={e => setValues(v => ({ ...v, ${field.name}: e.target.value }))}`,
    `  className={cn(`,
    `    "w-full h-9 rounded-md border px-3 text-sm appearance-none cursor-pointer transition-colors",`,
    `    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",`,
    `    errors.${field.name} ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"`,
    `  )}`,
    `>`,
    `  <option value="">{${JSON.stringify(field.placeholder || '— select —')}}</option>`,
    ...field.options.map((o) => `  <option value={${JSON.stringify(o.value)}}>{${JSON.stringify(o.label)}}</option>`),
    `</select>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderRadio(field: FieldSchema): string {
  return [
    `<fieldset>`,
    `  <legend className="text-sm font-medium text-gray-700 mb-2">${field.label}</legend>`,
    `  <div className="space-y-2">`,
    ...field.options.map((o) => [
      `    <label className="flex items-center gap-2 cursor-pointer">`,
      `      <input type="radio" value={${JSON.stringify(o.value)}} checked={values.${field.name} === ${JSON.stringify(o.value)}} onChange={() => setValues(v => ({ ...v, ${field.name}: ${JSON.stringify(o.value)} }))} className="w-4 h-4 text-blue-600" />`,
      `      <span className="text-sm text-gray-700">{${JSON.stringify(o.label)}}</span>`,
      `    </label>`,
    ].join('\n' + indent(4))),
    `  </div>`,
    msRenderHelper(field) ? `  ${msRenderHelper(field)}` : '',
    `  {errors.${field.name} && <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}}</p>}`,
    `</fieldset>`,
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderCheckbox(field: FieldSchema): string {
  return [
    `<label className="flex items-center gap-2 cursor-pointer">`,
    `  <input type="checkbox" id="${field.name}" checked={!!values.${field.name}} onChange={e => setValues(v => ({ ...v, ${field.name}: e.target.checked }))} className="w-4 h-4 rounded text-blue-600" />`,
    `  <span className="text-sm text-gray-700">{${JSON.stringify(field.label)}}</span>`,
    `</label>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderCheckboxGroup(field: FieldSchema): string {
  return [
    `<fieldset>`,
    `  <legend className="text-sm font-medium text-gray-700 mb-2">${field.label}</legend>`,
    `  <div className="space-y-2">`,
    ...field.options.map((o) => [
      `    <label className="flex items-center gap-2 cursor-pointer">`,
      `      <input type="checkbox" value={${JSON.stringify(o.value)}} checked={(values.${field.name} as string[] ?? []).includes(${JSON.stringify(o.value)})} onChange={e => { const cur = values.${field.name} as string[] ?? []; setValues(v => ({ ...v, ${field.name}: e.target.checked ? [...cur, ${JSON.stringify(o.value)}] : cur.filter(x => x !== ${JSON.stringify(o.value)}) })); }} className="w-4 h-4 rounded text-blue-600" />`,
      `      <span className="text-sm text-gray-700">{${JSON.stringify(o.label)}}</span>`,
      `    </label>`,
    ].join('\n' + indent(4))),
    `  </div>`,
    msRenderHelper(field) ? `  ${msRenderHelper(field)}` : '',
    `  {errors.${field.name} && <p role="alert" className="mt-1 text-xs text-red-600">{errors.${field.name}}</p>}`,
    `</fieldset>`,
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderMultiselect(field: FieldSchema): string {
  return [
    msRenderLabel(field),
    `<div className="flex flex-wrap gap-1.5" role="group" aria-label={${JSON.stringify(field.label)}}>`,
    ...field.options.map((o) =>
      `  <button type="button" onClick={() => { const cur = values.${field.name} as string[] ?? []; setValues(v => ({ ...v, ${field.name}: cur.includes(${JSON.stringify(o.value)}) ? cur.filter(x => x !== ${JSON.stringify(o.value)}) : [...cur, ${JSON.stringify(o.value)}] })); }} className={cn("px-3 py-1 rounded-full text-sm border transition-colors", (values.${field.name} as string[] ?? []).includes(${JSON.stringify(o.value)}) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400")}>{${JSON.stringify(o.label)}}</button>`,
    ),
    `</div>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderRange(field: FieldSchema): string {
  return [
    msRenderLabel(field),
    `<div className="flex items-center gap-3">`,
    `  <input type="range" min={${field.min}} max={${field.max}} step={${field.step}} value={Number(values.${field.name} ?? ${field.min})} onChange={e => setValues(v => ({ ...v, ${field.name}: +e.target.value }))} className="flex-1 accent-blue-600" aria-label={${JSON.stringify(field.label)}} />`,
    `  <span className="font-mono text-sm text-gray-600 w-10 text-right">{Number(values.${field.name} ?? ${field.min})}</span>`,
    `</div>`,
    msRenderHelper(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderFile(field: FieldSchema): string {
  return [
    msRenderLabel(field),
    `<label className={cn(`,
    `  "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors",`,
    `  errors.${field.name} ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"`,
    `)}>`,
    `  <span className="text-sm text-gray-500">{${JSON.stringify(field.placeholder || 'Click to upload or drag & drop')}}</span>`,
    `  <input type="file"${field.accept ? ` accept={${JSON.stringify(field.accept)}}` : ''} onChange={e => setValues(v => ({ ...v, ${field.name}: e.target.files?.[0] }))} className="sr-only" />`,
    `</label>`,
    msRenderHelper(field),
    msRenderError(field),
  ].filter(Boolean).join('\n' + indent(4));
}

function msRenderField(field: FieldSchema): string {
  switch (field.type) {
    case 'textarea':      return msRenderTextarea(field);
    case 'select':        return msRenderSelect(field);
    case 'radio':         return msRenderRadio(field);
    case 'checkbox':      return msRenderCheckbox(field);
    case 'checkboxGroup': return msRenderCheckboxGroup(field);
    case 'multiselect':   return msRenderMultiselect(field);
    case 'range':         return msRenderRange(field);
    case 'file':          return msRenderFile(field);
    case 'heading':
    case 'paragraph':
    case 'divider':       return renderLayoutField(field);
    default:              return msRenderInputField(field);
  }
}


function buildMultiStepDefaultValues(fields: FieldSchema[]): string {
  const inputFields = fields.filter((f) => isInputField(f.type));
  if (inputFields.length === 0) return '{}';
  const pairs = inputFields.map((f) => {
    if (f.type === 'checkboxGroup' || f.type === 'multiselect') return `${f.name}: [] as string[]`;
    if (f.type === 'checkbox') return `${f.name}: false`;
    if (f.type === 'range') return `${f.name}: ${f.min}`;
    return `${f.name}: ${JSON.stringify(f.defaultValue !== undefined ? String(f.defaultValue) : '')}`;
  });
  return `{\n${pairs.map((p) => `${indent(2)}${p}`).join(',\n')}\n${indent(1)}}`;
}

function generateMultiStepReactCode(schema: FormSchema): string {
  const componentName = toPascalCase(schema.title || 'MyForm');
  const allFields = schema.fields;
  const steps = schema.steps;
  const withConditionals = hasConditionals(allFields);
  const indicator = schema.settings.stepIndicator;
  const showBar = schema.settings.showProgressBar;

  // Per-step input fields
  const stepFields = steps.map((s) =>
    allFields.filter((f) => f.stepId === s.id && isInputField(f.type)),
  );

  // Build per-step Zod schemas
  const zodSchemaLines: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const fields = stepFields[i];
    if (fields.length === 0) {
      zodSchemaLines.push(`const step${i}Schema = z.object({});`);
    } else {
      zodSchemaLines.push(`const step${i}Schema = z.object({`);
      for (const f of fields) {
        zodSchemaLines.push(`${indent(1)}${f.name}: ${buildZodChain(f)},`);
      }
      zodSchemaLines.push(`});`);
    }
  }
  zodSchemaLines.push(`const stepSchemas = [${steps.map((_, i) => `step${i}Schema`).join(', ')}];`);

  // TypeScript type for all values
  const inputFields = allFields.filter((f) => isInputField(f.type));
  const typeLines: string[] = [`type FormValues = {`];
  for (const f of inputFields) {
    if (f.type === 'checkboxGroup' || f.type === 'multiselect') typeLines.push(`${indent(1)}${f.name}: string[];`);
    else if (f.type === 'checkbox') typeLines.push(`${indent(1)}${f.name}: boolean;`);
    else if (f.type === 'range' || f.type === 'number') typeLines.push(`${indent(1)}${f.name}: number;`);
    else if (f.type === 'file') typeLines.push(`${indent(1)}${f.name}?: File;`);
    else typeLines.push(`${indent(1)}${f.name}: string;`);
  }
  typeLines.push(`};`);

  const propsType = `type ${componentName}Props = {
  onSubmit?: (values: FormValues) => void | Promise<void>;
};`;

  // Progress indicator component
  const indicatorComp = generateProgressIndicator(indicator, showBar, steps.length);

  // Evaluate rule fn (if needed)
  const evalFn = withConditionals ? generateEvaluateRule() : '';

  // Visibility hook adapted for multi-step (uses all fields)
  const visHook = withConditionals ? generateUseVisibilityHook(allFields) : '';

  // Step field blocks
  const stepBlocks: string[] = [];
  for (let si = 0; si < steps.length; si++) {
    const stepFieldList = allFields.filter((f) => f.stepId === steps[si].id && f.type !== 'hidden');
    const blockLines: string[] = [];
    for (const field of stepFieldList) {
      const renderedInner = msRenderField(field);
      if (!renderedInner) continue;

      const isInput = isInputField(field.type);
      const hasCondition = field.conditional.enabled &&
        field.conditional.rules.length > 0 &&
        (field.conditional.action === 'show' || field.conditional.action === 'hide');

      const indentedInner = renderedInner
        .split('\n')
        .map((line, i) => (i === 0 ? line : indent(5) + line))
        .join('\n');

      const fieldJsx = [
        `<div${isInput ? ` className="${field.style.width === 'half' ? 'col-span-1' : 'col-span-full'}"` : ''}>`,
        `  ${indentedInner}`,
        `</div>`,
      ].join('\n' + indent(4));

      if (hasCondition) {
        blockLines.push(`{visibility[${JSON.stringify(field.name)}] && (\n${indent(5)}${fieldJsx}\n${indent(4)})}`);
      } else {
        blockLines.push(fieldJsx);
      }
    }
    stepBlocks.push(blockLines.join('\n' + indent(4)));
  }

  const nextLabels = steps.map((s, i) =>
    s.nextLabel || (i === steps.length - 1 ? 'Submit' : 'Continue'),
  );
  const backLabels = steps.map((s) => s.backLabel || 'Back');
  const allowBacks = steps.map((s) => s.allowBack !== false);

  const defaultVals = buildMultiStepDefaultValues(allFields);

  const lines: string[] = [
    `// Generated by FormCraft`,
    `// Dependencies: react, framer-motion, zod`,
    ``,
    `import { useState${withConditionals ? ', useMemo' : ''} } from 'react';`,
    `import { AnimatePresence, motion } from 'framer-motion';`,
    `import { z } from 'zod';`,
    ``,
    `function cn(...classes: (string | undefined | false | null)[]) {`,
    `${indent(1)}return classes.filter(Boolean).join(' ');`,
    `}`,
    ``,
    ...zodSchemaLines,
    ``,
    ...typeLines,
    ``,
    propsType,
    ``,
    ...(evalFn ? [evalFn, ``] : []),
    ...(visHook ? [visHook, ``] : []),
    indicatorComp,
    ``,
    `export default function ${componentName}({ onSubmit }: ${componentName}Props) {`,
    `${indent(1)}const [step, setStep] = useState(0);`,
    `${indent(1)}const [direction, setDirection] = useState(1);`,
    `${indent(1)}const [submitted, setSubmitted] = useState(false);`,
    `${indent(1)}const [isSubmitting, setIsSubmitting] = useState(false);`,
    `${indent(1)}const [values, setValues] = useState<FormValues>(${defaultVals});`,
    `${indent(1)}const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});`,
    ``,
    ...(withConditionals ? [
      `${indent(1)}const visibility = useFieldVisibility(values as Record<string, unknown>);`,
      ``,
    ] : []),
    `${indent(1)}const totalSteps = ${steps.length};`,
    ``,
    `${indent(1)}function validateStep(idx: number): boolean {`,
    `${indent(2)}const result = stepSchemas[idx].safeParse(values);`,
    `${indent(2)}if (result.success) { setErrors({}); return true; }`,
    `${indent(2)}const errs: Partial<Record<keyof FormValues, string>> = {};`,
    `${indent(2)}for (const issue of result.error.issues) {`,
    `${indent(3)}const key = issue.path[0] as keyof FormValues;`,
    `${indent(3)}if (key && !errs[key]) errs[key] = issue.message;`,
    `${indent(2)}}`,
    `${indent(2)}setErrors(errs);`,
    `${indent(2)}return false;`,
    `${indent(1)}}`,
    ``,
    `${indent(1)}function goNext() {`,
    `${indent(2)}if (!validateStep(step)) return;`,
    `${indent(2)}setDirection(1);`,
    `${indent(2)}setStep(s => s + 1);`,
    `${indent(1)}}`,
    ``,
    `${indent(1)}function goBack() {`,
    `${indent(2)}setErrors({});`,
    `${indent(2)}setDirection(-1);`,
    `${indent(2)}setStep(s => s - 1);`,
    `${indent(1)}}`,
    ``,
    `${indent(1)}async function handleSubmit() {`,
    `${indent(2)}if (!validateStep(step)) return;`,
    `${indent(2)}setIsSubmitting(true);`,
    `${indent(2)}try { await onSubmit?.(values); setSubmitted(true); }`,
    `${indent(2)}finally { setIsSubmitting(false); }`,
    `${indent(1)}}`,
    ``,
    `${indent(1)}if (submitted) {`,
    `${indent(2)}return (`,
    `${indent(3)}<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">`,
    `${indent(4)}<div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">`,
    `${indent(5)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-green-600"><polyline points="20 6 9 17 4 12" /></svg>`,
    `${indent(4)}</div>`,
    `${indent(4)}<p className="text-lg font-semibold text-gray-900">Submitted!</p>`,
    `${indent(3)}</div>`,
    `${indent(2)});`,
    `${indent(1)}}`,
    ``,
    `${indent(1)}const variants = {`,
    `${indent(2)}enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),`,
    `${indent(2)}center: { x: 0, opacity: 1 },`,
    `${indent(2)}exit:  (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),`,
    `${indent(1)}};`,
    ``,
    `${indent(1)}const stepTitles = [${steps.map((s, i) => JSON.stringify(s.title || `Step ${i + 1}`)).join(', ')}];`,
    ``,
    `${indent(1)}return (`,
    `${indent(2)}<div className="space-y-5">`,
    `${indent(3)}<ProgressIndicator step={step} total={totalSteps} labels={stepTitles} />`,
    `${indent(3)}<div className="relative overflow-hidden">`,
    `${indent(4)}<AnimatePresence initial={false} custom={direction} mode="wait">`,
    `${indent(5)}<motion.div`,
    `${indent(6)}key={step}`,
    `${indent(6)}custom={direction}`,
    `${indent(6)}variants={variants}`,
    `${indent(6)}initial="enter"`,
    `${indent(6)}animate="center"`,
    `${indent(6)}exit="exit"`,
    `${indent(6)}transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}`,
    `${indent(5)}>`,
    `${indent(6)}<div className="grid grid-cols-2 gap-x-4 gap-y-5">`,
    ...steps.map((_, si) => [
      `${indent(7)}{step === ${si} && (`,
      `${indent(8)}<>`,
      ...(stepBlocks[si]
        ? stepBlocks[si].split('\n').map((l) => `${indent(8)}${l}`)
        : [`${indent(8)}{/* Step ${si + 1} has no fields */}`]),
      `${indent(8)}</>`,
      `${indent(7)})}`,
    ].join('\n')),
    `${indent(6)}</div>`,
    `${indent(5)}</motion.div>`,
    `${indent(4)}</AnimatePresence>`,
    `${indent(3)}</div>`,
    ``,
    `${indent(3)}<div className="flex items-center justify-between gap-3 pt-2">`,
    `${indent(4)}<div>`,
    `${indent(5)}{step > 0 && ${JSON.stringify(allowBacks)} [step] && (`,
    `${indent(6)}<button type="button" onClick={goBack} className="h-9 px-4 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">`,
    `${indent(7)}{ [${backLabels.map((l) => JSON.stringify(l)).join(', ')}][step] }`,
    `${indent(6)}</button>`,
    `${indent(5)})}`,
    `${indent(4)}</div>`,
    `${indent(4)}{step < totalSteps - 1 ? (`,
    `${indent(5)}<button type="button" onClick={goNext} className="h-9 px-5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">`,
    `${indent(6)}{[${nextLabels.slice(0, steps.length - 1).map((l) => JSON.stringify(l)).join(', ')}][step]}`,
    `${indent(5)}</button>`,
    `${indent(4)}) : (`,
    `${indent(5)}<button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-9 px-5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">`,
    `${indent(6)}{isSubmitting ? 'Submitting…' : ${JSON.stringify(nextLabels[steps.length - 1])}}`,
    `${indent(5)}</button>`,
    `${indent(4)})}`,
    `${indent(3)}</div>`,
    `${indent(2)}</div>`,
    `${indent(1)});`,
    `}`,
  ];

  return lines.join('\n');
}

function generateProgressIndicator(
  indicator: string,
  showBar: boolean,
  _total: number,
): string {
  const barLine = showBar && indicator !== 'bar'
    ? [
        `${indent(1)}<div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden mt-2">`,
        `${indent(2)}<div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: \`\${Math.round(((step + 1) / total) * 100)}%\` }} />`,
        `${indent(1)}</div>`,
      ].join('\n')
    : '';

  let inner = '';
  if (indicator === 'dots') {
    inner = [
      `${indent(1)}<div className="flex items-center justify-center gap-1.5">`,
      `${indent(2)}{Array.from({ length: total }).map((_, i) => (`,
      `${indent(3)}<div key={i} className="rounded-full transition-all duration-150" style={{ width: i === step ? 16 : 6, height: 6, background: i <= step ? '#2563eb' : '#d1d5db', opacity: i === step ? 1 : i < step ? 0.6 : 0.35 }} />`,
      `${indent(2)}))}`,
      `${indent(1)}</div>`,
    ].join('\n');
  } else if (indicator === 'numbered') {
    inner = `${indent(1)}<p className="text-center text-sm font-medium text-gray-500">Step {step + 1} of {total}</p>`;
  } else if (indicator === 'labelled') {
    inner = [
      `${indent(1)}<div className="flex items-center justify-center gap-1 overflow-hidden">`,
      `${indent(2)}{labels.slice(0, 4).map((lbl, i) => (`,
      `${indent(3)}<div key={i} className="flex items-center gap-1 min-w-0">`,
      `${indent(4)}<div className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 text-xs font-bold" style={{ background: i <= step ? '#2563eb' : '#e5e7eb', color: i <= step ? '#fff' : '#6b7280' }}>{i + 1}</div>`,
      `${indent(4)}<span className="text-xs font-medium truncate max-w-[56px]" style={{ color: i === step ? '#2563eb' : '#9ca3af' }}>{lbl}</span>`,
      `${indent(4)}{i < labels.slice(0, 4).length - 1 && <div className="w-4 h-px bg-gray-300 shrink-0" />}`,
      `${indent(3)}</div>`,
      `${indent(2)}))}`,
      `${indent(1)}</div>`,
    ].join('\n');
  } else {
    // bar
    inner = [
      `${indent(1)}<div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">`,
      `${indent(2)}<div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: \`\${Math.round(((step + 1) / total) * 100)}%\` }} />`,
      `${indent(1)}</div>`,
    ].join('\n');
  }

  const suppressLabels = indicator !== 'labelled' ? `${indent(1)}void labels;` : '';
  return [
    `function ProgressIndicator({ step, total, labels }: { step: number; total: number; labels: string[] }) {`,
    suppressLabels,
    inner,
    barLine,
    `}`,
  ].filter(Boolean).join('\n');
}

export function generateReactCode(schema: FormSchema, validation: 'zod' | 'yup' = 'zod'): string {
  if (isMultiStepForm(schema)) return generateMultiStepReactCode(schema);
  const componentName = toPascalCase(schema.title || 'MyForm');
  const fields = schema.fields;
  const inputFields = fields.filter((f) => isInputField(f.type));
  const withConditionals = hasConditionals(fields);
  const withController = needsController(fields);

  const imports: string[] = [
    `import { useForm${withController ? ', Controller' : ''} } from 'react-hook-form';`,
  ];
  if (validation === 'zod') {
    imports.push(`import { zodResolver } from '@hookform/resolvers/zod';`);
    imports.push(`import { z } from 'zod';`);
  } else {
    imports.push(`import { yupResolver } from '@hookform/resolvers/yup';`);
    imports.push(`import * as yup from 'yup';`);
  }
  if (withConditionals) {
    imports.push(`import { useMemo } from 'react';`);
  }

  const cnHelper = `function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}`;

  const schemaBlock = validation === 'zod'
    ? generateZodSchema(fields, componentName)
    : generateYupSchema(fields, componentName);
  const resolverName = validation === 'zod' ? 'zodResolver' : 'yupResolver';
  const propsType = generateOnSubmitType(componentName);
  const evaluateRuleFn = withConditionals ? generateEvaluateRule() : '';
  const visibilityHook = withConditionals ? generateUseVisibilityHook(fields) : '';
  void inputFields;
  const fieldBlocks: string[] = [];
  for (const field of fields) {
    if (field.type === 'hidden') continue;

    const renderedInner = renderField(field);
    if (!renderedInner) continue;

    const isInput = isInputField(field.type);
    const hasCondition = field.conditional.enabled &&
      field.conditional.rules.length > 0 &&
      (field.conditional.action === 'show' || field.conditional.action === 'hide');

    // Indented field block
    const indentedInner = renderedInner
      .split('\n')
      .map((line, i) => (i === 0 ? line : indent(4) + line))
      .join('\n');

    const fieldJsx = [
      `<div${isInput ? ` className="${field.style.width === 'half' ? 'col-span-1' : 'col-span-full'}"` : ''}>`,
      `  ${indentedInner}`,
      `</div>`,
    ].join('\n' + indent(3));

    if (hasCondition) {
      fieldBlocks.push(
        `{visibility[${JSON.stringify(field.name)}] && (\n${indent(4)}${fieldJsx}\n${indent(3)})}`,
      );
    } else {
      fieldBlocks.push(fieldJsx);
    }
  }

  const defaultVals = buildDefaultValues(fields);

  const lines: string[] = [
    `// Generated by FormCraft`,
    `// https://github.com/your-org/formcraft`,
    ``,
    ...imports,
    ``,
    cnHelper,
    ``,
    schemaBlock || `// No input fields — schema omitted`,
    ``,
    propsType,
    ``,
    ...(evaluateRuleFn ? [evaluateRuleFn, ``] : []),
    ...(visibilityHook ? [visibilityHook, ``] : []),
    `export default function ${componentName}({ onSubmit, defaultValues }: ${componentName}Props) {`,
    `${indent(1)}const {`,
    `${indent(2)}register,`,
    `${indent(2)}handleSubmit,`,
    `${indent(2)}watch,`,
    ...(withController ? [`${indent(2)}control,`] : []),
    `${indent(2)}formState: { errors, isSubmitting },`,
    `${indent(1)}} = useForm<${componentName}Values>({`,
    `${indent(2)}resolver: ${resolverName}(${componentName}Schema),`,
    `${indent(2)}defaultValues: { ...${defaultVals}, ...defaultValues },`,
    `${indent(1)}});`,
    ``,
    ...(withConditionals ? [
      `${indent(1)}const allValues = watch();`,
      `${indent(1)}const visibility = useFieldVisibility(allValues as Record<string, unknown>);`,
      ``,
    ] : []),
    `${indent(1)}const handleFormSubmit = handleSubmit(async (values) => {`,
    `${indent(2)}await onSubmit?.(values);`,
    `${indent(1)}});`,
    ``,
    `${indent(1)}return (`,
    `${indent(2)}<form`,
    `${indent(3)}onSubmit={handleFormSubmit}`,
    `${indent(3)}noValidate`,
    `${indent(3)}className="space-y-5"`,
    `${indent(2)}>`,
    ...fieldBlocks.map((b) =>
      b.split('\n').map((line, i) => (i === 0 ? indent(3) + line : indent(3) + line)).join('\n'),
    ),
    ``,
    `${indent(3)}<button`,
    `${indent(4)}type="submit"`,
    `${indent(4)}disabled={isSubmitting}`,
    `${indent(4)}className="w-full h-10 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"`,
    `${indent(3)}>`,
    `${indent(4)}{isSubmitting ? 'Submitting…' : 'Submit'}`,
    `${indent(3)}</button>`,
    `${indent(2)}</form>`,
    `${indent(1)});`,
    `}`,
  ];

  return lines.join('\n');
}


function toKebab(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form';
}

function fieldLabelFallback(field: FieldSchema): string {
  if (field.label) return field.label;
  return field.type.charAt(0).toUpperCase() + field.type.slice(1) + ' Field';
}

function htmlCondAttrs(field: FieldSchema, fields: FieldSchema[]): string {
  if (!field.conditional.enabled || field.conditional.rules.length === 0) return '';
  const rules = field.conditional.rules;
  const firstRule = rules[0];
  const src = fields.find((f) => f.id === firstRule.sourceFieldId);
  if (!src) return '';
  const attrs = [
    ` data-condition-field="${src.name}"`,
    ` data-condition-operator="${firstRule.operator}"`,
    ` data-condition-value="${String(firstRule.value)}"`,
    ` data-condition-logic="${field.conditional.logic}"`,
    ` data-condition-action="${field.conditional.action}"`,
  ];
  if (rules.length > 1) {
    const extra = rules.slice(1).map((r) => {
      const s = fields.find((f) => f.id === r.sourceFieldId);
      return s ? { field: s.name, op: r.operator, val: r.value } : null;
    }).filter(Boolean);
    if (extra.length) attrs.push(` data-condition-extra='${JSON.stringify(extra)}'`);
  }
  return attrs.join('');
}

function renderHtmlField(field: FieldSchema, allFields: FieldSchema[]): string {
  const lbl = fieldLabelFallback(field);
  const isRequired = field.validation.some((r) => r.enabled && r.type === 'required');
  const reqAttr = isRequired ? ' required' : '';
  const ariaDesc = field.helperText ? ` aria-describedby="${field.name}-desc"` : '';
  const condAttrs = htmlCondAttrs(field, allFields);

  const labelHtml = `  <label for="${field.name}">${lbl}${isRequired ? ' <span aria-hidden="true" class="fc-req">*</span>' : ''}</label>`;
  const helperHtml = field.helperText ? `  <span id="${field.name}-desc" class="fc-helper">${field.helperText}</span>` : '';
  const errorHtml = `  <span id="${field.name}-error" class="fc-error" role="alert" aria-live="polite" hidden></span>`;

  if (field.type === 'divider') return `<hr class="fc-divider" />`;
  if (field.type === 'heading') {
    const tag = `h${field.headingLevel}`;
    return `<${tag} class="fc-heading">${field.content || field.label}</${tag}>`;
  }
  if (field.type === 'paragraph') return `<p class="fc-paragraph">${field.content || ''}</p>`;

  let inputHtml = '';

  if (field.type === 'textarea') {
    inputHtml = `  <textarea id="${field.name}" name="${field.name}" rows="4" placeholder="${field.placeholder || ''}"${reqAttr}${ariaDesc} class="fc-input"></textarea>`;
  } else if (field.type === 'select') {
    const opts = field.options.map((o) => `    <option value="${o.value}">${o.label}</option>`).join('\n');
    inputHtml = `  <select id="${field.name}" name="${field.name}"${reqAttr}${ariaDesc} class="fc-input">\n    <option value="">${field.placeholder || '— select —'}</option>\n${opts}\n  </select>`;
  } else if (field.type === 'radio') {
    const items = field.options.map((o) =>
      `    <label class="fc-choice"><input type="radio" name="${field.name}" value="${o.value}"${reqAttr} /> ${o.label}</label>`,
    ).join('\n');
    return `<fieldset class="fc-field"${condAttrs}>\n  <legend class="fc-legend">${lbl}${isRequired ? ' <span aria-hidden="true" class="fc-req">*</span>' : ''}</legend>\n${items}\n${helperHtml ? helperHtml + '\n' : ''}${errorHtml}\n</fieldset>`;
  } else if (field.type === 'checkbox') {
    return `<div class="fc-field"${condAttrs}>\n  <label class="fc-choice"><input type="checkbox" id="${field.name}" name="${field.name}"${reqAttr}${ariaDesc} /> ${lbl}</label>\n${helperHtml ? helperHtml + '\n' : ''}${errorHtml}\n</div>`;
  } else if (field.type === 'checkboxGroup') {
    const items = field.options.map((o) =>
      `    <label class="fc-choice"><input type="checkbox" name="${field.name}" value="${o.value}" /> ${o.label}</label>`,
    ).join('\n');
    return `<fieldset class="fc-field"${condAttrs}>\n  <legend class="fc-legend">${lbl}${isRequired ? ' <span aria-hidden="true" class="fc-req">*</span>' : ''}</legend>\n${items}\n${helperHtml ? helperHtml + '\n' : ''}${errorHtml}\n</fieldset>`;
  } else if (field.type === 'range') {
    inputHtml = `  <div class="fc-range-wrap">\n    <input type="range" id="${field.name}" name="${field.name}" min="${field.min}" max="${field.max}" step="${field.step}" value="${field.min}"${ariaDesc} class="fc-range" oninput="this.nextElementSibling.textContent=this.value" />\n    <output class="fc-range-val">${field.min}</output>\n  </div>`;
  } else if (field.type === 'file') {
    const acceptAttr = field.accept ? ` accept="${field.accept}"` : '';
    inputHtml = `  <input type="file" id="${field.name}" name="${field.name}"${acceptAttr}${reqAttr}${ariaDesc} class="fc-input" />`;
  } else {
    const typeMap: Partial<Record<string, string>> = {
      email: 'email', phone: 'tel', url: 'url', password: 'password',
      number: 'number', date: 'date', time: 'time',
    };
    const htmlType = typeMap[field.type] ?? 'text';
    inputHtml = `  <input type="${htmlType}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}"${reqAttr}${ariaDesc} class="fc-input" />`;
  }

  return `<div class="fc-field"${condAttrs}>\n${labelHtml}\n${inputHtml}\n${helperHtml ? helperHtml + '\n' : ''}${errorHtml}\n</div>`;
}

const HTML_SNIPPET_STYLE = `<style>
*, *::before, *::after { box-sizing: border-box; }
.fc-form { font-family: inherit; max-width: 560px; display: flex; flex-direction: column; gap: 1.25rem; }
.fc-field { display: flex; flex-direction: column; gap: 0.375rem; }
.fc-field label, .fc-legend { font-size: 0.875rem; font-weight: 500; color: #111; }
.fc-req { color: #dc2626; margin-left: 2px; }
.fc-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; font-family: inherit; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; }
.fc-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
.fc-input[aria-invalid="true"], .fc-input.fc-invalid { border-color: #dc2626; background: #fef2f2; }
.fc-choice { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #374151; cursor: pointer; }
.fc-helper { font-size: 0.75rem; color: #6b7280; }
.fc-error { font-size: 0.75rem; color: #dc2626; }
.fc-range-wrap { display: flex; align-items: center; gap: 0.75rem; }
.fc-range { flex: 1; accent-color: #2563eb; }
.fc-range-val { font-size: 0.875rem; font-variant-numeric: tabular-nums; min-width: 2.5rem; text-align: right; color: #374151; }
.fc-divider { border: none; border-top: 1px solid #e5e7eb; margin: 0.5rem 0; }
.fc-heading { margin: 0; color: #111; }
.fc-paragraph { margin: 0; font-size: 0.9375rem; color: #4b5563; line-height: 1.6; }
fieldset { border: none; margin: 0; padding: 0; }
.hidden { display: none !important; }
</style>`;

export function generateHTMLSnippet(schema: FormSchema): string {
  const submitLabel = schema.title ? `Submit ${schema.title}` : 'Submit';
  const fieldLines = schema.fields
    .filter((f) => f.type !== 'hidden')
    .map((f) => renderHtmlField(f, schema.fields))
    .filter(Boolean)
    .join('\n\n');

  return [
    `<!-- FormCraft export — snippet only. Add your own JS for validation and submission. -->`,
    HTML_SNIPPET_STYLE,
    ``,
    `<form id="fc-form" class="fc-form" novalidate>`,
    fieldLines.split('\n').map((l) => '  ' + l).join('\n'),
    ``,
    `  <button type="submit" class="fc-submit">${submitLabel}</button>`,
    `</form>`,
  ].join('\n');
}

export function generateHTMLPage(schema: FormSchema): string {
  const title = schema.title || 'Form';
  const snippet = generateHTMLSnippet(schema);
  const inputFields = schema.fields.filter((f) => isInputField(f.type));

  const validationRules = inputFields.map((f) => {
    const lbl = fieldLabelFallback(f);
    const rules = f.validation.filter((r) => r.enabled);
    const checks: string[] = [];
    const isGroupType = f.type === 'checkboxGroup' || f.type === 'radio';

    if (f.type === 'checkbox') {
      if (rules.find((r) => r.type === 'required')) {
        const msg = rules.find((r) => r.type === 'required')!.message || 'This field is required';
        checks.push(`    var el_${f.name} = form.querySelector('[name="${f.name}"]'); if (el_${f.name} && !el_${f.name}.checked) { errors['${f.name}'] = ${JSON.stringify(msg)}; }`);
      }
    } else if (isGroupType) {
      if (rules.find((r) => r.type === 'required')) {
        const msg = rules.find((r) => r.type === 'required')!.message || 'Please select an option';
        checks.push(`    var checked_${f.name} = form.querySelectorAll('[name="${f.name}"]:checked'); if (!checked_${f.name}.length) { errors['${f.name}'] = ${JSON.stringify(msg)}; }`);
      }
    } else if (f.type === 'select') {
      if (rules.find((r) => r.type === 'required')) {
        const msg = rules.find((r) => r.type === 'required')!.message || 'Please select an option';
        checks.push(`    var el_${f.name} = form.querySelector('[name="${f.name}"]'); if (!el_${f.name} || !el_${f.name}.value) { errors['${f.name}'] = ${JSON.stringify(msg)}; }`);
      }
    } else if (f.type === 'file') {
      if (rules.find((r) => r.type === 'required')) {
        const msg = rules.find((r) => r.type === 'required')!.message || 'Please upload a file';
        checks.push(`    var el_${f.name} = form.querySelector('[name="${f.name}"]'); if (!el_${f.name} || !el_${f.name}.files || !el_${f.name}.files.length) { errors['${f.name}'] = ${JSON.stringify(msg)}; }`);
      }
    } else {
      const elInit = `    var el_${f.name} = form.querySelector('[name="${f.name}"]'); var val_${f.name} = el_${f.name} ? el_${f.name}.value : '';`;
      checks.push(elInit);
      for (const r of rules) {
        const v = Number(r.value);
        switch (r.type) {
          case 'required':  checks.push(`    if (!val_${f.name}.trim()) { errors['${f.name}'] = ${JSON.stringify(r.message || 'This field is required')}; }`); break;
          case 'minLength': checks.push(`    if (val_${f.name}.trim() && val_${f.name}.length < ${v}) { errors['${f.name}'] = ${JSON.stringify(r.message || `Must be at least ${v} characters`)}; }`); break;
          case 'maxLength': checks.push(`    if (val_${f.name}.length > ${v}) { errors['${f.name}'] = ${JSON.stringify(r.message || `Must be at most ${v} characters`)}; }`); break;
          case 'min':       checks.push(`    if (val_${f.name} && Number(val_${f.name}) < ${v}) { errors['${f.name}'] = ${JSON.stringify(r.message || `Must be at least ${v}`)}; }`); break;
          case 'max':       checks.push(`    if (val_${f.name} && Number(val_${f.name}) > ${v}) { errors['${f.name}'] = ${JSON.stringify(r.message || `Must be at most ${v}`)}; }`); break;
          case 'email':     checks.push(`    if (val_${f.name} && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val_${f.name})) { errors['${f.name}'] = ${JSON.stringify(r.message || 'Please enter a valid email address')}; }`); break;
          case 'url':       checks.push(`    if (val_${f.name} && !/^https?:\\/\\/.+/.test(val_${f.name})) { errors['${f.name}'] = ${JSON.stringify(r.message || 'Please enter a valid URL')}; }`); break;
          case 'pattern':   checks.push(`    if (val_${f.name} && !new RegExp(${JSON.stringify(String(r.value))}).test(val_${f.name})) { errors['${f.name}'] = ${JSON.stringify(r.message || 'Invalid format')}; }`); break;
        }
      }
    }

    if (!checks.length) return '';
    return `    // ${lbl}\n${checks.join('\n')}`;
  }).filter(Boolean);

  const condFields = schema.fields.filter(
    (f) => f.conditional.enabled && f.conditional.rules.length > 0,
  );

  const condJs = condFields.length > 0 ? `
    function evalCondition(op, actual, threshold) {
      var s = actual == null ? '' : String(actual).toLowerCase();
      var t = String(threshold).toLowerCase();
      var a = parseFloat(actual), b = parseFloat(threshold);
      switch (op) {
        case 'equals': return s === t;
        case 'notEquals': return s !== t;
        case 'contains': return s.includes(t);
        case 'notContains': return !s.includes(t);
        case 'startsWith': return s.startsWith(t);
        case 'endsWith': return s.endsWith(t);
        case 'greaterThan': return a > b;
        case 'lessThan': return a < b;
        case 'greaterThanOrEquals': return a >= b;
        case 'lessThanOrEquals': return a <= b;
        case 'isEmpty': return !actual || s === '';
        case 'isNotEmpty': return !!actual && s !== '';
        default: return true;
      }
    }
    function updateVisibility() {
      form.querySelectorAll('[data-condition-field]').forEach(function(el) {
        var srcField = el.getAttribute('data-condition-field');
        var op = el.getAttribute('data-condition-operator');
        var threshold = el.getAttribute('data-condition-value');
        var logic = el.getAttribute('data-condition-logic') || 'all';
        var action = el.getAttribute('data-condition-action') || 'show';
        var rules = [{ field: srcField, op: op, val: threshold }];
        var extra = el.getAttribute('data-condition-extra');
        if (extra) { try { JSON.parse(extra).forEach(function(r) { rules.push(r); }); } catch(e) {} }
        var results = rules.map(function(r) {
          var rEl = form.querySelector('[name="' + r.field + '"]');
          return evalCondition(r.op, rEl ? rEl.value : '', r.val);
        });
        var condMet = logic === 'all' ? results.every(Boolean) : results.some(Boolean);
        var visible = action === 'show' ? condMet : !condMet;
        if (visible) el.classList.remove('hidden'); else el.classList.add('hidden');
      });
    }
    form.addEventListener('input', updateVisibility);
    updateVisibility();
` : '';

  const pageStyle = `
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; margin: 0; padding: 2rem 1rem; }
    .fc-page { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
    h1.fc-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
    p.fc-desc { color: #6b7280; margin: 0 0 1.75rem; font-size: 0.9375rem; }
    .fc-submit { width: 100%; height: 2.625rem; background: #2563eb; color: #fff; border: none; border-radius: 0.375rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-top: 0.5rem; }
    .fc-submit:hover { background: #1d4ed8; }
    .fc-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .fc-status { padding: 0.75rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; margin-top: 1rem; display: none; }
    .fc-status.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; display: block; }
    .fc-status.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; display: block; }
    .hidden { display: none !important; }
  `;

  const lines = [
    `<!-- Generated by FormCraft — formcraft.app -->`,
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${title}</title>`,
    `  <style>${pageStyle}</style>`,
    `</head>`,
    `<body>`,
    `  <div class="fc-page">`,
    `    <h1 class="fc-title">${title}</h1>`,
    schema.description ? `    <p class="fc-desc">${schema.description}</p>` : null,
    snippet.split('\n').map((l) => '    ' + l).join('\n'),
    `    <div id="fc-status" class="fc-status"></div>`,
    `  </div>`,
    ``,
    `  <script>`,
    `    // Set this to your form submission endpoint`,
    `    var ACTION_URL = '/api/submit';`,
    `    var form = document.getElementById('fc-form');`,
    condJs,
    `    form.addEventListener('submit', function(e) {`,
    `      e.preventDefault();`,
    `      var errors = {};`,
    ``,
    validationRules.length ? validationRules.join('\n') : '',
    ``,
    `      // Clear previous errors`,
    `      form.querySelectorAll('.fc-error').forEach(function(el) { el.textContent = ''; el.hidden = true; });`,
    `      form.querySelectorAll('.fc-invalid').forEach(function(el) { el.classList.remove('fc-invalid'); el.removeAttribute('aria-invalid'); });`,
    ``,
    `      if (Object.keys(errors).length) {`,
    `        Object.keys(errors).forEach(function(name) {`,
    `          var errEl = document.getElementById(name + '-error');`,
    `          var inputEl = form.querySelector('[name="' + name + '"]');`,
    `          if (errEl) { errEl.textContent = errors[name]; errEl.hidden = false; }`,
    `          if (inputEl) { inputEl.classList.add('fc-invalid'); inputEl.setAttribute('aria-invalid', 'true'); }`,
    `        });`,
    `        return;`,
    `      }`,
    ``,
    `      var btn = form.querySelector('.fc-submit');`,
    `      btn.disabled = true; btn.textContent = 'Submitting…';`,
    `      var status = document.getElementById('fc-status');`,
    `      status.className = 'fc-status'; status.style.display = 'none';`,
    ``,
    `      var data = {};`,
    `      new FormData(form).forEach(function(v, k) {`,
    `        if (data[k]) { data[k] = [].concat(data[k], v); } else { data[k] = v; }`,
    `      });`,
    ``,
    `      fetch(ACTION_URL, {`,
    `        method: 'POST',`,
    `        headers: { 'Content-Type': 'application/json' },`,
    `        body: JSON.stringify(data),`,
    `      })`,
    `      .then(function(res) {`,
    `        if (!res.ok) throw new Error('Server error ' + res.status);`,
    `        status.textContent = 'Form submitted successfully!';`,
    `        status.className = 'fc-status success';`,
    `        form.reset();`,
    `      })`,
    `      .catch(function(err) {`,
    `        status.textContent = 'Submission failed: ' + err.message;`,
    `        status.className = 'fc-status error';`,
    `      })`,
    `      .finally(function() {`,
    `        btn.disabled = false; btn.textContent = 'Submit';`,
    `      });`,
    `    });`,
    `  </script>`,
    `</body>`,
    `</html>`,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

// make toKebab available for ExportModal filename generation
export { toKebab as toKebabCase };
