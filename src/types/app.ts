// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kunden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    nachname?: string;
    vorname?: string;
    firma?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    kunden_notizen?: string;
  };
}

export interface Vermietung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug?: string; // applookup -> URL zu 'Werkzeugbestand' Record
    kunde?: string; // applookup -> URL zu 'Kunden' Record
    mietbeginn?: string; // Format: YYYY-MM-DD oder ISO String
    mietende_geplant?: string; // Format: YYYY-MM-DD oder ISO String
    mietdauer_tage?: number;
    mietpreis_gesamt?: number;
    kaution_erhoben?: number;
    kaution_zurueck?: boolean;
    rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand_rueckgabe?: LookupValue;
    status?: LookupValue;
    bemerkungen?: string;
  };
}

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie_name?: string;
    kategorie_beschreibung?: string;
  };
}

export interface Werkzeugbestand {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    inventarnummer?: string;
    kategorie?: string; // applookup -> URL zu 'Kategorien' Record
    hersteller?: string;
    modell?: string;
    seriennummer?: string;
    anschaffungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    anschaffungspreis?: number;
    zustand?: LookupValue;
    standort?: string;
    vermietbar?: boolean;
    tagesmietpreis?: number;
    kaution_betrag?: number;
    foto?: string;
    notizen?: string;
  };
}

export const APP_IDS = {
  KUNDEN: '6a042a1ba7a8d8e74255c9ff',
  VERMIETUNG: '6a042a1c8096b95d0d74862a',
  KATEGORIEN: '6a042a14a5334cc38646d8f7',
  WERKZEUGBESTAND: '6a042a1bb2c32790b48628b1',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'vermietung': {
    zustand_rueckgabe: [{ key: "einwandfrei", label: "Einwandfrei" }, { key: "leichte_spuren", label: "Leichte Gebrauchsspuren" }, { key: "starke_spuren", label: "Starke Gebrauchsspuren" }, { key: "beschaedigt", label: "Beschaedigt" }, { key: "defekt", label: "Defekt" }],
    status: [{ key: "vermietet", label: "Vermietet" }, { key: "zurueckgegeben", label: "Zurueckgegeben" }, { key: "ueberfaellig", label: "Ueberfaellig" }, { key: "storniert", label: "Storniert" }],
  },
  'werkzeugbestand': {
    zustand: [{ key: "neu", label: "Neu" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "reparaturbeduerftig", label: "Reparaturbeduerftig" }, { key: "ausser_betrieb", label: "Ausser Betrieb" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kunden': {
    'nachname': 'string/text',
    'vorname': 'string/text',
    'firma': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'kunden_notizen': 'string/textarea',
  },
  'vermietung': {
    'werkzeug': 'applookup/select',
    'kunde': 'applookup/select',
    'mietbeginn': 'date/datetimeminute',
    'mietende_geplant': 'date/datetimeminute',
    'mietdauer_tage': 'number',
    'mietpreis_gesamt': 'number',
    'kaution_erhoben': 'number',
    'kaution_zurueck': 'bool',
    'rueckgabedatum': 'date/datetimeminute',
    'zustand_rueckgabe': 'lookup/select',
    'status': 'lookup/select',
    'bemerkungen': 'string/textarea',
  },
  'kategorien': {
    'kategorie_name': 'string/text',
    'kategorie_beschreibung': 'string/textarea',
  },
  'werkzeugbestand': {
    'bezeichnung': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'applookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'seriennummer': 'string/text',
    'anschaffungsdatum': 'date/date',
    'anschaffungspreis': 'number',
    'zustand': 'lookup/select',
    'standort': 'string/text',
    'vermietbar': 'bool',
    'tagesmietpreis': 'number',
    'kaution_betrag': 'number',
    'foto': 'file',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateVermietung = StripLookup<Vermietung['fields']>;
export type CreateKategorien = StripLookup<Kategorien['fields']>;
export type CreateWerkzeugbestand = StripLookup<Werkzeugbestand['fields']>;