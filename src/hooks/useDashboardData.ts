import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kategorien, Werkzeugbestand, Kunden, Vermietung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [werkzeugbestand, setWerkzeugbestand] = useState<Werkzeugbestand[]>([]);
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [vermietung, setVermietung] = useState<Vermietung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kategorienData, werkzeugbestandData, kundenData, vermietungData] = await Promise.all([
        LivingAppsService.getKategorien(),
        LivingAppsService.getWerkzeugbestand(),
        LivingAppsService.getKunden(),
        LivingAppsService.getVermietung(),
      ]);
      setKategorien(kategorienData);
      setWerkzeugbestand(werkzeugbestandData);
      setKunden(kundenData);
      setVermietung(vermietungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kategorienData, werkzeugbestandData, kundenData, vermietungData] = await Promise.all([
          LivingAppsService.getKategorien(),
          LivingAppsService.getWerkzeugbestand(),
          LivingAppsService.getKunden(),
          LivingAppsService.getVermietung(),
        ]);
        setKategorien(kategorienData);
        setWerkzeugbestand(werkzeugbestandData);
        setKunden(kundenData);
        setVermietung(vermietungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kategorienMap = useMemo(() => {
    const m = new Map<string, Kategorien>();
    kategorien.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kategorien]);

  const werkzeugbestandMap = useMemo(() => {
    const m = new Map<string, Werkzeugbestand>();
    werkzeugbestand.forEach(r => m.set(r.record_id, r));
    return m;
  }, [werkzeugbestand]);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

  return { kategorien, setKategorien, werkzeugbestand, setWerkzeugbestand, kunden, setKunden, vermietung, setVermietung, loading, error, fetchAll, kategorienMap, werkzeugbestandMap, kundenMap };
}