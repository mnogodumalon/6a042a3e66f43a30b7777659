import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a042a1c8096b95d0d74862a';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormVermietung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Vermietung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="mietbeginn">Mietbeginn</Label>
            <DatePicker
              id="mietbeginn"
              placeholder=""
              mode="datetime"
              value={fields.mietbeginn ?? null}
              onChange={v => setFields(f => ({ ...f, mietbeginn: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietende_geplant">Geplantes Mietende</Label>
            <DatePicker
              id="mietende_geplant"
              placeholder=""
              mode="datetime"
              value={fields.mietende_geplant ?? null}
              onChange={v => setFields(f => ({ ...f, mietende_geplant: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietdauer_tage">Mietdauer (Tage)</Label>
            <Input
              id="mietdauer_tage"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.mietdauer_tage ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, mietdauer_tage: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietpreis_gesamt">Mietpreis gesamt (EUR)</Label>
            <Input
              id="mietpreis_gesamt"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.mietpreis_gesamt ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, mietpreis_gesamt: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaution_erhoben">Kaution erhoben (EUR)</Label>
            <Input
              id="kaution_erhoben"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.kaution_erhoben ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, kaution_erhoben: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaution_zurueck">Kaution zurueckerstattet</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="kaution_zurueck"
                checked={!!fields.kaution_zurueck}
                onCheckedChange={(v) => setFields(f => ({ ...f, kaution_zurueck: !!v }))}
              />
              <Label htmlFor="kaution_zurueck" className="font-normal">Kaution zurueckerstattet</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rueckgabedatum">Tatsaechliches Rueckgabedatum</Label>
            <DatePicker
              id="rueckgabedatum"
              placeholder=""
              mode="datetime"
              value={fields.rueckgabedatum ?? null}
              onChange={v => setFields(f => ({ ...f, rueckgabedatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand_rueckgabe">Zustand bei Rueckgabe</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand_rueckgabe) === 'einwandfrei'}
                onClick={() => setFields(f => ({ ...f, zustand_rueckgabe: (lookupKey(f.zustand_rueckgabe) === 'einwandfrei' ? undefined : 'einwandfrei') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand_rueckgabe) === 'einwandfrei'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Einwandfrei
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand_rueckgabe) === 'leichte_spuren'}
                onClick={() => setFields(f => ({ ...f, zustand_rueckgabe: (lookupKey(f.zustand_rueckgabe) === 'leichte_spuren' ? undefined : 'leichte_spuren') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand_rueckgabe) === 'leichte_spuren'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Leichte Gebrauchsspuren
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand_rueckgabe) === 'starke_spuren'}
                onClick={() => setFields(f => ({ ...f, zustand_rueckgabe: (lookupKey(f.zustand_rueckgabe) === 'starke_spuren' ? undefined : 'starke_spuren') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand_rueckgabe) === 'starke_spuren'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Starke Gebrauchsspuren
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand_rueckgabe) === 'beschaedigt'}
                onClick={() => setFields(f => ({ ...f, zustand_rueckgabe: (lookupKey(f.zustand_rueckgabe) === 'beschaedigt' ? undefined : 'beschaedigt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand_rueckgabe) === 'beschaedigt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Beschaedigt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand_rueckgabe) === 'defekt'}
                onClick={() => setFields(f => ({ ...f, zustand_rueckgabe: (lookupKey(f.zustand_rueckgabe) === 'defekt' ? undefined : 'defekt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand_rueckgabe) === 'defekt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Defekt
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'vermietet'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'vermietet' ? undefined : 'vermietet') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'vermietet'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Vermietet
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'zurueckgegeben'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'zurueckgegeben' ? undefined : 'zurueckgegeben') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'zurueckgegeben'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Zurueckgegeben
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'ueberfaellig'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'ueberfaellig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ueberfaellig
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'storniert'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'storniert' ? undefined : 'storniert') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'storniert'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Storniert
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen">Bemerkungen</Label>
            <Textarea
              id="bemerkungen"
              placeholder=""
              value={fields.bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkungen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
