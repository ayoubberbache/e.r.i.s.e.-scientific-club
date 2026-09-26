import React, { useState } from 'react';
import { X, Award } from 'lucide-react';
import { ClubMember, AppraisalInput } from '../types';

interface AppraisalModalProps {
  member: ClubMember;
  onClose: () => void;
  onSubmit: (appraisal: AppraisalInput) => Promise<void>;
}

export const AppraisalModal: React.FC<AppraisalModalProps> = ({
  member,
  onClose,
  onSubmit,
}) => {
  const [punctuality, setPunctuality] = useState(0);
  const [teamwork, setTeamwork] = useState(0);
  const [initiative, setInitiative] = useState(0);
  const [qualityOfWork, setQualityOfWork] = useState(0);
  const [evaluationRatio, setEvaluationRatio] = useState<number>(100);
  const [useDirectScore, setUseDirectScore] = useState<boolean>(false);
  const [directDelta, setDirectDelta] = useState<number>(0);
  const [notes, setNotes] = useState(member.evaluation_notes || '');
  const [saving, setSaving] = useState(false);

  const criteriaSum = punctuality + teamwork + initiative + qualityOfWork;
  const ratioMultiplier = (evaluationRatio || 100) / 100;
  const calculatedDelta = Math.round(criteriaSum * ratioMultiplier * 10) / 10;
  const finalDelta = useDirectScore ? directDelta : calculatedDelta;

  const simulatedNewRating = Math.max(
    0, 
    Math.min(100, Math.round((member.overall_rating - member.manual_adjustment + finalDelta) * 10) / 10)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        member_id: member.id,
        punctuality,
        teamwork,
        initiative,
        quality_of_work: qualityOfWork,
        evaluation_ratio: evaluationRatio,
        custom_adjustment: finalDelta,
        notes,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const criteriaList = [
    {
      id: 'punctuality',
      label: 'Punctuality & Reliability',
      desc: 'Arrival at meetings, responsiveness on club communication channels',
      value: punctuality,
      setter: setPunctuality,
    },
    {
      id: 'teamwork',
      label: 'Teamwork & Inter-department Spirit',
      desc: 'Collaborative behavior, helping peers across departments',
      value: teamwork,
      setter: setTeamwork,
    },
    {
      id: 'initiative',
      label: 'Initiative & Problem Solving',
      desc: 'Proactive proposals, autonomous execution, taking ownership',
      value: initiative,
      setter: setInitiative,
    },
    {
      id: 'quality',
      label: 'Quality of Deliverables',
      desc: 'Excellence in projects, media assets, or organizational execution',
      value: qualityOfWork,
      setter: setQualityOfWork,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-300 w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white border border-slate-300 flex items-center justify-center text-slate-700">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">HR Member Appraisal</h2>
              <p className="text-xs text-slate-500">
                Evaluating <span className="font-semibold text-slate-900">{member.full_name}</span> &bull; {member.department}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current vs Simulated Rating */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Current Rating</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {member.overall_rating}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Adjusted Rating</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-1.5">
                <span>{simulatedNewRating}%</span>
                <span className={`text-xs font-mono font-bold ${finalDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ({finalDelta >= 0 ? `+${finalDelta}%` : `${finalDelta}%`})
                </span>
              </div>
            </div>
          </div>

          {/* Editable Evaluation Ratio & Mode Selection */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-900 block">
                  Evaluation Ratio & Weight
                </label>
                <p className="text-[11px] text-slate-500">
                  Scale or weight ratio for this evaluation session (cause ratio varies per workshop/task)
                </p>
              </div>

              {/* Editable Ratio Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Ratio:</span>
                <div className="relative w-24">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={5}
                    value={evaluationRatio}
                    onChange={(e) => setEvaluationRatio(parseFloat(e.target.value) || 100)}
                    disabled={useDirectScore}
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 text-right pr-6 focus:outline-none focus:border-[#0d5c63] disabled:opacity-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
              {[50, 75, 100, 125, 150, 200].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={useDirectScore}
                  onClick={() => setEvaluationRatio(r)}
                  className={`px-2 py-0.5 font-mono text-xs font-semibold border transition-colors cursor-pointer ${
                    evaluationRatio === r && !useDirectScore
                      ? 'bg-[#0d5c63] text-white border-[#0d5c63]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 disabled:opacity-40'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>

            {/* Toggle Direct Custom Adjustment */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={useDirectScore}
                  onChange={(e) => setUseDirectScore(e.target.checked)}
                  className="rounded-xs accent-[#0d5c63]"
                />
                <span>Set custom net rating adjustment directly (override criteria)</span>
              </label>

              {useDirectScore && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-slate-500">Net Delta:</span>
                  <div className="relative w-24">
                    <input
                      type="number"
                      min={-50}
                      max={50}
                      step={0.5}
                      value={directDelta}
                      onChange={(e) => setDirectDelta(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white border border-[#0d5c63] text-right pr-6 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appraisal Criteria (Active when direct score is false) */}
          <div className={`space-y-3 ${useDirectScore ? 'opacity-50 pointer-events-none' : ''}`}>
            {criteriaList.map((crit) => (
              <div key={crit.id} className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{crit.label}</h4>
                    <p className="text-[11px] text-slate-500">{crit.desc}</p>
                  </div>
                  
                  {/* Editable Field for Criterion Score */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={-20}
                      max={20}
                      step={0.5}
                      value={crit.value}
                      onChange={(e) => crit.setter(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0d5c63]"
                    />
                    <span className="text-xs font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[-5, -2, 0, 2, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => crit.setter(val)}
                      className={`flex-1 py-1 text-xs font-bold font-mono transition-colors border cursor-pointer ${
                        crit.value === val
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              HR Notes & Observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter context, achievements, or areas for improvement..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Submit Appraisal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
