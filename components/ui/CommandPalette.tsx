// @ts-nocheck
'use client';

import { useCommandPalette } from '@/hooks/useCommandPalette';
import { Command } from 'cmdk';

export default function CommandPalette() {
  const {
    open,
    setOpen,
    query,
    setQuery,
    actionItems,
    deliverySectionItems,
    loading,
    error,
    inputRef,
    onSelect,
  } = useCommandPalette();

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global command palette">
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
          <div className="border-b border-slate-200/70 p-4">
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search deliveries, settings, FAQ..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto bg-white">
            {loading ? (
              <div className="p-5 text-sm text-slate-500">Loading deliveries…</div>
            ) : error ? (
              <div className="p-5 text-sm text-red-600">{error}</div>
            ) : (
              <Command.List className="p-2">
                <Command.Empty className="px-4 py-3 text-sm text-slate-500">
                  No command matches your search.
                </Command.Empty>

                <Command.Group heading="Quick actions" className="px-2 py-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {actionItems.map((item) => (
                    <Command.Item
                      key={item.id}
                      onSelect={() => onSelect(item.path)}
                      className={({ active }: { active: boolean }) =>
                        `flex cursor-pointer flex-col rounded-xl px-4 py-3 text-sm transition ${
                          active ? 'bg-sky-500 text-white' : 'text-slate-900'
                        }`
                      }
                    >
                      <span>{item.title}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {deliverySectionItems.length > 0 && (
                  <Command.Group heading="Deliveries" className="px-2 py-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {deliverySectionItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        onSelect={() => onSelect(item.path)}
                        className={({ active }: { active: boolean }) =>
                          `flex cursor-pointer flex-col rounded-xl px-4 py-3 text-sm transition ${
                            active ? 'bg-sky-500 text-white' : 'text-slate-900'
                          }`
                        }
                      >
                        <span>{item.title}</span>
                        <span className="text-xs text-slate-500">{item.description}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            )}
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}
