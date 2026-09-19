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
  const [notes, setNotes] = useState(member.evaluation_notes || '');
  const [saving, setSaving] = useState(false);

  const delta = punctuality + teamwork + initiative + qualityOfWork;
  const simulatedNewRating = Math.max(0, Math.min(100, Math.round((member.overall_rating - member.manual_adjustment + delta) * 10) / 10));

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
                <span className={`text-xs font-mono font-normal ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ({delta >= 0 ? `+${delta}%` : `${delta}%`})
                </span>
              </div>
            </div>
          </div>

          {/* Appraisal Criteria */}
          <div className="space-y-3">
            {criteriaList.map((crit) => (
              <div key={crit.id} className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{crit.label}</h4>
                    <p className="text-[11px] text-slate-500">{crit.desc}</p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white border border-slate-200">
                    {crit.value > 0 ? `+${crit.value}%` : `${crit.value}%`}
                  </span>
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
