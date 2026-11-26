import React, { useState } from 'react';
import { Check, Loader2, ArrowLeftRight } from 'lucide-react';
import { Department } from '../../types/portals';
import { updateMemberDepartments } from '../../lib/departmentStorage';

const ALL_DEPARTMENTS: Department[] = ['Projects', 'Organization', 'Media'];

interface DepartmentTransferControlProps {
  registrationId: number | string;
  currentDepartments: string[];
  onUpdated?: (nextDepartments: Department[]) => void;
  compact?: boolean;
}

export function DepartmentTransferControl({
  registrationId,
  currentDepartments,
  onUpdated,
  compact = false,
}: DepartmentTransferControlProps) {
  const initial = ALL_DEPARTMENTS.filter(d =>
    (currentDepartments || []).some(cd => cd.toLowerCase().includes(d.toLowerCase()))
  );
  const [selected, setSelected] = useState<Department[]>(initial.length ? initial : ['Organization']);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleDept = (dept: Department) => {
    setSelected(prev => {
      if (prev.includes(dept)) {
        if (prev.length === 1) return prev; // Keep at least one department
        return prev.filter(d => d !== dept);
      }
      return [...prev, dept];
    });
    setFeedback(null);
  };

  const hasChanges =
    selected.length !== initial.length || selected.some(d => !initial.includes(d));

  const handleSave = async () => {
    if (!selected.length) return;
    setSaving(true);
    setFeedback(null);
    const result = await updateMemberDepartments(registrationId, selected);
    setSaving(false);

    if (result.success) {
      setFeedback('Saved');
      onUpdated?.(selected);
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback(result.error || 'Error');
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'p-2.5 rounded-lg bg-secondary border border-subtle'}`}>
      {!compact && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted mr-1">
          <ArrowLeftRight className="w-3 h-3 text-accent" />
          Departments:
        </span>
      )}

      {ALL_DEPARTMENTS.map(dept => {
        const active = selected.includes(dept);
        return (
          <button
            key={dept}
            type="button"
            onClick={() => toggleDept(dept)}
            disabled={saving}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
              active
                ? 'bg-accent btn-on-accent border-accent'
                : 'bg-surface text-secondary border-default hover:border-accent'
            }`}
          >
            {active && <Check className="w-3 h-3" />}
            <span>{dept}</span>
          </button>
        );
      })}

      {hasChanges && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          <span>Apply Transfer</span>
        </button>
      )}

      {feedback && (
        <span className={`text-[11px] font-semibold ${feedback === 'Saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {feedback}
        </span>
      )}
    </div>
  );
}
