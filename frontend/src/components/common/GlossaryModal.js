import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { GLOSSARY } from '../../utils/metricFormatters';

export const GlossaryModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-ser">
      <div className="bg-[var(--paper)] border-2 border-[var(--ink)] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden rounded-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[var(--ink)] bg-[var(--panel)]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--blue)]" />
            <h3 className="font-disp font-extrabold text-2xl text-[var(--ink)] tracking-tight">
              PitchPulse Statistical Glossary & Metric Index
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--paper)] text-[var(--ink)] rounded transition-colors"
            aria-label="Close glossary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto p-5 space-y-4 text-sm divide-y divide-[var(--rule)]">
          {Object.entries(GLOSSARY).map(([key, item]) => (
            <div key={key} className="pt-3 first:pt-0">
              <dt className="font-disp font-bold text-lg text-[var(--ink)] flex items-center gap-2">
                <span>{item.term}</span>
                <span className="text-xs font-serif italic text-[var(--mute)]">[{key}]</span>
              </dt>
              <dd className="text-xs text-[var(--mute)] mt-1 leading-relaxed font-ser">
                {item.definition}
              </dd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--rule)] bg-[var(--panel)] flex justify-between items-center text-xs italic text-[var(--mute)]">
          <span>Standard FBref, StatsBomb & Opta statistical nomenclature</span>
          <button
            onClick={onClose}
            className="border border-[var(--ink)] px-3 py-1 bg-[var(--paper)] text-[var(--ink)] not-italic font-semibold text-xs hover:bg-[var(--panel)]"
          >
            Close Index
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlossaryModal;
