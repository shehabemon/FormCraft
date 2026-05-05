import type { FieldSchema, FieldType } from '@/types/form';
import type { ConditionalOperator, ConditionalRule } from '@/types/form';

function evaluateRule(rule: ConditionalRule, rawValue: unknown): boolean {
  const { operator, value: threshold } = rule;

  const str = (v: unknown) => {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  };

  const strActual  = str(rawValue).toLowerCase();
  const strThresh  = str(threshold).toLowerCase();
  const numActual  = Number(rawValue);
  const numThresh  = Number(threshold);

  switch (operator as ConditionalOperator) {
    case 'equals':              return strActual === strThresh;
    case 'notEquals':           return strActual !== strThresh;
    case 'contains':            return strActual.includes(strThresh);
    case 'notContains':         return !strActual.includes(strThresh);
    case 'startsWith':          return strActual.startsWith(strThresh);
    case 'endsWith':            return strActual.endsWith(strThresh);
    case 'greaterThan':         return !isNaN(numActual) && numActual  >  numThresh;
    case 'lessThan':            return !isNaN(numActual) && numActual  <  numThresh;
    case 'greaterThanOrEquals': return !isNaN(numActual) && numActual  >= numThresh;
    case 'lessThanOrEquals':    return !isNaN(numActual) && numActual  <= numThresh;
    case 'isEmpty':             return rawValue == null || str(rawValue) === '';
    case 'isNotEmpty':          return rawValue != null  && str(rawValue) !== '';
    default:                    return true;
  }
}

export function evaluateVisibility(
  fieldId: string,
  allFields: FieldSchema[],
  formValues: Record<string, unknown>,
): boolean {
  const field = allFields.find((f) => f.id === fieldId);
  if (!field) return true;

  const { conditional } = field;
  if (!conditional.enabled || conditional.rules.length === 0) return true;
  if (conditional.action === 'require') return true;

  const results = conditional.rules.map((rule) =>
    evaluateRule(rule, formValues[rule.sourceFieldId])
  );

  const combined =
    conditional.logic === 'all'
      ? results.every(Boolean)
      : results.some(Boolean);

  return conditional.action === 'show' ? combined : !combined;
}

export function getCascadedVisibility(
  fields: FieldSchema[],
  formValues: Record<string, unknown>,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const field of fields) {
    const maskedValues: Record<string, unknown> = {};
    for (const [id, val] of Object.entries(formValues)) {
      maskedValues[id] = visibility[id] === false ? undefined : val;
    }

    visibility[field.id] = evaluateVisibility(field.id, fields, maskedValues);
  }

  return visibility;
}

export function detectCircularReferences(fields: FieldSchema[]): string[][] {
  const deps = new Map<string, string[]>();
  for (const f of fields) {
    deps.set(
      f.id,
      f.conditional.enabled
        ? f.conditional.rules.map((r) => r.sourceFieldId).filter((id) => id !== '')
        : [],
    );
  }

  const cycles: string[][] = [];
  const globalVisited = new Set<string>();

  for (const start of deps.keys()) {
    if (globalVisited.has(start)) continue;

    const visited = new Set<string>();
    const onStack = new Set<string>();
    const path: string[] = [];

    const dfs = (id: string): void => {
      if (onStack.has(id)) {
        const cycleStart = path.indexOf(id);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), id]);
        }
        return;
      }
      if (visited.has(id)) return;

      visited.add(id);
      onStack.add(id);
      path.push(id);

      for (const dep of deps.get(id) ?? []) {
        dfs(dep);
      }

      path.pop();
      onStack.delete(id);
      globalVisited.add(id);
    };

    dfs(start);
  }

  const seen = new Set<string>();
  return cycles.filter((cycle) => {
    const ids = cycle.slice(0, -1);
    const normalised = (() => {
      const minIdx = ids.indexOf([...ids].sort()[0]);
      return [...ids.slice(minIdx), ...ids.slice(0, minIdx)].join(',');
    })();
    if (seen.has(normalised)) return false;
    seen.add(normalised);
    return true;
  });
}

export interface OperatorMeta {
  value: ConditionalOperator;
  label: string;
}

export const OPERATOR_META: OperatorMeta[] = [
  { value: 'equals',              label: 'is equal to'        },
  { value: 'notEquals',           label: 'is not equal to'    },
  { value: 'contains',            label: 'contains'           },
  { value: 'notContains',         label: 'does not contain'   },
  { value: 'startsWith',          label: 'starts with'        },
  { value: 'endsWith',            label: 'ends with'          },
  { value: 'greaterThan',         label: 'is greater than'    },
  { value: 'lessThan',            label: 'is less than'       },
  { value: 'greaterThanOrEquals', label: 'is ≥'               },
  { value: 'lessThanOrEquals',    label: 'is ≤'               },
  { value: 'isEmpty',             label: 'is empty'           },
  { value: 'isNotEmpty',          label: 'is not empty'       },
];

export const OPERATORS_BY_TYPE: Record<FieldType, ConditionalOperator[]> = {
  text:          ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  textarea:      ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  number:        ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEquals', 'lessThanOrEquals', 'isEmpty', 'isNotEmpty'],
  email:         ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  phone:         ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  url:           ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  password:      ['isEmpty', 'isNotEmpty'],
  select:        ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  multiselect:   ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  radio:         ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  checkbox:      ['equals', 'notEquals'],
  checkboxGroup: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  date:          ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
  time:          ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
  file:          ['isEmpty', 'isNotEmpty'],
  range:         ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEquals', 'lessThanOrEquals'],
  hidden:        ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  heading:       [],
  paragraph:     [],
  divider:       [],
};
