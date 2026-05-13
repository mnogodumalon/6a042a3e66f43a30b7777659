import type { Vermietung, Werkzeugbestand } from './app';

export type EnrichedWerkzeugbestand = Werkzeugbestand & {
  kategorieName: string;
};

export type EnrichedVermietung = Vermietung & {
  werkzeugName: string;
  kundeName: string;
};
