# OPLEVERING — het ontwerp van de eindbaas

*Hoort bij PLAN.md §2. De baas is de enige level die niet op zichzelf staat:
hij is opgebouwd uit wat er in de acht fases daarvoor gebeurd is.*

---

## 1. Wat er nu staat, en waarom dat de baas nog niet is

`kanalen-baas` bestaat en is speelbaar: de hele plattegrond, achttien
roosters, par 69. Het is de grootste kanaalplan van de vier en verder is het
hetzelfde kanaalplan. Je draait stukken tot het klopt, alleen langer.

Dat is geen baas. Het is fase 8 met meer werk erin, en het mist allebei de
dingen die het af zouden maken:

**Het is niet de uitbetaling van de grap.** Het plan zegt: *alles wat je
gebouwd hebt wordt een obstakel*. Op dit moment wordt er niets van wat je
gebouwd hebt ook maar één keer teruggekeken. Je had de hele verbouwing kunnen
overslaan en het bord was hetzelfde geweest.

**Het is niet moeilijker, het is langer.** Draaien is een patience. Meer
stukken maken een patience niet spannender, ze maken hem trager. Een baas
heeft een tweede beslissing nodig — iets waar je fout in kunt zitten en dat
je terug moet nemen.

Wat volgt lost allebei op met hetzelfde middel, want het is hetzelfde
probleem: de tweede beslissing *is* je eigen oude werk.

---

## 2. De vorm: twee lagen en een schacht

Lucht gaat niet door een plattegrond. Hij gaat onder de vloer naar de kamer
toe, in een schacht omhoog, en boven het plafond naar de roosters. Dat is wat
"door de muren die je hebt dichtgezet, onder de vloer die je hebt gelegd"
letterlijk betekent, dus dat is wat het bord wordt.

**Twee plattegronden, naast elkaar op het scherm.**

| | | |
|---|---|---|
| `ONDER DE VLOER` | de WTW en de hoofdleiding | lange takken, weinig vertakking |
| `BOVEN HET PLAFOND` | de verdeling naar de achttien roosters | kort en vertakt |

Tien bij zes is 60 cellen waarvan er 50 binnenshuis liggen, dus twee lagen
zijn 100 cellen. Beide helemaal vol leggen zou par richting de 140 duwen en
dat is precies de trage patience van hierboven. Dus geen van beide lagen is
vol: samen ongeveer vijftig stukken, net als nu, maar verdeeld over twee
tekeningen die elk iets anders doen. Elke laag is op zichzelf te overzien en
geen van beide is op zichzelf op te lossen.

Op 16 pixels per cel is een laag 160 bij 96. Twee daarvan met een gat ertussen
is 344 breed: het past op 384 met marge, met de koptekst erboven en de
voettekst eronder waar die nu ook staan.

### De schacht

De lagen hangen aan elkaar met **schachten**: een koker die in een
binnenmuur omhoog gaat. Een schacht is de enige verticale verbinding die er
is, en hij is het hele scharnier van de level.

- De maskers krijgen er twee bits bij, `OP` en `NEER`, naast de vier die er
  zijn. Een kwartslag draait alleen de onderste vier bits — een koker die
  omhoog gaat blijft omhoog gaan als je hem draait. Dat is `draai()` met een
  masker eromheen en verder verandert er niets aan het model.
- Een schacht ligt in een **cel tegen een binnenmuur**, niet in de muur zelf.
  Dat is ook wat er in het echt gebeurt: je raakt een hoek van de kamer kwijt
  aan een ingetimmerde koker. Pim mag daar iets van vinden.
- De speler krijgt **drie schachten** en moet zelf bepalen waar ze heen gaan.
  Dat is de tweede beslissing. Een schacht neerzetten is één klik op een
  kandidaatcel, hem weghalen is er nog een.

Zonder schacht is een cel een gewoon stuk van vier bits dat horizontaal moet
aansluiten. Mét schacht krijgt datzelfde stuk er een verticale opening bij,
op allebei de lagen tegelijk. Een schacht op de verkeerde plek levert dus
geen stille fout op maar een luide: de tak die eraan had moeten hangen staat
los, en dat zegt het bord al.

---

## 3. Wat elke fase in de weg legt

Dit is waar de level zijn naam verdient. Per fase, wat die achterlaat en hoe
het meetelt:

