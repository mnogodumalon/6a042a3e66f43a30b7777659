import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Werkzeugbestand, Kunden, Kategorien } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { WerkzeugbestandDialog } from '@/components/dialogs/WerkzeugbestandDialog';
import { KundenDialog } from '@/components/dialogs/KundenDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  IconTool,
  IconUsers,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconArrowLeft,
  IconCurrencyEuro,
  IconPlus,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Werkzeug' },
  { label: 'Kunde' },
  { label: 'Details' },
  { label: 'Abschluss' },
];

function getRoundedNow(): string {
  const now = new Date();
  const ms = 1000 * 60 * 30;
  const rounded = new Date(Math.ceil(now.getTime() / ms) * ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${rounded.getFullYear()}-${pad(rounded.getMonth() + 1)}-${pad(rounded.getDate())}T${pad(rounded.getHours())}:${pad(rounded.getMinutes())}`;
}

function calcDays(begin: string, end: string): number {
  if (!begin || !end) return 0;
  const diffMs = new Date(end).getTime() - new Date(begin).getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDateTimeDisplay(dt: string): string {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dt;
  }
}

export default function WerkzeugVermietenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Data state ---
  const [werkzeuge, setWerkzeuge] = useState<Werkzeugbestand[]>([]);
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [vermieteteIds, setVermieteteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // --- Wizard state ---
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  const [selectedWerkzeug, setSelectedWerkzeug] = useState<Werkzeugbestand | null>(null);
  const [selectedKunde, setSelectedKunde] = useState<Kunden | null>(null);

  // Step 3 form state
  const [mietbeginn, setMietbeginn] = useState(getRoundedNow);
  const [mietende, setMietende] = useState('');
  const [mietdauer, setMietdauer] = useState(0);
  const [mietpreis, setMietpreis] = useState(0);
  const [kaution, setKaution] = useState(0);
  const [bemerkungen, setBemerkungen] = useState('');

  // Dialog state
  const [werkzeugDialogOpen, setWerkzeugDialogOpen] = useState(false);
  const [kundenDialogOpen, setKundenDialogOpen] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [newVermietungId, setNewVermietungId] = useState<string | null>(null);

  // --- Load data ---
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wData, kData, katData, vData] = await Promise.all([
        LivingAppsService.getWerkzeugbestand(),
        LivingAppsService.getKunden(),
        LivingAppsService.getKategorien(),
        LivingAppsService.getVermietung(),
      ]);
      setWerkzeuge(wData);
      setKunden(kData);
      setKategorien(katData);

      // Compute vermietet IDs from active Vermietungen
      const activeStatuses = new Set(['vermietet', 'ueberfaellig']);
      const ids = new Set<string>();
      vData.forEach(v => {
        const statusKey = typeof v.fields.status === 'object' && v.fields.status !== null
          ? (v.fields.status as { key: string }).key
          : String(v.fields.status ?? '');
        if (activeStatuses.has(statusKey) && v.fields.werkzeug) {
          const rid = extractRecordId(v.fields.werkzeug);
          if (rid) ids.add(rid);
        }
      });
      setVermieteteIds(ids);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Deep-link: pre-select werkzeug or kunde from URL ---
  useEffect(() => {
    if (werkzeuge.length === 0) return;
    const wId = searchParams.get('werkzeugId');
    if (wId) {
      const found = werkzeuge.find(w => w.record_id === wId);
      if (found) {
        setSelectedWerkzeug(found);
        if (currentStep === 1) {
          handleStepChange(2);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [werkzeuge]);

  useEffect(() => {
    if (kunden.length === 0) return;
    const kId = searchParams.get('kundeId');
    if (kId) {
      const found = kunden.find(k => k.record_id === kId);
      if (found) {
        setSelectedKunde(found);
        if (currentStep === 2) {
          handleStepChange(3);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunden]);

  // --- Sync step to URL ---
  function handleStepChange(step: number) {
    setCurrentStep(step);
    const params = new URLSearchParams(searchParams);
    if (step > 1) {
      params.set('step', String(step));
    } else {
      params.delete('step');
    }
    setSearchParams(params, { replace: true });
  }

  // --- Step 3 recalculation ---
  useEffect(() => {
    const days = calcDays(mietbeginn, mietende);
    setMietdauer(days);
    const tagesmietpreis = selectedWerkzeug?.fields.tagesmietpreis ?? 0;
    setMietpreis(parseFloat((tagesmietpreis * days).toFixed(2)));
  }, [mietbeginn, mietende, selectedWerkzeug]);

  // When werkzeug selected, init kaution
  useEffect(() => {
    if (selectedWerkzeug) {
      setKaution(selectedWerkzeug.fields.kaution_betrag ?? 0);
    }
  }, [selectedWerkzeug]);

  // --- Filtered werkzeuge (vermietbar + not currently rented) ---
  const verfuegbareWerkzeuge = werkzeuge.filter(w =>
    w.fields.vermietbar === true && !vermieteteIds.has(w.record_id)
  );

  // --- Submit ---
  async function handleSubmit() {
    if (!selectedWerkzeug || !selectedKunde) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createVermietungEntry({
        werkzeug: createRecordUrl(APP_IDS.WERKZEUGBESTAND, selectedWerkzeug.record_id),
        kunde: createRecordUrl(APP_IDS.KUNDEN, selectedKunde.record_id),
        mietbeginn,
        mietende_geplant: mietende,
        mietdauer_tage: mietdauer,
        mietpreis_gesamt: mietpreis,
        kaution_erhoben: kaution,
        bemerkungen: bemerkungen || undefined,
        status: 'vermietet',
      });
      // Extract new record id from result
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        setNewVermietungId(entries[0][0]);
      }
      setSubmitSuccess(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // --- Reset wizard ---
  function resetWizard() {
    setSelectedWerkzeug(null);
    setSelectedKunde(null);
    setMietbeginn(getRoundedNow());
    setMietende('');
    setMietdauer(0);
    setMietpreis(0);
    setKaution(0);
    setBemerkungen('');
    setSubmitSuccess(false);
    setSubmitError(null);
    setNewVermietungId(null);
    handleStepChange(1);
  }

  // --- Step 1: select werkzeug ---
  function handleSelectWerkzeug(id: string) {
    const w = werkzeuge.find(x => x.record_id === id);
    if (w) {
      setSelectedWerkzeug(w);
      setKaution(w.fields.kaution_betrag ?? 0);
      handleStepChange(2);
    }
  }

  // --- Step 2: select kunde ---
  function handleSelectKunde(id: string) {
    const k = kunden.find(x => x.record_id === id);
    if (k) {
      setSelectedKunde(k);
      handleStepChange(3);
    }
  }

  // --- Render ---
  return (
    <IntentWizardShell
      title="Werkzeug vermieten"
      subtitle="Erstelle eine neue Vermietung in wenigen Schritten."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* STEP 1 — Werkzeug auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconTool size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Werkzeug auswählen</h2>
              <p className="text-xs text-muted-foreground">
                Nur verfügbare, vermietbare Werkzeuge werden angezeigt.
              </p>
            </div>
          </div>

          <EntitySelectStep
            items={verfuegbareWerkzeuge.map(w => ({
              id: w.record_id,
              title: w.fields.bezeichnung ?? '(Ohne Name)',
              subtitle: [w.fields.hersteller, w.fields.modell].filter(Boolean).join(' ') || undefined,
              icon: <IconTool size={18} className="text-primary" />,
              stats: [
                { label: 'Tagesmietpreis', value: w.fields.tagesmietpreis != null ? formatCurrency(w.fields.tagesmietpreis) : '—' },
                { label: 'Kaution', value: w.fields.kaution_betrag != null ? formatCurrency(w.fields.kaution_betrag) : '—' },
                { label: 'Zustand', value: w.fields.zustand?.label ?? '—' },
              ],
            }))}
            onSelect={handleSelectWerkzeug}
            searchPlaceholder="Werkzeug suchen..."
            emptyIcon={<IconTool size={32} />}
            emptyText="Keine verfügbaren Werkzeuge gefunden."
            createLabel="Neues Werkzeug anlegen"
            onCreateNew={() => setWerkzeugDialogOpen(true)}
            createDialog={
              <WerkzeugbestandDialog
                open={werkzeugDialogOpen}
                onClose={() => setWerkzeugDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createWerkzeugbestandEntry(fields);
                  await fetchAll();
                }}
                kategorienList={kategorien}
                enablePhotoScan={false}
                enablePhotoLocation={false}
              />
            }
          />
        </div>
      )}

      {/* STEP 2 — Kunde auswählen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <IconUsers size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Kunde auswählen</h2>
                <p className="text-xs text-muted-foreground">
                  Für welchen Kunden wird das Werkzeug vermietet?
                </p>
              </div>
            </div>
          </div>

          {/* Selected werkzeug reminder */}
          {selectedWerkzeug && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm">
              <IconTool size={14} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Werkzeug:</span>
              <span className="font-medium truncate">{selectedWerkzeug.fields.bezeichnung}</span>
              <button
                onClick={() => handleStepChange(1)}
                className="ml-auto text-xs text-primary hover:underline shrink-0"
              >
                Ändern
              </button>
            </div>
          )}

          <EntitySelectStep
            items={kunden.map(k => ({
              id: k.record_id,
              title: [k.fields.nachname, k.fields.vorname].filter(Boolean).join(', ') || '(Ohne Name)',
              subtitle: k.fields.firma || k.fields.email || undefined,
              icon: <IconUsers size={18} className="text-primary" />,
              stats: [
                { label: 'PLZ/Ort', value: [k.fields.plz, k.fields.ort].filter(Boolean).join(' ') || '—' },
              ],
            }))}
            onSelect={handleSelectKunde}
            searchPlaceholder="Kunden suchen..."
            emptyIcon={<IconUsers size={32} />}
            emptyText="Keine Kunden gefunden."
            createLabel="Neuen Kunden anlegen"
            onCreateNew={() => setKundenDialogOpen(true)}
            createDialog={
              <KundenDialog
                open={kundenDialogOpen}
                onClose={() => setKundenDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createKundenEntry(fields);
                  await fetchAll();
                }}
                enablePhotoScan={false}
                enablePhotoLocation={false}
              />
            }
          />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleStepChange(1)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Mietdetails */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconCalendar size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Mietdetails & Kalkulation</h2>
              <p className="text-xs text-muted-foreground">
                Gib den Mietzeitraum und die Konditionen ein.
              </p>
            </div>
          </div>

          {/* Context pills */}
          <div className="flex flex-wrap gap-2">
            {selectedWerkzeug && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                <IconTool size={12} className="text-muted-foreground" />
                <span className="font-medium">{selectedWerkzeug.fields.bezeichnung}</span>
                <button onClick={() => handleStepChange(1)} className="text-primary hover:underline ml-1">Ändern</button>
              </div>
            )}
            {selectedKunde && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                <IconUsers size={12} className="text-muted-foreground" />
                <span className="font-medium">
                  {[selectedKunde.fields.nachname, selectedKunde.fields.vorname].filter(Boolean).join(', ')}
                </span>
                <button onClick={() => handleStepChange(2)} className="text-primary hover:underline ml-1">Ändern</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mietbeginn">Mietbeginn</Label>
              <Input
                id="mietbeginn"
                type="datetime-local"
                value={mietbeginn}
                onChange={e => setMietbeginn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mietende">Mietende (geplant)</Label>
              <Input
                id="mietende"
                type="datetime-local"
                value={mietende}
                min={mietbeginn}
                onChange={e => setMietende(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mietdauer">Mietdauer (Tage)</Label>
              <Input
                id="mietdauer"
                type="number"
                min={0}
                value={mietdauer}
                onChange={e => setMietdauer(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mietpreis">
                <IconCurrencyEuro size={13} className="inline mr-1" />
                Mietpreis gesamt (€)
              </Label>
              <Input
                id="mietpreis"
                type="number"
                min={0}
                step={0.01}
                value={mietpreis}
                onChange={e => setMietpreis(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kaution">Kaution erhoben (€)</Label>
              <Input
                id="kaution"
                type="number"
                min={0}
                step={0.01}
                value={kaution}
                onChange={e => setKaution(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bemerkungen">Bemerkungen</Label>
            <Textarea
              id="bemerkungen"
              placeholder="Optionale Hinweise zur Vermietung..."
              value={bemerkungen}
              onChange={e => setBemerkungen(e.target.value)}
              rows={3}
            />
          </div>

          {/* Live feedback panel */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kalkulation</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Werkzeug</p>
                <p className="font-medium truncate">{selectedWerkzeug?.fields.bezeichnung ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tagesmietpreis</p>
                <p className="font-medium">
                  {selectedWerkzeug?.fields.tagesmietpreis != null
                    ? formatCurrency(selectedWerkzeug.fields.tagesmietpreis)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Berechnete Tage</p>
                <p className="font-medium">{mietdauer > 0 ? `${mietdauer} Tag${mietdauer !== 1 ? 'e' : ''}` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gesamtpreis</p>
                <p className="font-semibold text-primary">{formatCurrency(mietpreis)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Kaution</p>
                <p className="font-medium">{formatCurrency(kaution)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleStepChange(2)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button
              onClick={() => handleStepChange(4)}
              disabled={!mietbeginn || !mietende || mietdauer <= 0}
              className="gap-1.5 ml-auto"
            >
              Weiter zur Bestätigung
              <IconChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4 — Bestätigung & Abschluss */}
      {currentStep === 4 && (
        <div className="space-y-5">
          {!submitSuccess ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconCheck size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Vermietung bestätigen</h2>
                  <p className="text-xs text-muted-foreground">
                    Bitte prüfe alle Angaben und lege die Vermietung an.
                  </p>
                </div>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zusammenfassung</p>
                </div>
                <div className="divide-y">
                  <SummaryRow icon={<IconTool size={15} />} label="Werkzeug" value={selectedWerkzeug?.fields.bezeichnung ?? '—'} />
                  <SummaryRow
                    icon={<IconUsers size={15} />}
                    label="Kunde"
                    value={
                      selectedKunde
                        ? [selectedKunde.fields.nachname, selectedKunde.fields.vorname].filter(Boolean).join(', ')
                        : '—'
                    }
                  />
                  <SummaryRow icon={<IconCalendar size={15} />} label="Mietbeginn" value={formatDateTimeDisplay(mietbeginn)} />
                  <SummaryRow icon={<IconCalendar size={15} />} label="Mietende (geplant)" value={formatDateTimeDisplay(mietende)} />
                  <SummaryRow
                    icon={<IconCalendar size={15} />}
                    label="Mietdauer"
                    value={`${mietdauer} Tag${mietdauer !== 1 ? 'e' : ''}`}
                  />
                  <SummaryRow icon={<IconCurrencyEuro size={15} />} label="Mietpreis gesamt" value={formatCurrency(mietpreis)} highlight />
                  <SummaryRow icon={<IconCurrencyEuro size={15} />} label="Kaution erhoben" value={formatCurrency(kaution)} />
                  {bemerkungen && (
                    <SummaryRow icon={<IconChevronRight size={15} />} label="Bemerkungen" value={bemerkungen} />
                  )}
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => handleStepChange(3)} disabled={submitting} className="gap-1.5">
                  <IconArrowLeft size={15} />
                  Zurück
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedWerkzeug || !selectedKunde}
                  className="gap-1.5 ml-auto"
                >
                  {submitting ? (
                    <>Wird angelegt...</>
                  ) : (
                    <>
                      <IconCheck size={15} />
                      Vermietung anlegen
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="flex flex-col items-center text-center py-12 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <IconCheck size={32} className="text-green-600" stroke={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Vermietung erfolgreich angelegt!</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Die Vermietung für <strong>{selectedWerkzeug?.fields.bezeichnung}</strong> wurde erstellt.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <a
                  href="/#/vermietung"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Zur Vermietungs-Übersicht
                  <IconChevronRight size={14} />
                </a>
                <Button onClick={resetWizard} className="flex-1 gap-1.5">
                  <IconPlus size={15} />
                  Neue Vermietung
                </Button>
              </div>
              {newVermietungId && (
                <p className="text-xs text-muted-foreground">
                  Datensatz-ID: <span className="font-mono">{newVermietungId}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}

// Helper component for summary rows
function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={`text-sm font-medium truncate min-w-0 ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
