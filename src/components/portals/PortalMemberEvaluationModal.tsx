import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Award, 
  X, 
  Save, 
  Crown, 
  HeartHandshake, 
  Scale, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { DepartmentMember, Department } from '../../types/portals';

interface PortalMemberEvaluationModalProps {
  member: DepartmentMember | null;
  department: Department;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  isSuperAdmin?: boolean;
}

export const PortalMemberEvaluationModal: React.FC<PortalMemberEvaluationModalProps> = ({
  member,
  department,
  isOpen,
  onClose,
  onSaved,
  isSuperAdmin = false,
}) => {
  if (!isOpen || !member) return null;

  const cleanMemberId = String(member.id);

  // Evaluation states
  const [headRatingDelta, setHeadRatingDelta] = useState<number>(0);
  const [behaviorDelta, setBehaviorDelta] = useState<number>(0);
  const [disciplineLevel, setDisciplineLevel] = useState<'Exemplary' | 'Good' | 'Neutral' | 'Warning' | 'Probation'>('Neutral');
  const [disciplineDelta, setDisciplineDelta] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch existing rating record from Supabase for this member
  useEffect(() => {
    async function loadMemberRating() {
      try {
        const { data } = await supabase
          .from('member_ratings')
          .select('*')
          .eq('member_id', cleanMemberId)
          .single();

        if (data) {
          const deptRatings = data.department_head_ratings || {};
          const currentDeptHeadScore = deptRatings[department] ?? data.head_rating_score ?? 0;
          setHeadRatingDelta(currentDeptHeadScore);
          setBehaviorDelta(data.behavior_score ?? 0);

          const dScore = data.discipline_score ?? 0;
          setDisciplineDelta(dScore);
          if (dScore === 10) setDisciplineLevel('Exemplary');
          else if (dScore === 5) setDisciplineLevel('Good');
          else if (dScore === 0) setDisciplineLevel('Neutral');
          else if (dScore === -5) setDisciplineLevel('Warning');
          else if (dScore === -10) setDisciplineLevel('Probation');
          else setDisciplineLevel('Neutral');
        }
      } catch (err) {
        console.log('No prior member_ratings found for ID:', cleanMemberId);
      }
    }

    if (member) {
      loadMemberRating();
    }
  }, [member, cleanMemberId, department]);

  const handleDisciplineLevelChange = (level: 'Exemplary' | 'Good' | 'Neutral' | 'Warning' | 'Probation') => {
    setDisciplineLevel(level);
    switch (level) {
      case 'Exemplary': setDisciplineDelta(10); break;
      case 'Good': setDisciplineDelta(5); break;
      case 'Neutral': setDisciplineDelta(0); break;
      case 'Warning': setDisciplineDelta(-5); break;
      case 'Probation': setDisciplineDelta(-10); break;
    }
  };

  const handleSaveEvaluation = async () => {
    setSaving(true);
    try {
      // Fetch existing record to merge department ratings if multi-department
      const { data: existing } = await supabase
        .from('member_ratings')
        .select('*')
        .eq('member_id', cleanMemberId)
        .single();

      const existingDeptRatings = existing?.department_head_ratings || {};
      const updatedDeptRatings = {
        ...existingDeptRatings,
        [department]: headRatingDelta,
      };

      // Compute average head rating across all rated departments
      const deptValues = Object.values(updatedDeptRatings) as number[];
      const avgHeadDelta = deptValues.length > 0 ? Math.round(deptValues.reduce((a, b) => a + b, 0) / deptValues.length) : headRatingDelta;

      const presenceDelta = existing?.presence_score ?? 0;
      const overallRating = Math.min(100, Math.max(0, 50 + presenceDelta + avgHeadDelta + behaviorDelta + disciplineDelta));

      const { error } = await supabase.from('member_ratings').upsert({
        member_id: cleanMemberId,
        presence_score: presenceDelta,
        head_rating_score: avgHeadDelta,
        department_head_ratings: updatedDeptRatings,
        behavior_score: behaviorDelta,
        discipline_score: disciplineDelta,
        overall_rating: overallRating,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setToastMessage('Evaluation saved successfully!');
      if (onSaved) onSaved();
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving member rating from Head Portal:', err);
      alert(`Failed to save evaluation: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const currentGeneralRating = Math.round(member.rating ?? 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-100 text-xs">
      <div className="bg-[#090d16] rounded-3xl border border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-[#00e5ff]/20">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d5c63] text-white dark:bg-[#00e5ff] dark:text-slate-950 font-bold text-sm flex items-center justify-center border border-[#00e5ff]/30 shadow-sm shrink-0">
              {member.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Evaluate {member.full_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30">
                  {department} Department
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Head evaluation range: -10% to +20% • General Rating Badge: {currentGeneralRating}%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* General Percentage Badge Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-[#00e5ff]/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">General Overall Member Rating</span>
              <div className="text-2xl font-black text-[#00e5ff] mt-0.5">{currentGeneralRating}% Rating</div>
            </div>
            <Award className="w-8 h-8 text-amber-400" />
          </div>

          {/* 1. Department Head Evaluation Range (-10% to +20%) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-xs text-white flex items-center gap-1.5">
                <Crown size={15} className="text-amber-400" />
                {department} Department Head Rating (-10% to +20%)
              </label>
              <span className="font-mono font-extrabold text-amber-400 text-xs">
                {headRatingDelta >= 0 ? `+${headRatingDelta}%` : `${headRatingDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={20}
              value={headRatingDelta}
              onChange={(e) => setHeadRatingDelta(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Penalty (-10%)</span>
              <span>Neutral (0%)</span>
              <span>Exceptional (+20%)</span>
            </div>
          </div>

          {/* 2. Behaviour & Conduct (-10% to +10%) - Admin Only */}
          {isSuperAdmin ? (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  <HeartHandshake size={15} className="text-emerald-400" />
                  Behaviour & Team Conduct (-10% to +10%)
                </label>
                <span className="font-mono font-extrabold text-emerald-400 text-xs">
                  {behaviorDelta >= 0 ? `+${behaviorDelta}%` : `${behaviorDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min={-10}
                max={10}
                value={behaviorDelta}
                onChange={(e) => setBehaviorDelta(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Disruptive (-10%)</span>
                <span>Neutral (0%)</span>
                <span>Exemplary (+10%)</span>
              </div>
            </div>
          ) : null}

          {/* 3. Discipline Standing & Notes */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            {isSuperAdmin && (
              <>
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    <Scale size={15} className="text-purple-400" />
                    Discipline Standing
                  </label>
                  <span className="font-mono font-extrabold text-purple-400 text-xs bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {disciplineLevel} ({disciplineDelta >= 0 ? `+${disciplineDelta}%` : `${disciplineDelta}%`})
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Discipline Level</label>
                  <select
                    value={disciplineLevel}
                    onChange={(e) => handleDisciplineLevelChange(e.target.value as any)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 font-bold text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="Exemplary">Exemplary (+10%)</option>
                    <option value="Good">Good (+5%)</option>
                    <option value="Neutral">Neutral (+0%)</option>
                    <option value="Warning">Warning (-5%)</option>
                    <option value="Probation">Probation (-10%)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Department Notes / Observations</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter member performance observations..."
                rows={2}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveEvaluation}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#0d5c63] hover:bg-[#0a464b] dark:bg-[#00e5ff] dark:hover:bg-[#00b4d8] text-white dark:text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02] disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Evaluation'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
