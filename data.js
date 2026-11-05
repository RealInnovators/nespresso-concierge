// ## Catalogo reale
// Nomi, prezzi a capsula, intensita e immagini letti da nespresso.com/pro/it/it il 5/11/2026.
const CATALOG = {
 "capsules": [
  {
   "id": "brazil",
   "name": "Brazil",
   "price": 0.6222,
   "intensity": 4,
   "note": "Miele e Cereali Tostati",
   "img": "assets/caps/brazil.png",
   "color": "#c2ad90"
  },
  {
   "id": "indonesia",
   "name": "Indonesia",
   "price": 0.62,
   "intensity": 9,
   "note": "",
   "img": "assets/caps/indonesia.png",
   "color": "#027272"
  },
  {
   "id": "congo-organic",
   "name": "Congo Organic",
   "price": 0.6222,
   "intensity": 7,
   "note": "Nota fruttata e cereali tostati",
   "img": "assets/caps/congo-organic.png",
   "color": "#2a221a"
  },
  {
   "id": "peru-organic",
   "name": "Peru Organic",
   "price": 0.6222,
   "intensity": 6,
   "note": "Fruttato ed elegante",
   "img": "assets/caps/peru-organic.png",
   "color": "#93bc2b"
  },
  {
   "id": "guatemala",
   "name": "Guatemala",
   "price": 0.6222,
   "intensity": 6,
   "note": "Audace e vellutato",
   "img": "assets/caps/guatemala.png",
   "color": "#0f83bd"
  },
  {
   "id": "colombia-organic",
   "name": "Colombia Organic",
   "price": 0.6222,
   "intensity": 6,
   "note": "Fruttato e vivace",
   "img": "assets/caps/colombia-organic.png",
   "color": "#c9627a"
  },
  {
   "id": "india",
   "name": "India",
   "price": 0.62,
   "intensity": 0,
   "note": "Intenso e speziato",
   "img": "assets/caps/india.png",
   "color": "#e07b3f"
  },
  {
   "id": "ristretto-intenso",
   "name": "Ristretto Intenso",
   "price": 0.5734,
   "intensity": 12,
   "note": "Intensamente seducente",
   "img": "assets/caps/ristretto-intenso.png",
   "color": "#000000"
  },
  {
   "id": "ristretto",
   "name": "Ristretto",
   "price": 0.5734,
   "intensity": 9,
   "note": "Il grande classico",
   "img": "assets/caps/ristretto.png",
   "color": "#5f6669"
  },
  {
   "id": "intenso",
   "name": "Intenso",
   "price": 0.5734,
   "intensity": 8,
   "note": "Intenso e tostato",
   "img": "assets/caps/intenso.png",
   "color": "#4a1c0d"
  },
  {
   "id": "decaffeinato",
   "name": "Decaffeinato",
   "price": 0.5734,
   "intensity": 7,
   "note": "Corposo",
   "img": "assets/caps/decaffeinato.png",
   "color": "#c8102e"
  },
  {
   "id": "forte",
   "name": "Forte",
   "price": 0.5734,
   "intensity": 7,
   "note": "Intenso equilibrio",
   "img": "assets/caps/forte.png",
   "color": "#7a4520"
  },
  {
   "id": "leggero",
   "name": "Leggero",
   "price": 0.5734,
   "intensity": 6,
   "note": "Profondità segrete",
   "img": "assets/caps/leggero.png",
   "color": "#4f8012"
  },
  {
   "id": "finezzo",
   "name": "Finezzo",
   "price": 0.5734,
   "intensity": 5,
   "note": "Floreale e rinfrescante",
   "img": "assets/caps/finezzo.png",
   "color": "#afb30c"
  },
  {
   "id": "forte-extra",
   "name": "Forte Extra",
   "price": 0.5978,
   "intensity": 8,
   "note": "Cereali Maltati & Caramello",
   "img": "assets/caps/forte-extra.png",
   "color": "#573325"
  },
  {
   "id": "caffe-vanilio",
   "name": "Caffè Vanilio",
   "price": 0.5978,
   "intensity": 0,
   "note": "Caffè aromatizzato alla vaniglia",
   "img": "assets/caps/caffe-vanilio.png",
   "color": "#b0a075"
  },
  {
   "id": "caffe-caramello",
   "name": "Caffè Caramello",
   "price": 0.5978,
   "intensity": 0,
   "note": "Per i tuoi caffè al sapore di caramello",
   "img": "assets/caps/caffe-caramello.png",
   "color": "#c2855e"
  },
  {
   "id": "bianco-intenso",
   "name": "Bianco Intenso",
   "price": 0.5978,
   "intensity": 0,
   "note": "Intenso e tostato ma equilibrato",
   "img": "assets/caps/bianco-intenso.png",
   "color": "#683a15"
  },
  {
   "id": "caffe-nocciola",
   "name": "Caffè Nocciola",
   "price": 0.5978,
   "intensity": 0,
   "note": "Caffè aromatizzato alla nocciola",
   "img": "assets/caps/caffe-nocciola.png",
   "color": "#ad7264"
  },
  {
   "id": "amaretti-decaffeinato",
   "name": "Amaretti Decaffeinato",
   "price": 0.5978,
   "intensity": 0,
   "note": "",
   "img": "assets/caps/amaretti-decaffeinato.png",
   "color": "#d0bda6"
  }
 ],
 "machines": [
  {
   "id": "zenius-starter-pack",
   "name": "Zenius Starter Pack",
   "price": 547.78,
   "img": "assets/mach/zenius-starter-pack.png"
  },
  {
   "id": "giorno-mini",
   "name": "Giorno Mini",
   "price": 315.98,
   "img": "assets/mach/giorno-mini.png"
  },
  {
   "id": "momento-coffee",
   "name": "Momento & Coffee",
   "price": 1999.58,
   "img": "assets/mach/momento-coffee.png"
  },
  {
   "id": "momento-coffee-milk",
   "name": "Momento Coffee & Milk",
   "price": 5197.44,
   "img": "assets/mach/momento-coffee-milk.png"
  },
  {
   "id": "momento-coffee-coffee",
   "name": "Momento Coffee & Coffee",
   "price": 3622.18,
   "img": "assets/mach/momento-coffee-coffee.png"
  },
  {
   "id": "momento-black",
   "name": "Momento Black",
   "price": 3048.78,
   "img": "assets/mach/momento-black.png"
  },
  {
   "id": "aguila-220",
   "name": "Aguila 220",
   "price": 8660.78,
   "img": "assets/mach/aguila-220.png"
  },
  {
   "id": "aguila-440",
   "name": "Aguila 440",
   "price": 15382.37,
   "img": "assets/mach/aguila-440.png"
  }
 ]
};

