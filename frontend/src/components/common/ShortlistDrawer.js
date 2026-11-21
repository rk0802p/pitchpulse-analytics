import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Download,
  GitCompare,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  SHORTLIST_TAGS,
  buildShortlistCsv,
} from '../../utils/shortlistStore';
import { formatMinutes, formatDecimal } from '../../utils/metricFormatters';

export const ShortlistDrawer = ({
  isOpen = false,
  onClose,
  shortlist = [],
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onSelectPlayer,
  onAddToCompare,
  onCompareBatch,
}) => {
  const [activeTag, setActiveTag] = useState('All');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered =
    activeTag === 'All'
      ? shortlist
      : shortlist.filter((item) => item.tag === activeTag);

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const csv = buildShortlistCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pitchpulse_scout_shortlist_${activeTag.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-label="Scout Shortlist Drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--paper)] border-l-2 border-[var(--ink)] h-full flex flex-col shadow-2xl font-ser text-[var(--ink)]">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[var(--ink)] flex items-center justify-between bg-[var(--panel)]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
              Saved Scouting Board · Local Persistence
            </span>
            <h2 className="font-disp font-extrabold text-2xl leading-none mt-0.5 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[var(--blue)]" fill="currentColor" />
              <span>Scout Shortlist ({shortlist.length})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortlist drawer"
            className="border border-[var(--ink)] p-1.5 hover:bg-[var(--paper)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tag Filter Strip */}
        <div className="px-5 py-2.5 border-b border-[var(--rule)] flex items-center gap-1.5 overflow-x-auto bg-[var(--paper)]">
          {['All', ...SHORTLIST_TAGS].map((tag) => {
            const count =
              tag === 'All'
                ? shortlist.length
                : shortlist.filter((i) => i.tag === tag).length;
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`px-2 py-0.5 text-[11px] font-mono border whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] font-bold'
                    : 'border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                }`}
              >
                {tag} ({count})
              </button>
            );
          })}
        </div>

        {/* Batch Actions Bar */}
        {filtered.length > 0 && (
          <div className="px-5 py-2 border-b border-[var(--rule)] bg-[var(--panel)] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {filtered.length >= 2 && onCompareBatch && (
                <button
                  type="button"
                  onClick={() => {
                    onCompareBatch(filtered.slice(0, 4));
                    if (onClose) onClose();
                  }}
                  className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-2.5 py-1 text-[11px] font-disp font-bold uppercase tracking-wider hover:opacity-90 inline-flex items-center gap-1"
                >
                  <GitCompare className="w-3 h-3" />
                  <span>Compare Top {Math.min(4, filtered.length)}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                className="border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper)] px-2 py-1 text-[11px] font-mono inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] text-[var(--mute)] hover:text-[var(--red)] underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Saved Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 px-4 text-center border-2 border-dashed border-[var(--rule)] space-y-2">
              <Bookmark className="w-8 h-8 mx-auto text-[var(--mute)] opacity-50" />
              <p className="font-bold text-sm text-[var(--ink)]">
                {shortlist.length === 0
                  ? 'Your scout shortlist is empty.'
                  : `No players tagged "${activeTag}".`}
              </p>
              <p className="text-xs italic text-[var(--mute)]">
                Click the bookmark icon on any player in the Explorer, Leaderboards, Comparison, Squad Browser, or Player Dossier to save them with tags and notes.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.key}
                className="border border-[var(--ink)] bg-[var(--paper)] p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectPlayer) onSelectPlayer(item);
                        if (onClose) onClose();
                      }}
                      className="font-disp font-extrabold text-xl text-[var(--ink)] hover:text-[var(--blue)] leading-tight text-left inline-flex items-center gap-1"
                    >
                      <span className="truncate">{item.Player}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </button>
                    <div className="text-[11px] text-[var(--mute)] font-mono">
                      {item.Squad} • {item.Pos} • Age {item.Age ?? '—'} • Vol. {item.season}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem && onRemoveItem(item.key)}
                    aria-label={`Remove ${item.Player} from shortlist`}
                    className="text-[var(--mute)] hover:text-[var(--red)] p-1 shrink-0"
                    title="Remove from shortlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact Stat Readout */}
                <div className="grid grid-cols-4 gap-1.5 text-center bg-[var(--panel)] border border-[var(--rule)] py-1.5 px-2 font-mono text-[11px] tabular-nums">
                  <div>
                    <span className="text-[9px] uppercase text-[var(--mute)] block">Mins</span>
                    <span className="font-bold">{item.Min ? formatMinutes(item.Min) : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[var(--mute)] block">Gls</span>
                    <span className="font-bold">{item.Gls ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[var(--mute)] block">xG</span>
                    <span className="font-bold">{formatDecimal(item.xG, 1)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[var(--mute)] block">Ast</span>
                    <span className="font-bold">{item.Ast ?? '—'}</span>
                  </div>
                </div>

                {/* Tag Selector + Quick Compare */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`shortlist-tag-${item.key}`}
                      className="text-[10px] font-mono uppercase text-[var(--mute)]"
                    >
                      Tag:
                    </label>
                    <select
                      id={`shortlist-tag-${item.key}`}
                      value={item.tag}
                      onChange={(e) =>
                        onUpdateItem && onUpdateItem(item.key, { tag: e.target.value })
                      }
                      className="border border-[var(--rule)] bg-[var(--paper)] px-2 py-0.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
                    >
                      {SHORTLIST_TAGS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {onAddToCompare && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCompare(item);
                        if (onClose) onClose();
                      }}
                      className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-0.5 text-[11px] font-mono text-[var(--ink)]"
                    >
                      + Compare
                    </button>
                  )}
                </div>

                {/* Scout Note Input */}
                <div>
                  <label
                    htmlFor={`shortlist-note-${item.key}`}
                    className="sr-only"
                  >
                    Scout note for {item.Player}
                  </label>
                  <input
                    id={`shortlist-note-${item.key}`}
                    type="text"
                    value={item.note || ''}
                    onChange={(e) =>
                      onUpdateItem && onUpdateItem(item.key, { note: e.target.value })
                    }
                    placeholder="Add scout note (e.g. inverted winger, high pressing volume)..."
                    className="w-full border border-[var(--rule)] focus:border-[var(--ink)] bg-[var(--panel)] px-2.5 py-1.5 text-xs font-ser italic text-[var(--ink)] placeholder:text-[var(--mute)] focus:outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortlistDrawer;
