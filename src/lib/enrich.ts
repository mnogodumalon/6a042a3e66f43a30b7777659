import type { EnrichedVermietung, EnrichedWerkzeugbestand } from '@/types/enriched';
import type { Kategorien, Kunden, Vermietung, Werkzeugbestand } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface VermietungMaps {
  werkzeugbestandMap: Map<string, Werkzeugbestand>;
  kundenMap: Map<string, Kunden>;
}

export function enrichVermietung(
  vermietung: Vermietung[],
  maps: VermietungMaps
): EnrichedVermietung[] {
  return vermietung.map(r => ({
    ...r,
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugbestandMap, 'bezeichnung'),
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'vorname', 'nachname'),
  }));
}

interface WerkzeugbestandMaps {
  kategorienMap: Map<string, Kategorien>;
}

export function enrichWerkzeugbestand(
  werkzeugbestand: Werkzeugbestand[],
  maps: WerkzeugbestandMaps
): EnrichedWerkzeugbestand[] {
  return werkzeugbestand.map(r => ({
    ...r,
    kategorieName: resolveDisplay(r.fields.kategorie, maps.kategorienMap, 'kategorie_name'),
  }));
}