// ## Schede dei caffe' per il chatbot
// Valori (amaro, acidita', tostatura da 1 a 5) e formati letti dal sito Nespresso Professional.
// I testi sono riassunti con parole nostre dalle schede prodotto. 0 = valore non indicato dal sito.
const COFFEE_INFO = {
  'brazil': { fam: 'origini', bit: 2, acid: 4, roast: 2, cups: ['ristretto', 'espresso'], tags: ['morbido', 'delicato', 'dolce', 'cereali', 'miele'], desc: 'Il più morbido tra i caffè di origine: Arabica brasiliana con note di cereali tostati e una dolcezza che ricorda il miele, grazie alla lavorazione honey.' },
  'indonesia': { fam: 'origini', bit: 3, acid: 4, roast: 4, cups: ['ristretto', 'espresso'], tags: ['intenso', 'corposo'], desc: 'Il più intenso tra i caffè di origine, con tostatura scura e corpo pieno.' },
  'congo-organic': { fam: 'origini', bit: 2, acid: 3, roast: 3, cups: ['espresso', 'lungo'], tags: ['biologico', 'morbido', 'fruttato', 'cereali', 'frutta secca'], desc: 'Biologico e morbido, con cereali tostati, frutta leggera e sentori di frutta secca.' },
  'peru-organic': { fam: 'origini', bit: 3, acid: 4, roast: 3, cups: ['espresso', 'lungo'], tags: ['biologico', 'fruttato', 'cereali'], desc: 'Biologico e fruttato, con note vegetali fresche. La fine acidità è bilanciata da cereali dolci tostati. Arabica coltivata sulle Ande, oltre i 1000 metri.' },
  'guatemala': { fam: 'origini', bit: 3, acid: 2, roast: 3, cups: ['espresso', 'lungo'], tags: ['cereali', 'setoso', 'robusta'], desc: 'Arabica del Guatemala e Robusta, entrambi lavati: consistenza setosa, note intense di cereali secchi e maltati, amarezza elegante.' },
  'colombia-organic': { fam: 'origini', bit: 3, acid: 4, roast: 2, cups: [], tags: ['biologico', 'fruttato', 'vivace', 'frutti rossi'], desc: 'Biologico e vivace, con acidità spiccata e note di frutti rossi e vino. Le ciliegie di caffè maturano più a lungo sulla pianta.' },
  'india': { fam: 'origini', bit: 3, acid: 4, roast: 3, cups: ['ristretto', 'espresso'], tags: ['speziato', 'intenso', 'legni'], desc: 'Speziato e deciso: legni aromatici, chiodi di garofano, noce moscata e pepe, gli aromi che crescono accanto al caffè nell\'India meridionale.' },
  'ristretto-intenso': { fam: 'classici', bit: 5, acid: 1, roast: 5, cups: ['ristretto'], tags: ['intenso', 'corposo', 'speziato', 'legni', 'robusta'], desc: 'Il più intenso della gamma: tostato, amaro e corposo, con pepe e legni aromatici in una consistenza densa e cremosa. Unisce Arabica e Robusta.' },
  'ristretto': { fam: 'classici', bit: 4, acid: 2, roast: 4, cups: ['ristretto'], tags: ['intenso', 'corposo', 'cacao', 'legni'], desc: 'Carattere tostato deciso, con note profonde di cacao e legni aromatici che durano a lungo in una crema ricca.' },
  'intenso': { fam: 'classici', bit: 3, acid: 2, roast: 4, cups: ['espresso'], tags: ['intenso', 'cacao', 'rotondo'], desc: 'Rotondo e tostato, con bassa acidità e note di cacao.' },
  'decaffeinato': { fam: 'classici', bit: 3, acid: 2, roast: 3, cups: ['espresso', 'lungo'], tags: ['decaffeinato', 'corposo', 'cacao', 'cereali'], desc: 'Decaffeinato corposo, con crema densa, un leggero aroma di cacao e una nota forte di cereali tostati.' },
  'forte': { fam: 'classici', bit: 3, acid: 3, roast: 3, cups: ['espresso', 'lungo'], tags: ['equilibrato', 'fruttato', 'frutti rossi'], desc: 'Intenso ed equilibrato, con tostatura media e aromi di frutti rossi maturi.' },
  'leggero': { fam: 'classici', bit: 3, acid: 2, roast: 2, cups: ['espresso', 'lungo'], tags: ['vellutato', 'cacao', 'cereali'], desc: 'Vellutato, con note di cacao e cereali. Una punta di acidità bilancia l\'amarezza.' },
  'finezzo': { fam: 'classici', bit: 1, acid: 3, roast: 1, cups: ['espresso', 'lungo'], tags: ['delicato', 'floreale'], desc: 'Il più delicato tra i classici: leggera acidità e aromi floreali di gelsomino e bergamotto.' },
  'forte-extra': { fam: 'classici', bit: 2, acid: 3, roast: 4, cups: ['espresso', 'lungo'], tags: ['intenso', 'dolce', 'caramello', 'cereali', 'caffeina'], desc: 'Intenso, con caramello dolce, cereali maltati e una nota tostata. È nella linea con caffeina extra e usa Arabica di Brasile e Guatemala.' },
  'caffe-vanilio': { fam: 'variazioni', bit: 3, acid: 3, roast: 2, cups: ['espresso', 'lungo'], tags: ['aromatizzato', 'dolce', 'vaniglia'], desc: 'Caffè aromatizzato alla vaniglia.' },
  'caffe-caramello': { fam: 'variazioni', bit: 3, acid: 3, roast: 2, cups: ['espresso', 'lungo'], tags: ['aromatizzato', 'dolce', 'caramello', 'frutti rossi'], desc: 'Aromatizzato: parte intenso con note tostate e frutti rossi maturi, poi il caramello ammorbidisce tutto con la sua dolcezza.' },
  'bianco-intenso': { fam: 'variazioni', bit: 3, acid: 0, roast: 3, cups: ['con latte', 'ristretto', 'espresso'], tags: ['latte', 'equilibrato'], desc: 'Adatto anche alle ricette con latte: intenso e tostato, ma equilibrato.' },
  'caffe-nocciola': { fam: 'variazioni', bit: 3, acid: 3, roast: 2, cups: ['espresso', 'lungo'], tags: ['aromatizzato', 'dolce', 'nocciola', 'latte', 'cereali'], desc: 'Aromatizzato: nocciola tostata con note di pralina, biscotto e cereali, su Arabica di Brasile e Colombia. Funziona bene anche come cappuccino.' },
  'amaretti-decaffeinato': { fam: 'variazioni', bit: 1, acid: 4, roast: 2, cups: ['espresso', 'lungo'], tags: ['aromatizzato', 'decaffeinato', 'dolce', 'mandorla', 'vaniglia'], desc: 'Decaffeinato aromatizzato: sapore di amaretti, mandorla e vaniglia, con acidità fruttata, su Arabica sudamericana.' },
};
