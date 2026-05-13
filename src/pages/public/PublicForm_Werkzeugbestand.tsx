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
const APP_ID = '6a042a1bb2c32790b48628b1';
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

export default function PublicFormWerkzeugbestand() {
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
          <h1 className="text-2xl font-bold text-foreground">Werkzeugbestand — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="bezeichnung">Bezeichnung</Label>
            <Input
              id="bezeichnung"
              value={fields.bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventarnummer">Inventarnummer</Label>
            <Input
              id="inventarnummer"
              value={fields.inventarnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, inventarnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hersteller">Hersteller</Label>
            <Input
              id="hersteller"
              value={fields.hersteller ?? ''}
              onChange={e => setFields(f => ({ ...f, hersteller: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modell">Modell</Label>
            <Input
              id="modell"
              value={fields.modell ?? ''}
              onChange={e => setFields(f => ({ ...f, modell: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seriennummer">Seriennummer</Label>
            <Input
              id="seriennummer"
              value={fields.seriennummer ?? ''}
              onChange={e => setFields(f => ({ ...f, seriennummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anschaffungsdatum">Anschaffungsdatum</Label>
            <Input
              id="anschaffungsdatum"
              type="date"
              value={fields.anschaffungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, anschaffungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anschaffungspreis">Anschaffungspreis (EUR)</Label>
            <Input
              id="anschaffungspreis"
              type="number"
              value={fields.anschaffungspreis ?? ''}
              onChange={e => setFields(f => ({ ...f, anschaffungspreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand">Zustand</Label>
            <Select
              value={lookupKey(fields.zustand) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zustand: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zustand"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="neu">Neu</SelectItem>
                <SelectItem value="gut">Gut</SelectItem>
                <SelectItem value="gebraucht">Gebraucht</SelectItem>
                <SelectItem value="reparaturbeduerftig">Reparaturbeduerftig</SelectItem>
                <SelectItem value="ausser_betrieb">Ausser Betrieb</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort / Lagerort</Label>
            <Input
              id="standort"
              value={fields.standort ?? ''}
              onChange={e => setFields(f => ({ ...f, standort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vermietbar">Zur Vermietung verfuegbar</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="vermietbar"
                checked={!!fields.vermietbar}
                onCheckedChange={(v) => setFields(f => ({ ...f, vermietbar: !!v }))}
              />
              <Label htmlFor="vermietbar" className="font-normal">Zur Vermietung verfuegbar</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagesmietpreis">Tagesmietpreis (EUR)</Label>
            <Input
              id="tagesmietpreis"
              type="number"
              value={fields.tagesmietpreis ?? ''}
              onChange={e => setFields(f => ({ ...f, tagesmietpreis: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kaution_betrag">Kautionsbetrag (EUR)</Label>
            <Input
              id="kaution_betrag"
              type="number"
              value={fields.kaution_betrag ?? ''}
              onChange={e => setFields(f => ({ ...f, kaution_betrag: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
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
