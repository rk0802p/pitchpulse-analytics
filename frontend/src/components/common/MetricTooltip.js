import React, { useState } from 'react';
import { GLOSSARY } from '../../utils/metricFormatters';

export const MetricTooltip = ({ metricKey, children, title }) => {
  const [show, setShow] = useState(false);
  const info = GLOSSARY[metricKey] || { term: title || metricKey, definition: title || metricKey };

  return (
    <span 
      className="relative inline-block cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="border-b border-dotted border-[var(--mute)] group-hover:border-[var(--ink)]">
        {children}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 p-2.5 bg-[var(--paper)] text-[var(--ink)] text-xs font-ser font-normal border-2 border-[var(--ink)] shadow-xl z-50 rounded-xs pointer-events-none text-left leading-normal">
          <strong className="font-disp font-bold block text-sm border-b border-[var(--rule)] pb-0.5 mb-1 text-[var(--ink)]">
            {info.term}
          </strong>
          <span className="text-[11px] text-[var(--mute)] block">
            {info.definition}
          </span>
        </span>
      )}
    </span>
  );
};

export default MetricTooltip;
