/**
 * Categorieën van spelsituaties: de trainingsthema's waarin de staf denkt.
 * De waarde is de tekst zelf (zo staat hij ook in de database), "Overig" is
 * het vangnet voor alles wat nergens anders past.
 */
export const CATEGORIEEN = [
  { naam: 'Opbouw van achteruit', uitleg: 'Vanuit de keeper en de verdediging naar voren spelen' },
  { naam: 'Positiespelen', uitleg: 'Balbezit houden, overtal, vrije man vinden' },
  { naam: 'Afwerken op doel', uitleg: 'Scoren vanuit alle hoeken en situaties' },
  { naam: 'Pass- en trapvormen', uitleg: 'Passen, aannemen en trappen in vormen' },
  { naam: 'Conditionele oefeningen', uitleg: 'Loopvormen en intervallen met en zonder bal' },
  { naam: 'Omschakeling', uitleg: 'Balverlies naar druk, balverovering naar aanval' },
  { naam: 'Verdedigen en druk zetten', uitleg: '1 tegen 1, het blok, pressing' },
  { naam: 'Spelhervattingen', uitleg: 'Corners, vrije trappen, ingooi' },
  { naam: 'Partijvormen', uitleg: 'Wedstrijdvormen met en zonder extra regels' },
  { naam: 'Overig', uitleg: 'Alles wat nergens anders past' },
] as const

export type Categorie = (typeof CATEGORIEEN)[number]['naam']

export const OVERIG: Categorie = 'Overig'

/** Onbekende of lege waarden vallen terug op Overig. */
export function alsCategorie(waarde: unknown): Categorie {
  return CATEGORIEEN.some(c => c.naam === waarde) ? (waarde as Categorie) : OVERIG
}
