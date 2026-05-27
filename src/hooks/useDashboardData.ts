import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kunden, Vermietung, Kategorien, Werkzeugbestand } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [vermietung, setVermietung] = useState<Vermietung[]>([]);
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [werkzeugbestand, setWerkzeugbestand] = useState<Werkzeugbestand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenData, vermietungData, kategorienData, werkzeugbestandData] = await Promise.all([
        LivingAppsService.getKunden(),
        LivingAppsService.getVermietung(),
        LivingAppsService.getKategorien(),
        LivingAppsService.getWerkzeugbestand(),
      ]);
      setKunden(kundenData);
      setVermietung(vermietungData);
      setKategorien(kategorienData);
      setWerkzeugbestand(werkzeugbestandData);
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
        const [kundenData, vermietungData, kategorienData, werkzeugbestandData] = await Promise.all([
          LivingAppsService.getKunden(),
          LivingAppsService.getVermietung(),
          LivingAppsService.getKategorien(),
          LivingAppsService.getWerkzeugbestand(),
        ]);
        setKunden(kundenData);
        setVermietung(vermietungData);
        setKategorien(kategorienData);
        setWerkzeugbestand(werkzeugbestandData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

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

  return { kunden, setKunden, vermietung, setVermietung, kategorien, setKategorien, werkzeugbestand, setWerkzeugbestand, loading, error, fetchAll, kundenMap, kategorienMap, werkzeugbestandMap };
}