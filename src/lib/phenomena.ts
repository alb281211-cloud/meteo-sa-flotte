import type { MetricId } from "./metrics";
import type { RiskId } from "./risks";
import type { LayerId } from "../components/map/layers";

export interface Phenomenon {
  slug: string;
  title: string;
  tagline: string;
  risk?: RiskId;
  metrics: MetricId[];
  mapLayer?: LayerId;
  sections: { title: string; body: string }[];
  scale?: { head: string[]; rows: string[][] };
  tips?: string[];
  related: string[];
}

export const PHENOMENA: Phenomenon[] = [
  {
    slug: "orages",
    title: "Orages",
    tagline: "Quand l'atmosphère libère son énergie",
    risk: "orages",
    metrics: ["cape", "lifted", "precipitation"],
    mapLayer: "lightning",
    sections: [
      {
        title: "Comment se forme un orage",
        body: "Un orage naît quand de l'air chaud et humide est soulevé dans une atmosphère instable. En montant, la vapeur d'eau se condense et libère de la chaleur, ce qui accélère encore l'ascension. Le cumulonimbus qui en résulte peut dépasser 12 km d'altitude. La séparation des charges électriques entre les cristaux de glace et la grêle produit la foudre.",
      },
      {
        title: "Lire la CAPE et l'indice de soulèvement",
        body: "La CAPE (Convective Available Potential Energy) mesure l'énergie disponible pour la convection. Sous 300 J/kg, les orages sont peu probables. Entre 1 000 et 2 500 J/kg, ils sont possibles, et au-delà de 2 500 J/kg ils peuvent devenir violents. L'indice de soulèvement (Lifted Index) le complète : plus il est négatif, plus l'atmosphère est instable. Il faut aussi un déclencheur : un relief, un front ou une convergence de vents.",
      },
      {
        title: "Orages et grêle",
        body: "La grêle se forme dans les courants ascendants les plus puissants, qui maintiennent les grêlons en altitude assez longtemps pour qu'ils grossissent. Les codes météo 96 et 99 signalent un orage avec grêle dans la prévision.",
      },
    ],
    scale: {
      head: ["CAPE (J/kg)", "Instabilité", "Potentiel"],
      rows: [
        ["< 300", "Faible", "Orages improbables"],
        ["300 – 1 000", "Modérée", "Averses orageuses isolées"],
        ["1 000 – 2 500", "Forte", "Orages organisés possibles"],
        ["> 2 500", "Extrême", "Orages violents, grêle, rafales"],
      ],
    },
    tips: [
      "Si le tonnerre suit l'éclair de moins de 30 secondes, l'orage est à moins de 10 km : mettez-vous à l'abri.",
      "Évitez les arbres isolés, les crêtes et les plans d'eau.",
      "Une voiture fermée protège de la foudre (cage de Faraday).",
    ],
    related: ["pluie", "vent", "nuages"],
  },
  {
    slug: "pluie",
    title: "Pluie et averses",
    tagline: "Du crachin au déluge",
    risk: "pluie",
    metrics: ["precipitation", "probability"],
    mapLayer: "radar",
    sections: [
      {
        title: "Pluie stratiforme ou averse",
        body: "La pluie stratiforme tombe de nuages étendus (nimbostratus), souvent liés à un front. Elle est continue et modérée. Les averses tombent de nuages convectifs (cumulus, cumulonimbus) : elles sont brèves, intenses et très localisées. C'est pourquoi la probabilité de pluie peut être élevée alors que le cumul reste faible.",
      },
      {
        title: "Lire le radar",
        body: "Le radar émet des ondes qui rebondissent sur les gouttes. Plus l'écho est fort, plus les précipitations sont intenses. L'animation des dernières images montre la trajectoire des averses et permet d'anticiper leur arrivée.",
      },
    ],
    scale: {
      head: ["Intensité (mm/h)", "Qualification"],
      rows: [
        ["< 1", "Faible / bruine"],
        ["1 – 4", "Modérée"],
        ["4 – 8", "Forte"],
        ["> 8", "Très forte, ruissellement"],
      ],
    },
    tips: ["Au-delà de 30 mm en quelques heures, les petits cours d'eau peuvent déborder.", "Ne vous engagez jamais sur une route inondée."],
    related: ["orages", "nuages", "neige"],
  },
  {
    slug: "vent",
    title: "Vent et tempêtes",
    tagline: "L'air en mouvement",
    risk: "vent",
    metrics: ["wind", "gusts", "pressure"],
    mapLayer: "wind",
    sections: [
      {
        title: "D'où vient le vent",
        body: "Le vent résulte des différences de pression : l'air s'écoule des hautes vers les basses pressions. Sous l'effet de la rotation terrestre, il tourne autour des dépressions, dans le sens inverse des aiguilles d'une montre dans l'hémisphère nord. Plus les isobares sont serrées, plus le vent est fort.",
      },
      {
        title: "Vent moyen et rafales",
        body: "Le vent moyen est calculé sur 10 minutes. Les rafales sont des pointes de quelques secondes, souvent 1,5 à 2 fois plus fortes. Ce sont elles qui provoquent les dégâts.",
      },
    ],
    scale: {
      head: ["Beaufort", "km/h", "Effets"],
      rows: [
        ["0 – 3", "< 20", "Calme à petite brise"],
        ["4 – 5", "20 – 38", "Les branches bougent"],
        ["6 – 7", "39 – 61", "Marche difficile face au vent"],
        ["8 – 9", "62 – 88", "Branches cassées, tuiles"],
        ["10 – 12", "> 89", "Tempête : arbres déracinés"],
      ],
    },
    tips: ["Rangez le mobilier extérieur au-delà de 70 km/h de rafales.", "Évitez les forêts lors des coups de vent."],
    related: ["pression", "orages"],
  },
  {
    slug: "pression",
    title: "Pression atmosphérique",
    tagline: "Le poids de l'air qui fait le temps",
    metrics: ["pressure"],
    sections: [
      {
        title: "Anticyclones et dépressions",
        body: "La pression moyenne au niveau de la mer est de 1013,25 hPa. Un anticyclone (au-dessus de 1020 hPa) apporte de l'air descendant, sec et stable : c'est du beau temps. Une dépression (sous 1000 hPa) fait monter l'air, ce qui forme des nuages et de la pluie.",
      },
      {
        title: "La tendance compte plus que la valeur",
        body: "Une baisse rapide, de plus de 3 hPa en 3 heures, annonce souvent une dégradation et du vent. Une hausse régulière signale le retour d'un temps plus calme.",
      },
    ],
    scale: {
      head: ["hPa", "Situation"],
      rows: [
        ["> 1030", "Anticyclone puissant"],
        ["1015 – 1030", "Temps stable"],
        ["1000 – 1015", "Variable"],
        ["< 1000", "Dépression, temps perturbé"],
        ["< 970", "Tempête"],
      ],
    },
    related: ["vent", "nuages"],
  },
  {
    slug: "nuages",
    title: "Nuages",
    tagline: "Les trois étages du ciel",
    metrics: ["clouds_low", "clouds_mid", "clouds_high"],
    mapLayer: "infrared",
    sections: [
      {
        title: "Une classification par altitude",
        body: "Les nuages bas (stratus, stratocumulus, sous 2 km) donnent un ciel gris et parfois de la bruine. Les nuages moyens (altocumulus, altostratus) voilent le soleil. Les nuages hauts (cirrus), faits de cristaux de glace, annoncent souvent l'arrivée d'une perturbation 12 à 24 h plus tard. Les cumulonimbus traversent tous les étages.",
      },
      {
        title: "Satellite infrarouge",
        body: "L'imagerie infrarouge mesure la température du sommet des nuages. Plus un nuage est blanc, plus son sommet est froid et donc élevé. Les sommets les plus blancs signalent les cumulonimbus orageux. Elle fonctionne de jour comme de nuit.",
      },
    ],
    related: ["brouillard", "pluie", "orages"],
  },
  {
    slug: "brouillard",
    title: "Brouillard et brume",
    tagline: "Quand le nuage touche le sol",
    risk: "brouillard",
    metrics: ["visibility", "humidity", "dewpoint"],
    sections: [
      {
        title: "Brouillard de rayonnement",
        body: "Par nuit claire et vent faible, le sol perd sa chaleur et refroidit l'air au contact. Quand la température rejoint le point de rosée, la vapeur se condense en fines gouttelettes. Le brouillard se forme surtout dans les vallées, en automne et en hiver.",
      },
      {
        title: "Écart température / point de rosée",
        body: "Plus l'écart entre la température et le point de rosée est faible, plus l'air est proche de la saturation. Sous 2 °C d'écart avec un vent faible, la formation de brouillard devient probable.",
      },
    ],
    scale: {
      head: ["Visibilité", "Terme"],
      rows: [
        ["< 200 m", "Brouillard dense"],
        ["200 m – 1 km", "Brouillard"],
        ["1 – 5 km", "Brume"],
        ["> 10 km", "Bonne visibilité"],
      ],
    },
    tips: ["Allumez les feux de brouillard sous 50 m de visibilité.", "Réduisez votre vitesse et augmentez les distances de sécurité."],
    related: ["nuages", "froid"],
  },
  {
    slug: "neige",
    title: "Neige et verglas",
    tagline: "Le cristal et la limite pluie-neige",
    risk: "neige",
    metrics: ["snowfall", "freezing", "temperature"],
    sections: [
      {
        title: "La limite pluie-neige",
        body: "La neige atteint le sol quand l'air reste suffisamment froid sur toute la descente. L'isotherme 0 °C en donne une bonne indication : la neige tient en général à partir de 300 m sous ce niveau. Une couche d'air doux en altitude au-dessus d'un sol gelé produit de la pluie verglaçante, le phénomène le plus dangereux.",
      },
    ],
    tips: ["Équipez-vous de pneus hiver ou de chaînes en montagne.", "La pluie verglaçante rend routes et trottoirs impraticables en quelques minutes."],
    related: ["froid", "pluie"],
  },
  {
    slug: "chaleur",
    title: "Chaleur et canicule",
    tagline: "Quand les nuits ne rafraîchissent plus",
    risk: "chaleur",
    metrics: ["temperature", "apparent", "dewpoint"],
    sections: [
      {
        title: "Qu'est-ce qu'une canicule",
        body: "On parle de canicule quand de fortes chaleurs persistent jour et nuit pendant au moins trois jours. Les nuits chaudes (minimales au-dessus de 20 °C) empêchent l'organisme de récupérer. Un point de rosée élevé aggrave l'inconfort, car la transpiration s'évapore mal.",
      },
    ],
    tips: ["Buvez régulièrement sans attendre la soif.", "Fermez volets et fenêtres le jour, aérez la nuit.", "Prenez des nouvelles des personnes fragiles."],
    related: ["uv", "orages"],
  },
  {
    slug: "froid",
    title: "Gel et grand froid",
    tagline: "Températures négatives et refroidissement éolien",
    risk: "froid",
    metrics: ["temperature", "apparent"],
    sections: [
      {
        title: "Gelée et refroidissement éolien",
        body: "Une gelée se produit quand la température passe sous 0 °C. Le vent accentue la sensation de froid : par −5 °C et 30 km/h de vent, le ressenti approche −12 °C. C'est ce qu'indique la température ressentie.",
      },
    ],
    tips: ["Protégez les canalisations extérieures.", "Habillez-vous en plusieurs couches et couvrez les extrémités."],
    related: ["neige", "brouillard"],
  },
  {
    slug: "uv",
    title: "Rayonnement UV",
    tagline: "Le soleil invisible",
    risk: "uv",
    metrics: ["uv", "radiation"],
    sections: [
      {
        title: "L'indice UV",
        body: "L'indice UV mesure l'intensité des ultraviolets qui atteignent le sol. Il dépend de la hauteur du soleil, de la couche d'ozone, de la nébulosité et de l'altitude (+10 % tous les 1 000 m). La neige réfléchit jusqu'à 80 % des UV.",
      },
    ],
    scale: {
      head: ["Indice", "Niveau", "Protection"],
      rows: [
        ["0 – 2", "Faible", "Aucune"],
        ["3 – 5", "Modéré", "Lunettes, crème SPF 30"],
        ["6 – 7", "Élevé", "Chapeau, SPF 30+, ombre aux heures chaudes"],
        ["8 – 10", "Très élevé", "SPF 50+, évitez 12 h – 16 h"],
        ["11+", "Extrême", "Restez à l'abri"],
      ],
    },
    related: ["chaleur", "nuages"],
  },
];

export const phenomenonBySlug = (s: string | undefined) => PHENOMENA.find((p) => p.slug === s);
