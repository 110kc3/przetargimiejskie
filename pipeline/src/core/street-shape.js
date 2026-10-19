// Numeric commemorative street names are valid; a number leaking from a
// building, parcel or table column into the street is still a sanity failure.
export function hasValidStreetNumber(street) {
  return /^\d+\s/.test(street)
    || /^(?:aleja|al\.|plac|pl\.|osiedle|os\.)\s+\d{1,2}\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)$/i.test(street)
    || /^(?:plac\s+\d{3,4}-lecia|konstytucji\s+3\s+maja)$/i.test(street);
}
