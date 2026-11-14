import React from 'react';

export function getQualityDetails(metadata = {}) {
  metadata = metadata || {};
  const known = metadata.known_gaps || {};
  const partial = metadata.partial_competitions || {};
  if (Object.keys(partial).length) {
    const parts = Object.entries(partial).map(([competition, value]) => `${competition.replace(/^[a-z]{2}\s+/, '')} about matchweek ${value.matchweek}/${value.of}`);
    return { grade: 'PARTIAL_SNAPSHOT', label: 'partial snapshot', summary: metadata.notes || metadata.quality_notes || parts.join('; ') };
  }
  const grade = known.grade;
  if (!grade || grade === 'COMPLETE') return { grade: grade || null, label: '', summary: '' };
  return { grade, label: grade === 'SIGNIFICANT_GAPS' ? 'significant gaps' : 'minor gaps', summary: known.summary || metadata.notes || '' };
}

export default function DataQualityBadge({ metadata, compact = false }) {
  const details = getQualityDetails(metadata);
  if (!details.label) return null;
  const warning = details.grade === 'SIGNIFICANT_GAPS' || details.grade === 'PARTIAL_SNAPSHOT';
  return <a href="#data" title={`${details.summary || details.label} · View Dataset Registry`} aria-label={`${details.label}. ${details.summary || ''} View Dataset Registry.`}
    className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] leading-tight ${warning ? 'border-amber-500/50 text-amber-300 bg-amber-500/10' : 'border-[var(--rule)] text-[var(--mute)] bg-[var(--panel)]'}`}>
    {compact ? details.grade === 'PARTIAL_SNAPSHOT' ? 'partial' : details.grade === 'SIGNIFICANT_GAPS' ? 'gaps' : 'minor' : details.label}
  </a>;
}
