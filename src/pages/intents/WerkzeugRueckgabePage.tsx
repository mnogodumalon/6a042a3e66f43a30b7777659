import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Vermietung, Werkzeugbestand, Kunden } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  IconTool,
  IconUsers,
  IconCalendar,
  IconCurrencyEuro,
  IconCheck,
  IconAlertCircle,
  IconArrowBack,
} from '@tabler/icons-react';

const STEPS = [
  { label: 'Vermietung' },
  { label: 'Zustand' },
  { label: 'Abschluss' },
];

function nowDatetimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function WerkzeugRueckgabePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // All hooks before any early returns
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [vermietungen, setVermietungen] = useState<Vermietung[]>([]);
  const [werkzeugMap, setWerkzeugMap] = useState<Record<string, Werkzeugbestand>>({});
  const [kundenMap, setKundenMap] = useState<Record<string, Kunden>>({});

  // Wizard state
  const initialStep = (() => {
    const p = parseInt(searchParams.get('step') ?? '', 10);
    return p >= 1 && p <= 3 ? p : 1;
  })();
  const [step, setStep] = useState(initialStep);

  const [selectedVermietungId, setSelectedVermietungId] = useState<string | null>(
    searchParams.get('vermietungId') ?? null
  );

  // Step 2 form state
  const [rueckgabedatum, setRueckgabedatum] = useState(nowDatetimeLocal());
  const [zustandKey, setZustandKey] = useState('einwandfrei');
  const [kautionZurueck, setKautionZurueck] = useState(true);
  const [bemerkungen, setBemerkungen] = useState('');

  // Step 3 state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    if (selectedVermietungId) {
      params.set('vermietungId', selectedVermietungId);
    } else {
      params.delete('vermietungId');
    }
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedVermietungId]);

  // Auto-advance to step 2 if vermietungId is in URL
  useEffect(() => {
    const vid = searchParams.get('vermietungId');
    if (vid && step === 1) {
      setSelectedVermietungId(vid);
      setStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vResult, wResult, kResult] = await Promise.all([
        LivingAppsService.getVermietung(),
        LivingAppsService.getWerkzeugbestand(),
        LivingAppsService.getKunden(),
      ]);
      setVermietungen(vResult);

      const wMap: Record<string, Werkzeugbestand> = {};
      for (const w of wResult) {
        wMap[w.record_id] = w;
      }
      setWerkzeugMap(wMap);

      const kMap: Record<string, Kunden> = {};
      for (const k of kResult) {
        kMap[k.record_id] = k;
      }
      setKundenMap(kMap);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived data
  const aktiveVermietungen = useMemo(
    () => vermietungen.filter(v => {
      const sk = v.fields.status?.key;
      return sk === 'vermietet' || sk === 'ueberfaellig';
    }),
    [vermietungen]
  );

  const selectedVermietung = useMemo(
    () => (selectedVermietungId ? vermietungen.find(v => v.record_id === selectedVermietungId) ?? null : null),
    [vermietungen, selectedVermietungId]
  );

  const selectedWerkzeug = useMemo(() => {
    if (!selectedVermietung?.fields.werkzeug) return null;
    const wid = extractRecordId(selectedVermietung.fields.werkzeug);
    return wid ? (werkzeugMap[wid] ?? null) : null;
  }, [selectedVermietung, werkzeugMap]);

  const selectedKunde = useMemo(() => {
    if (!selectedVermietung?.fields.kunde) return null;
    const kid = extractRecordId(selectedVermietung.fields.kunde);
    return kid ? (kundenMap[kid] ?? null) : null;
  }, [selectedVermietung, kundenMap]);

  const zustandOptions = LOOKUP_OPTIONS['vermietung']?.['zustand_rueckgabe'] ?? [];
  const zustandLabel = zustandOptions.find(o => o.key === zustandKey)?.label ?? zustandKey;

  const isSchadenZustand = zustandKey === 'beschaedigt' || zustandKey === 'defekt';

  // Auto-set kaution_zurueck based on zustand
  useEffect(() => {
    if (isSchadenZustand) {
      setKautionZurueck(false);
    } else if (zustandKey === 'einwandfrei' || zustandKey === 'leichte_spuren') {
      setKautionZurueck(true);
    }
  }, [zustandKey, isSchadenZustand]);

  const handleSelectVermietung = (id: string) => {
    setSelectedVermietungId(id);
    setRueckgabedatum(nowDatetimeLocal());
    setZustandKey('einwandfrei');
    setKautionZurueck(true);
    setBemerkungen('');
    setSubmitError(null);
    setSuccess(false);
    setStep(2);
  };

  const handleWeiterZuAbschluss = () => {
    setStep(3);
  };

  const handleAbschluss = async () => {
    if (!selectedVermietungId || !selectedVermietung) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const bestehendeBemerkungen = selectedVermietung.fields.bemerkungen ?? '';
      const neueBemerkungen = bemerkungen.trim()
        ? bestehendeBemerkungen
          ? `${bestehendeBemerkungen} | ${bemerkungen.trim()}`
          : bemerkungen.trim()
        : bestehendeBemerkungen;

      await LivingAppsService.updateVermietungEntry(selectedVermietungId, {
        rueckgabedatum: rueckgabedatum,
        zustand_rueckgabe: zustandKey,
        kaution_zurueck: kautionZurueck,
        status: 'zurueckgegeben',
        ...(neueBemerkungen ? { bemerkungen: neueBemerkungen } : {}),
      });
      setSuccess(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNeueRueckgabe = () => {
    setSelectedVermietungId(null);
    setRueckgabedatum(nowDatetimeLocal());
    setZustandKey('einwandfrei');
    setKautionZurueck(true);
    setBemerkungen('');
    setSubmitError(null);
    setSuccess(false);
    setStep(1);
    fetchAll();
  };

  const werkzeugName = selectedWerkzeug?.fields.bezeichnung ?? '—';
  const kundeName = selectedKunde
    ? [selectedKunde.fields.vorname, selectedKunde.fields.nachname].filter(Boolean).join(' ') ||
      selectedKunde.fields.firma ||
      '—'
    : '—';

  return (
    <IntentWizardShell
      title="Werkzeug-Rückgabe"
      subtitle="Rückgabe einer aktiven Vermietung abwickeln"
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Schritt 1: Vermietung auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Aktive Vermietung auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle die Vermietung aus, für die du eine Rückgabe erfassen möchtest.
            </p>
          </div>
          {aktiveVermietungen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <IconTool size={40} stroke={1.5} className="opacity-30" />
              <p className="text-sm">Keine aktiven Vermietungen vorhanden.</p>
            </div>
          ) : (
            <EntitySelectStep
              items={aktiveVermietungen.map(v => {
                const wid = extractRecordId(v.fields.werkzeug);
                const kid = extractRecordId(v.fields.kunde);
                const wName = wid ? (werkzeugMap[wid]?.fields.bezeichnung ?? '—') : '—';
                const k = kid ? kundenMap[kid] : undefined;
                const kName = k
                  ? [k.fields.vorname, k.fields.nachname].filter(Boolean).join(' ') || k.fields.firma || '—'
                  : '—';
                return {
                  id: v.record_id,
                  title: wName,
                  subtitle: kName,
                  status: v.fields.status
                    ? { key: v.fields.status.key, label: v.fields.status.label }
                    : undefined,
                  stats: [
                    { label: 'Mietbeginn', value: formatDate(v.fields.mietbeginn ?? '') },
                    { label: 'Rückgabe geplant', value: formatDate(v.fields.mietende_geplant ?? '') },
                    { label: 'Betrag', value: formatCurrency(v.fields.mietpreis_gesamt ?? 0) },
                  ],
                  icon: <IconTool size={20} className="text-primary" />,
                };
              })}
              onSelect={handleSelectVermietung}
              searchPlaceholder="Werkzeug oder Kunde suchen..."
              emptyText="Keine passende Vermietung gefunden."
              emptyIcon={<IconTool size={32} stroke={1.5} />}
            />
          )}
        </div>
      )}

      {/* Schritt 2: Zustand & Rückgabedaten */}
      {step === 2 && selectedVermietung && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Zustand & Rückgabedaten</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Erfasse den Zustand des zurückgegebenen Werkzeugs.
            </p>
          </div>

          {/* Info-Panel */}
          <div className="rounded-2xl border bg-card p-4 space-y-3 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground">Mietdetails</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <IconTool size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Werkzeug</p>
                  <p className="font-medium truncate">{werkzeugName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconUsers size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Kunde</p>
                  <p className="font-medium truncate">{kundeName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCalendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Mietbeginn</p>
                  <p className="font-medium">{formatDate(selectedVermietung.fields.mietbeginn ?? '')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCalendar size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Rückgabe geplant</p>
                  <p className="font-medium">{formatDate(selectedVermietung.fields.mietende_geplant ?? '')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCurrencyEuro size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Gesamtbetrag</p>
                  <p className="font-medium">{formatCurrency(selectedVermietung.fields.mietpreis_gesamt ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCurrencyEuro size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Erhobene Kaution</p>
                  <p className="font-medium">{formatCurrency(selectedVermietung.fields.kaution_erhoben ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formular */}
          <div className="rounded-2xl border bg-card p-4 space-y-5 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground">Rückgabe erfassen</h3>

            {/* Rückgabedatum */}
            <div className="space-y-1.5">
              <Label htmlFor="rueckgabedatum" className="text-sm font-medium">
                Rückgabedatum
              </Label>
              <input
                id="rueckgabedatum"
                type="datetime-local"
                value={rueckgabedatum}
                onChange={e => setRueckgabedatum(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Zustand bei Rückgabe */}
            <div className="space-y-1.5">
              <Label htmlFor="zustand" className="text-sm font-medium">
                Zustand bei Rückgabe
              </Label>
              <select
                id="zustand"
                value={zustandKey}
                onChange={e => setZustandKey(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {zustandOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warnung bei Schaden */}
            {isSchadenZustand && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <IconAlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Achtung:</strong> Bei diesem Zustand kann die Kaution ggf. einbehalten werden.
                </p>
              </div>
            )}

            {/* Kaution zurückgeben */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="kaution"
                checked={kautionZurueck}
                onCheckedChange={checked => setKautionZurueck(checked === true)}
              />
              <Label htmlFor="kaution" className="text-sm font-medium cursor-pointer">
                Kaution zurückgeben
              </Label>
            </div>

            {/* Bemerkungen */}
            <div className="space-y-1.5">
              <Label htmlFor="bemerkungen" className="text-sm font-medium">
                Bemerkungen <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="bemerkungen"
                placeholder="Zusätzliche Hinweise zur Rückgabe..."
                value={bemerkungen}
                onChange={e => setBemerkungen(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="w-full sm:w-auto gap-2"
            >
              <IconArrowBack size={16} />
              Zurück
            </Button>
            <Button
              onClick={handleWeiterZuAbschluss}
              disabled={!rueckgabedatum || !zustandKey}
              className="w-full sm:flex-1 gap-2"
            >
              Weiter zur Kautionsabrechnung
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 3: Abschluss & Kautionsabrechnung */}
      {step === 3 && selectedVermietung && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Abschluss & Kautionsabrechnung</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Prüfe alle Angaben und schließe die Rückgabe ab.
            </p>
          </div>

          {success ? (
            /* Erfolgsmeldung */
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-10 gap-4 rounded-2xl border bg-green-50 border-green-200">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <IconCheck size={28} className="text-green-600" stroke={2.5} />
                </div>
                <div className="text-center px-4">
                  <h3 className="text-lg font-semibold text-green-800">Rückgabe erfolgreich abgeschlossen!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    {werkzeugName} wurde von {kundeName} zurückgegeben.
                  </p>
                  {kautionZurueck ? (
                    <p className="text-sm font-medium text-green-700 mt-2">
                      Kaution zurückgegeben: {formatCurrency(selectedVermietung.fields.kaution_erhoben ?? 0)}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-red-600 mt-2">
                      Kaution einbehalten: {formatCurrency(selectedVermietung.fields.kaution_erhoben ?? 0)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href="/#/vermietung">Zur Vermietungs-Übersicht</a>
                </Button>
                <Button onClick={handleNeueRueckgabe} className="w-full sm:flex-1 gap-2">
                  <IconArrowBack size={16} />
                  Nächste Rückgabe
                </Button>
              </div>
            </div>
          ) : (
            /* Zusammenfassung */
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-4 space-y-4 overflow-hidden">
                <h3 className="text-sm font-semibold text-foreground">Zusammenfassung</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Werkzeug</span>
                    <span className="font-medium max-w-[60%] text-right truncate">{werkzeugName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Kunde</span>
                    <span className="font-medium max-w-[60%] text-right truncate">{kundeName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Rückgabedatum</span>
                    <span className="font-medium">
                      {rueckgabedatum
                        ? rueckgabedatum.replace('T', ' ') + ' Uhr'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Zustand</span>
                    <span className={`font-medium ${isSchadenZustand ? 'text-amber-700' : 'text-foreground'}`}>
                      {zustandLabel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Kaution</span>
                    <span className={`font-semibold ${kautionZurueck ? 'text-green-600' : 'text-red-600'}`}>
                      {kautionZurueck ? 'Wird zurückgegeben' : 'Wird einbehalten'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kautionsanzeige prominent */}
              {kautionZurueck ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                  <IconCurrencyEuro size={22} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Kaution zurückgegeben: {formatCurrency(selectedVermietung.fields.kaution_erhoben ?? 0)}
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">Der Betrag wird dem Kunden erstattet.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                  <IconCurrencyEuro size={22} className="text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Kaution einbehalten: {formatCurrency(selectedVermietung.fields.kaution_erhoben ?? 0)}
                    </p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Aufgrund des Zustands wird die Kaution einbehalten.
                    </p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                  <IconAlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto gap-2"
                  disabled={submitting}
                >
                  <IconArrowBack size={16} />
                  Zurück
                </Button>
                <Button
                  onClick={handleAbschluss}
                  disabled={submitting}
                  className="w-full sm:flex-1 gap-2"
                >
                  {submitting ? (
                    'Wird gespeichert...'
                  ) : (
                    <>
                      <IconCheck size={16} />
                      Rückgabe abschließen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
