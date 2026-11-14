export const cafeSections = [
  { id: 'calientes', label: 'Cafés calientes' },
  { id: 'frios', label: 'Cafés fríos' },
  { id: 'te', label: 'Tés y matcha' },
  { id: 'sodas', label: 'Sodas y limonadas' },
  { id: 'granizados', label: 'Granizados y smoothies' },
  { id: 'proteina', label: 'Jugos y proteína' },
  { id: 'cocteles', label: 'Cócteles con café' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'postres', label: 'Repostería y postres' },
] as const;

const categorySections: Record<string, string> = {
  'bebidas calientes con cafe': 'calientes',
  'bebidas frias con cafe': 'frios',
  'bebidas a base de te': 'te',
  'matcha': 'te',
  'sodas': 'sodas',
  'bebidas frias sin cafe': 'sodas',
  'granizados': 'granizados',
  'bebidas proteicas': 'proteina',
  'bebidas con licor a base de cafe': 'cocteles',
  'comidas': 'comidas',
  'desayunos': 'comidas',
  'reposteria': 'postres',
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function cafeSectionFor(item: { name: string; category: string }, categoryLabel: string) {
  const name = normalize(item.name);
  if (/^aff?ogato\b/.test(name)) return 'postres';
  if (/^(granizado|smooth?ie|smothie|mango sunrise|mango beach)\b/.test(name)) return 'granizados';
  if (/^(soda|limonada|beso rosa|paraiso rosa|rubi berry|vitamina c|atardecer tropical)\b/.test(name)) return 'sodas';
  if (/^(jugo verde|proteina)\b/.test(name)) return 'proteina';
  if (/^((?:latte|americano) en las rocas|blueberry latte|pink latte|cold brew|aerocano|expreso tonic|espresso tonic|orange espresso|nevado de cafe)\b/.test(name)) return 'frios';
  if (name === 'cafe filtrado') return 'calientes';
  const key = normalize(item.category);
  return cafeSections.find(section => section.id === key || normalize(section.label) === key)?.id
    ?? categorySections[key]
    ?? categorySections[normalize(categoryLabel)]
    ?? null;
}

