import type { Vermietung, Werkzeugbestand } from './app';

export type EnrichedVermietung = Vermietung & {
  werkzeugName: string;
  kundeName: string;
};

export type EnrichedWerkzeugbestand = Werkzeugbestand & {
  kategorieName: string;
};
