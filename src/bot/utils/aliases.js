// Item aliases (Roman Urdu / common names)
export const itemAliases = {
  tomato: ["tomato", "tamatar", "tomatoes"],
  onion: ["onion", "pyaz", "piyaz", "onions"],
  potato: ["potato", "aloo", "potatoes"],
  eggs: ["egg", "eggs", "anda", "anday"],
  chicken: ["chicken", "murghi", "murga"],
  rice: ["rice", "chawal"],
  wheat: ["wheat", "gandum", "atta"],
  sugar: ["sugar", "cheeni", "chini"],
  dal: ["dal", "daal", "lentil", "lentils"],
  milk: ["milk", "doodh"],
  ghee: ["ghee", "desi ghee"],
  oil: ["oil", "tel", "cooking oil"],
  banana: ["banana", "kela"],
  apple: ["apple", "seb"],
  garlic: ["garlic", "lehsan", "lahsan"],
  ginger: ["ginger", "adrak"],
};

// District aliases
export const districtAliases = {
  lahore: ["lahore", "lhr"],
  faisalabad: ["faisalabad", "fsd"],
  rawalpindi: ["rawalpindi", "pindi", "rwp"],
  multan: ["multan", "mlt"],
  gujranwala: ["gujranwala", "grw"],
  sialkot: ["sialkot", "skt"],
  bahawalpur: ["bahawalpur", "bwp"],
  sargodha: ["sargodha", "sgd"],
  kasur: ["kasur"],
  sahiwal: ["sahiwal"],
  chakwal: ["chakwal"],
};

/**
 * Resolve an item query to a canonical product name.
 * Returns the matching canonical key or the original query.
 */
export function resolveItem(query) {
  const q = query.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(itemAliases)) {
    if (aliases.some((a) => a === q || q.includes(a) || a.includes(q))) {
      return canonical;
    }
  }
  return q;
}

/**
 * Resolve a district query to a canonical district name.
 * Returns the matching canonical key or the original query.
 */
export function resolveDistrict(query) {
  const q = query.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(districtAliases)) {
    if (aliases.some((a) => a === q || q.includes(a) || a.includes(q))) {
      return canonical;
    }
  }
  return q;
}
