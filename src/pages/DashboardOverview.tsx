import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWerkzeugbestand, enrichVermietung } from '@/lib/enrich';
import type { EnrichedWerkzeugbestand, EnrichedVermietung } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VermietungDialog } from '@/components/dialogs/VermietungDialog';
import { WerkzeugbestandDialog } from '@/components/dialogs/WerkzeugbestandDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconPlus, IconPencil, IconTrash, IconTool, IconUsers, IconCalendar,
  IconAlertCircle, IconRefresh, IconCheck, IconClock, IconArrowBack,
  IconPackage, IconCircleCheck, IconChevronRight,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a042a3e66f43a30b7777659';
const REPAIR_ENDPOINT = '/claude/build/repair';

type VermietungDialogMode = { mode: 'create'; werkzeugId?: string } | { mode: 'edit'; record: EnrichedVermietung } | null;

export default function DashboardOverview() {
  const {
    kategorien, werkzeugbestand, kunden, vermietung,
    kategorienMap, werkzeugbestandMap, kundenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedWerkzeugbestand = enrichWerkzeugbestand(werkzeugbestand, { kategorienMap });
  const enrichedVermietung = enrichVermietung(vermietung, { werkzeugbestandMap, kundenMap });

  const [vermietungDialog, setVermietungDialog] = useState<VermietungDialogMode>(null);
  const [werkzeugDialog, setWerkzeugDialog] = useState<{ open: boolean; record?: EnrichedWerkzeugbestand }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'vermietung' | 'werkzeug'; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'vermietung' | 'bestand'>('vermietung');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusGroups = useMemo(() => {
    const aktiv = enrichedVermietung.filter(v => v.fields.status?.key === 'vermietet');
    const ueberfaellig = enrichedVermietung.filter(v => {
      if (v.fields.status?.key === 'ueberfaellig') return true;
      if (v.fields.status?.key === 'vermietet' && v.fields.mietende_geplant) {
        const end = new Date(v.fields.mietende_geplant);
        return end < today;
      }
      return false;
    });
    const zurueck = enrichedVermietung.filter(v => v.fields.status?.key === 'zurueckgegeben');
    return { aktiv, ueberfaellig, zurueck };
  }, [enrichedVermietung, today]);

  const verfuegbareWerkzeuge = useMemo(() => {
    const vermietetIds = new Set(
      enrichedVermietung
        .filter(v => v.fields.status?.key === 'vermietet' || v.fields.status?.key === 'ueberfaellig')
        .map(v => v.fields.werkzeug ?? '')
    );
    return enrichedWerkzeugbestand.filter(w => !vermietetIds.has(
      createRecordUrl(APP_IDS.WERKZEUGBESTAND, w.record_id)
    ));
  }, [enrichedWerkzeugbestand, enrichedVermietung]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'vermietung') {
      await LivingAppsService.deleteVermietungEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deleteWerkzeugbestandEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/werkzeug-vermieten" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 no-underline">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <IconCalendar size={18} className="text-primary shrink-0" />
              <span className="font-semibold text-sm text-foreground">Werkzeug vermieten</span>
            </div>
            <p className="text-xs text-muted-foreground">Werkzeug auswählen, Kunde zuordnen, Mietdetails festlegen</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/werkzeug-rueckgabe" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 no-underline">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <IconArrowBack size={18} className="text-primary shrink-0" />
              <span className="font-semibold text-sm text-foreground">Werkzeug zurücknehmen</span>
            </div>
            <p className="text-xs text-muted-foreground">Rückgabe erfassen, Zustand prüfen, Kaution abrechnen</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>
      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Werkzeuge gesamt"
          value={String(werkzeugbestand.length)}
          description="Im Bestand"
          icon={<IconTool size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Vermietet"
          value={String(statusGroups.aktiv.length)}
          description="Aktive Vermietungen"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(statusGroups.ueberfaellig.length)}
          description="Nicht zurückgegeben"
          icon={<IconAlertCircle size={18} className={statusGroups.ueberfaellig.length > 0 ? 'text-red-500' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Kunden"
          value={String(kunden.length)}
          description="Registriert"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('vermietung')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vermietung' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Vermietungs-Board
        </button>
        <button
          onClick={() => setActiveTab('bestand')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bestand' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Werkzeugbestand ({werkzeugbestand.length})
        </button>
      </div>

      {activeTab === 'vermietung' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Aktuelle Vermietungen</h2>
            <Button size="sm" onClick={() => setVermietungDialog({ mode: 'create' })}>
              <IconPlus size={16} className="shrink-0 mr-1" />
              Neue Vermietung
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vermietet */}
            <KanbanColumn
              title="Vermietet"
              count={statusGroups.aktiv.length}
              colorClass="bg-blue-50 border-blue-200"
              headerColorClass="text-blue-700"
              icon={<IconClock size={16} className="text-blue-600 shrink-0" />}
              emptyText="Keine aktiven Vermietungen"
            >
              {statusGroups.aktiv.map(v => (
                <VermietungCard
                  key={v.record_id}
                  vermietung={v}
                  onEdit={() => setVermietungDialog({ mode: 'edit', record: v })}
                  onDelete={() => setDeleteTarget({ id: v.record_id, type: 'vermietung', name: v.werkzeugName || 'Vermietung' })}
                  variant="normal"
                />
              ))}
            </KanbanColumn>

            {/* Überfällig */}
            <KanbanColumn
              title="Überfällig"
              count={statusGroups.ueberfaellig.length}
              colorClass="bg-red-50 border-red-200"
              headerColorClass="text-red-700"
              icon={<IconAlertCircle size={16} className="text-red-600 shrink-0" />}
              emptyText="Keine überfälligen Rückgaben"
            >
              {statusGroups.ueberfaellig.map(v => (
                <VermietungCard
                  key={v.record_id}
                  vermietung={v}
                  onEdit={() => setVermietungDialog({ mode: 'edit', record: v })}
                  onDelete={() => setDeleteTarget({ id: v.record_id, type: 'vermietung', name: v.werkzeugName || 'Vermietung' })}
                  variant="urgent"
                />
              ))}
            </KanbanColumn>

            {/* Zurückgegeben */}
            <KanbanColumn
              title="Zurückgegeben"
              count={statusGroups.zurueck.length}
              colorClass="bg-green-50 border-green-200"
              headerColorClass="text-green-700"
              icon={<IconCircleCheck size={16} className="text-green-600 shrink-0" />}
              emptyText="Keine zurückgegebenen Werkzeuge"
            >
              {statusGroups.zurueck.map(v => (
                <VermietungCard
                  key={v.record_id}
                  vermietung={v}
                  onEdit={() => setVermietungDialog({ mode: 'edit', record: v })}
                  onDelete={() => setDeleteTarget({ id: v.record_id, type: 'vermietung', name: v.werkzeugName || 'Vermietung' })}
                  variant="done"
                />
              ))}
            </KanbanColumn>
          </div>

          {/* Verfügbare Werkzeuge */}
          {verfuegbareWerkzeuge.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <IconPackage size={14} className="shrink-0" />
                Verfügbare Werkzeuge ({verfuegbareWerkzeuge.length}) — Klicken zum Vermieten
              </h3>
              <div className="flex flex-wrap gap-2">
                {verfuegbareWerkzeuge.map(w => (
                  <button
                    key={w.record_id}
                    onClick={() => setVermietungDialog({
                      mode: 'create',
                      werkzeugId: w.record_id,
                    })}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-sm transition-colors"
                  >
                    <IconTool size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate max-w-[160px]">{w.fields.bezeichnung || '—'}</span>
                    {w.kategorieName && <span className="text-muted-foreground text-xs hidden sm:inline">· {w.kategorieName}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bestand' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Werkzeugbestand</h2>
            <Button size="sm" onClick={() => setWerkzeugDialog({ open: true })}>
              <IconPlus size={16} className="shrink-0 mr-1" />
              Werkzeug hinzufügen
            </Button>
          </div>

          {werkzeugbestand.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <IconTool size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-muted-foreground text-sm">Noch kein Werkzeug erfasst</p>
              <Button size="sm" onClick={() => setWerkzeugDialog({ open: true })}>
                <IconPlus size={14} className="mr-1" /> Erstes Werkzeug anlegen
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Bezeichnung</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Kategorie</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Hersteller</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Zustand</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Standort</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedWerkzeugbestand.map((w) => {
                    const isRented = !verfuegbareWerkzeuge.find(v => v.record_id === w.record_id);
                    return (
                      <tr key={w.record_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{w.fields.bezeichnung || '—'}</span>
                            {isRented && (
                              <Badge variant="secondary" className="text-xs shrink-0">vermietet</Badge>
                            )}
                          </div>
                          {w.fields.inventarnummer && (
                            <div className="text-xs text-muted-foreground">#{w.fields.inventarnummer}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">
                          {w.kategorieName || '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
                          {w.fields.hersteller || '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {w.fields.zustand ? (
                            <ZustandBadge zustand={w.fields.zustand.key} label={w.fields.zustand.label} />
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs truncate max-w-[120px]">
                          {w.fields.standort || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!isRented && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setVermietungDialog({ mode: 'create', werkzeugId: w.record_id })}
                              >
                                <IconCalendar size={13} className="shrink-0 mr-0.5" />
                                <span className="hidden sm:inline">Vermieten</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setWerkzeugDialog({ open: true, record: w })}
                            >
                              <IconPencil size={14} className="shrink-0" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: w.record_id, type: 'werkzeug', name: w.fields.bezeichnung || 'Werkzeug' })}
                            >
                              <IconTrash size={14} className="shrink-0" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vermietung Dialog */}
      {vermietungDialog && (
        <VermietungDialog
          open={true}
          onClose={() => setVermietungDialog(null)}
          onSubmit={async (fields) => {
            if (vermietungDialog.mode === 'edit') {
              await LivingAppsService.updateVermietungEntry(vermietungDialog.record.record_id, fields);
            } else {
              await LivingAppsService.createVermietungEntry(fields);
            }
            fetchAll();
          }}
          defaultValues={
            vermietungDialog.mode === 'edit'
              ? vermietungDialog.record.fields
              : vermietungDialog.werkzeugId
              ? { werkzeug: createRecordUrl(APP_IDS.WERKZEUGBESTAND, vermietungDialog.werkzeugId) }
              : undefined
          }
          werkzeugbestandList={werkzeugbestand}
          kundenList={kunden}
          enablePhotoScan={AI_PHOTO_SCAN['Vermietung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Vermietung']}
        />
      )}

      {/* Werkzeug Dialog */}
      <WerkzeugbestandDialog
        open={werkzeugDialog.open}
        onClose={() => setWerkzeugDialog({ open: false })}
        onSubmit={async (fields) => {
          if (werkzeugDialog.record) {
            await LivingAppsService.updateWerkzeugbestandEntry(werkzeugDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createWerkzeugbestandEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={werkzeugDialog.record?.fields}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeugbestand']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Werkzeugbestand']}
      />

      {/* Löschen-Bestätigung */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll "${deleteTarget?.name}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ---- Kanban Column ----

function KanbanColumn({
  title,
  count,
  colorClass,
  headerColorClass,
  icon,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  colorClass: string;
  headerColorClass: string;
  icon: React.ReactNode;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${colorClass} flex flex-col overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${colorClass}`}>
        {icon}
        <span className={`font-semibold text-sm ${headerColorClass}`}>{title}</span>
        <span className={`ml-auto text-xs font-bold ${headerColorClass} bg-white/60 rounded-full px-2 py-0.5`}>{count}</span>
      </div>
      <div className="flex flex-col gap-2 p-3 min-h-[120px]">
        {count === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground text-center">
            {emptyText}
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ---- Vermietung Card ----

function VermietungCard({
  vermietung,
  onEdit,
  onDelete,
  variant,
}: {
  vermietung: EnrichedVermietung;
  onEdit: () => void;
  onDelete: () => void;
  variant: 'normal' | 'urgent' | 'done';
}) {
  const bgClass = variant === 'urgent' ? 'bg-red-50 border-red-100' : variant === 'done' ? 'bg-green-50 border-green-100' : 'bg-white border-border';

  return (
    <div className={`rounded-lg border ${bgClass} p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{vermietung.werkzeugName || '—'}</div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <IconUsers size={11} className="shrink-0" />
            {vermietung.kundeName || '—'}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-black/5 transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 transition-colors"
            title="Löschen"
          >
            <IconTrash size={13} className="text-destructive" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {vermietung.fields.mietbeginn && (
          <span className="flex items-center gap-1">
            <IconCalendar size={11} className="shrink-0" />
            {formatDate(vermietung.fields.mietbeginn)}
          </span>
        )}
        {vermietung.fields.mietende_geplant && (
          <span className="flex items-center gap-1">
            <IconArrowBack size={11} className="shrink-0" />
            {formatDate(vermietung.fields.mietende_geplant)}
          </span>
        )}
        {vermietung.fields.mietpreis_gesamt != null && (
          <span className="font-medium text-foreground">{formatCurrency(vermietung.fields.mietpreis_gesamt)}</span>
        )}
      </div>
    </div>
  );
}

// ---- Zustand Badge ----

function ZustandBadge({ zustand, label }: { zustand: string; label: string }) {
  const colorMap: Record<string, string> = {
    neu: 'bg-green-100 text-green-700',
    gut: 'bg-blue-100 text-blue-700',
    gebraucht: 'bg-yellow-100 text-yellow-700',
    reparaturbeduerftig: 'bg-orange-100 text-orange-700',
    ausser_betrieb: 'bg-red-100 text-red-700',
  };
  const cls = colorMap[zustand] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ---- Skeleton & Error ----

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);
    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });
    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });
      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
