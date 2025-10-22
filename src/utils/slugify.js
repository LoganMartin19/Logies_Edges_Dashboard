// src/utils/slugify.js
export function slugifyTeamName(name) {
    return name
      .normalize("NFD")                // split accents
      .replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")     // non-alphanumeric → underscore
      .replace(/^_+|_+$/g, "");        // trim underscores
  }