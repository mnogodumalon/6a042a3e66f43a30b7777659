import type { Vermietung, Werkzeugbestand, Kunden } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface VermietungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Vermietung | null;
  onEdit: (record: Vermietung) => void;
  werkzeugbestandList: Werkzeugbestand[];
  kundenList: Kunden[];
}

export function VermietungViewDialog({ open, onClose, record, onEdit, werkzeugbestandList, kundenList }: VermietungViewDialogProps) {
  function getWerkzeugbestandDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugbestandList.find(r => r.record_id === id)?.fields.bezeichnung ?? '—';
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vermietung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Werkzeug</Label>
            <p className="text-sm">{getWerkzeugbestandDisplayName(record.fields.werkzeug)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mietbeginn</Label>
            <p className="text-sm">{formatDate(record.fields.mietbeginn)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Mietende</Label>
            <p className="text-sm">{formatDate(record.fields.mietende_geplant)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mietdauer (Tage)</Label>
            <p className="text-sm">{record.fields.mietdauer_tage ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mietpreis gesamt (EUR)</Label>
            <p className="text-sm">{record.fields.mietpreis_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kaution erhoben (EUR)</Label>
            <p className="text-sm">{record.fields.kaution_erhoben ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kaution zurueckerstattet</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.kaution_zurueck ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.kaution_zurueck ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsaechliches Rueckgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.rueckgabedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand bei Rueckgabe</Label>
            <Badge variant="secondary">{record.fields.zustand_rueckgabe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.VERMIETUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}