| Fase | Wat je achterliet | Wat het doet |
|---|---|---|
| **Leeghalen** | een lege kamer | niets. Het enige dat je ooit hielp. |
| **Sloop** | gaten in de muren | de doorbraken die je al maakte zijn gratis doorvoeren |
| **Isolatie** | wol in de buitenmuren | een buitenmuur is vol: **schachten alleen in binnenmuren** |
| **Elektra** | jouw kabels, jouw route | een schacht mag niet waar je kabel loopt |
| **Dichtzetten** | klossen achter de plaat | een schacht mag niet waar een klos zit |
| **Vloeren** | de vloer die je legde | onder de vloer loopt het kanaal in de richting van de vloerdelen |
| **Schilderen** | verse oker | een schacht in een geschilderde wand kost een ster |

### Elektra is de belangrijkste, en de enige die bewaard moet worden

Vier binnenmuren: `woonkamer-binnenmuur`, `keuken-zijwand`,
`woonkamer-haardwand`, `tvkamer-zijwand`. **Elektra komt op alle vier.**
Dichtzetten komt op drie wanden waarvan er maar één binnen is. Dus de kabels
zijn wat de schachten echt dwingt, en de klossen zijn de extra op de
keuken-zijwand.

Dat is ook de enige fase waar de *speler* kiest. De klossen liggen vast — de
generator levert wanden af waar precies één antwoord op past, dat is getest —
dus die hoeven nergens heen, die staan al in de leveldata. Een kabelroute is
een keuze, en twee spelers leggen hem anders.

**Dus: één veld erbij in de save, en alleen voor elektra.** Niet acht fases
die hun oplossing wegschrijven, één. Zie §6.

### Van wandkolom naar plattegrondcel

Een wand is in elektra 9 tot 18 cellen breed en 7 hoog. Een binnenmuur beslaat
op de plattegrond drie of vier cellen. De projectie is een deling:

```
plancel = vloer(kolom * cellenLangsDeMuur / wandBreedte)
```

Elke kolom waar een kabel doorheen loopt blokkeert de plancel waar hij op
uitkomt. Een kabel die naar de meterkast loopt pakt een stuk of wat kolommen,
dus van de drie of vier plekken langs een muur vallen er meestal één of twee
af — genoeg om te knellen, niet genoeg om vast te lopen. En het is te zien:
teken de kabel gewoon op de muurstrook langs de rand van de plattegrond, in
`ELEKTRA`-oker. Je herkent je eigen route.

*Welke genoemde binnenmuur welke grens op de plattegrond is, hangt nog aan de
kamerindeling — net als in `house.ts`. Het is drie velden, geen herschrijving.*

---

## 4. Waarom hij altijd op te lossen is

Dit is het enige waar deze level echt fout kan gaan, want voor het eerst hangt
een bord af van wat de speler eerder deed, en dat kan ik niet vooraf nakijken.
Het antwoord is dat ik dat ook niet hoef.

De generator die er al staat groeit een **opspannende boom** over het gebied:
verbonden door constructie, geen lussen, elk doodlopend eind een rooster. Dat
blijft precies even waar als je het gebied eerst inperkt. Dus:

1. lees de kabels en de klossen, bepaal welke cellen nog schacht mogen zijn;
2. kies daar een schachtverzameling uit;
3. groei de boom over de twee lagen *met die verticale takken erin*;
4. draai een aantal stukken scheef.

Wat daar uitkomt is oplosbaar omdat het uit een oplossing gemaakt is, hoe de
speler zijn kabels ook gelegd heeft. De boom wordt gegroeid als de level
begint, niet van tevoren gebakken, en dat is veilig om precies deze reden.

Eén rand blijft over: als een muur helemaal dichtzit door kabels, gebruikt de
generator hem niet. Als ze *allemaal* dichtzitten — wat niet kan met drie
schachten op vier muren, maar toch — maakt hij er één vrij en zegt Pim dat er
een kabel verlegd moet worden. Een nooduitgang die ook nog in het verhaal past.

---

## 5. Par, sterren, hint

Par wordt gerekend, niet opgeschreven, zoals overal in dit spel.

De bestaande solver loopt de cellen in leesvolgorde af en gebruikt dat de
linker- en de bovenbuur dan al vastliggen. Dat werkt over twee lagen door
gewoon door te tellen: vloer 0–59, plafond 60–119. Als je plafondcel *i*
beslist, ligt zijn vloerpartner *i−60* al vast — dezelfde truc, dezelfde
snelheid, en de verticale eis valt in dezelfde controle als de andere twee.

Daar komt het zoeken over schachtverzamelingen bovenop. Met een stuk of twaalf
kandidaatcellen en drie schachten is dat 220 verzamelingen, elk een draaisom
over 120 cellen. Dat is niets; par blijft een bewezen minimum.

