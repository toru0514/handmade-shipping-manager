'use client';

import { TemplateVariableDefinition } from '@/application/usecases/UpdateMessageTemplateUseCase';

interface VariableListProps {
  readonly variables: readonly TemplateVariableDefinition[];
  readonly onInsert: (variableName: string) => void;
}

export function VariableList({ variables, onInsert }: VariableListProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">利用可能な変数</h2>
      <ul className="space-y-2">
        {variables.map((variable) => (
          <li key={variable.name} className="flex items-center justify-between gap-3">
            <code className="rounded bg-gray-100 px-2 py-1 text-sm">{`{{${variable.name}}}`}</code>
            <span className="flex-1 text-sm text-gray-700">{variable.label}</span>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
              onClick={() => onInsert(variable.name)}
            >
              挿入
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
