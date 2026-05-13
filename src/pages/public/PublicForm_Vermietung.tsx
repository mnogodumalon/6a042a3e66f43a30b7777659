import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
            <Input
              id="mietbeginn"
              type="datetime-local"
              step="60"
              value={fields.mietbeginn ?? ''}
              onChange={e => setFields(f => ({ ...f, mietbeginn: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietende_geplant">Geplantes Mietende</Label>
            <Input
              id="mietende_geplant"
              type="datetime-local"
              step="60"
              value={fields.mietende_geplant ?? ''}
              onChange={e => setFields(f => ({ ...f, mietende_geplant: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietdauer_tage">Mietdauer (Tage)</Label>
            <Input
              id="mietdauer_tage"
              type="number"
              value={fields.mietdauer_tage ?? ''}
              onChange={e => setFields(f => ({ ...f, mietdauer_tage: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mietpreis_gesamt">Mietpreis gesamt (EUR)</Label>
            <Input
              id="mietpreis_gesamt"
              type="number"
              value={fields.mietpreis_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, mietpreis_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaution_erhoben">Kaution erhoben (EUR)</Label>
            <Input
              id="kaution_erhoben"
              type="number"
              value={fields.kaution_erhoben ?? ''}
              onChange={e => setFields(f => ({ ...f, kaution_erhoben: e.target.value ? Number(e.target.value) : undefined }))}
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
            <Input
              id="rueckgabedatum"
              type="datetime-local"
              step="60"
              value={fields.rueckgabedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, rueckgabedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand_rueckgabe">Zustand bei Rueckgabe</Label>
            <Select
              value={lookupKey(fields.zustand_rueckgabe) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zustand_rueckgabe: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zustand_rueckgabe"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="einwandfrei">Einwandfrei</SelectItem>
                <SelectItem value="leichte_spuren">Leichte Gebrauchsspuren</SelectItem>
                <SelectItem value="starke_spuren">Starke Gebrauchsspuren</SelectItem>
                <SelectItem value="beschaedigt">Beschaedigt</SelectItem>
                <SelectItem value="defekt">Defekt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={lookupKey(fields.status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="vermietet">Vermietet</SelectItem>
                <SelectItem value="zurueckgegeben">Zurueckgegeben</SelectItem>
                <SelectItem value="ueberfaellig">Ueberfaellig</SelectItem>
                <SelectItem value="storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen">Bemerkungen</Label>
            <Textarea
              id="bemerkungen"
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