- **Sterren** op draaien, zoals de rest van het spel, plus één ster eraf voor
  een schacht door een geschilderde wand. Geen klok, nergens.
- **Hint** is dezelfde solver: hij wijst de eerstvolgende schacht aan, of als
  die goed staan het eerstvolgende stuk dat scheef staat.
- **Par** zal rond de 75 à 90 uitkomen. Hoger dan de 69 van nu, maar met de
  schachten erbij, en verdeeld over twee tekeningen.

---

## 6. Wat er moet veranderen, en wat het kost

| Wat | Waar | Omvang |
|---|---|---|
| `OP`/`NEER`-bits, twee lagen, schachtregels | `puzzles/kanalen/model.ts` | ~120 regels erbij |
| boom over twee lagen, kandidaten inperken | `puzzles/kanalen/generate.ts` | ~60 regels |
| leesvolgorde over beide lagen, zoeken over schachten | `puzzles/kanalen/solver.ts` | ~50 regels |
| twee plattegronden, schacht plaatsen, kabels langs de rand | `scenes/kanalen.ts` | ~250 regels, het meeste werk |
| elektraroutes bewaren | `engine/save.ts`, `scenes/elektra.ts` | ~40 regels |
| het bord uit de save opbouwen | `puzzles/kanalen/baas.ts`, nieuw | ~120 regels |
| tests: oplosbaar bij willekeurige kabels, par klopt | `kanalen.test.ts` | ~80 regels |

### De save

Schema v2. `LevelRecord` krijgt er één optioneel veld bij en de lezer
behandelt een v1-save als een v2 zonder werk erin — dan valt de baas terug op
de kabelroutes die de solver zelf zou leggen, en niemand merkt iets behalve
dat het niet jouw route is.

```ts
type LevelRecord = {
  swings: number;
  stars: number;
  /** Alleen elektra: de cellen waar je kabel langs ging. */
  draden?: readonly (readonly number[])[];
};
```

Celindexen, geen punten: korter in localStorage en het is toch een vast
rooster. Negen elektralevels met een stuk of vijf routes is een paar honderd
getallen.

### Schatting

Vier à vijf dagen. Dat past in week 5, waar hij ook gepland staat, nu audio
in week 3 al klaar is. Het meeste zit in de scene, niet in de puzzel.

---

## 7. Pim

Drie beats, meer niet. De grap is twee jaar oud en heeft geen uitleg nodig.

**Bij binnenkomst** — de enige keer dat het woord zonder ironie valt:

> DE UNIT IS ER.
>
> NIET 'ONDERWEG'. NIET 'VOLGENDE WEEK'. ER.
>
> ALLES IN EEN KEER: ONDER DE VLOER NAAR DE KAMER, DE SCHACHT IN, BOVEN HET
> PLAFOND NAAR DE ROOSTERS. DRIE SCHACHTEN. KIES ZE GOED.

**Bij de eerste schacht die op een kabel botst** — één keer, daarna nooit meer:

> DAAR ZIT JE EIGEN LEIDING.

**Bij oplevering**, en dan de outro:

> HIJ DRAAIT.

En de zes kanaalplannen ervoor houden hun leveringsbericht. De baas is de
enige die `GELEVERD` zegt, en dat staat er al.

---

## 8. Wat er expres niet in zit

- **Geen klok.** Het plan laat een optionele timer op de baas toe. Niet doen:
  dit is de level waar hij rond moet kijken naar wat hij gemaakt heeft.
- **Geen achtvoudige save.** Alleen elektra schrijft zijn werk weg. Zeven
  fases die hun oplossing bewaren voor één verwijzing elk is veel schema voor
  weinig grap, en elke fase die het wél doet is een fase die kan breken.
- **Geen derde laag.** Door de muur zelf tekenen zou een derde plattegrond
  kosten die conceptueel niet klopt — muren zitten *tussen* cellen. De
  schacht doet het werk en kost niets.
- **Geen nieuwe mechaniek.** Draaien is wat de speler al kan. De schacht is
  één nieuwe handeling, en meer dan één erbij op de laatste level is wreed.

---

## 9. Terugvalpad

`kanalen-baas` zoals hij nu is blijft staan tot dit af en getest is. Hij
werkt, hij is uitgerekend, hij is speelbaar. Als week 5 omvalt gaat er een
baas mee die niemand een slechte level zal vinden — alleen een level die de
grap niet uitbetaalt. Dat is een acceptabel verlies en het is het enige
onderdeel van dit ontwerp waar een datum aan hangt.
