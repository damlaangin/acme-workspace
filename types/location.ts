export interface Currency {
  id: number; // integer
  name: string; // Max length: 255
  code: string; // Pattern: ^[A-Z]{3}$, Max length: 3
  symbol: string; // Max length: 10
}

export interface Country {
  id: number; // integer
  name: string; // Max length: 255
  iso3: string; // Pattern: ^[A-Z]{3}$, Max length: 3
  iso2: string; // Pattern: ^[A-Z]{2}$, Max length: 2
  currency: Currency; // Reference to Currency
}

export interface State {
  id: number; // integer
  name: string; // Max length: 255
  country: Country; // Reference to Country
}

export interface City {
  id: number; // integer
  name: string; // Max length: 255
  state: State; // Reference to State
}
