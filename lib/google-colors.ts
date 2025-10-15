// lib/google-colors.ts
// Mapping des couleurs Google Calendar (colorId) vers codes hexadécimaux

export const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  '1': '#a4bdfc',  // Lavande
  '2': '#7ae7bf',  // Sauge
  '3': '#dbadff',  // Raisin
  '4': '#ff887c',  // Flamant
  '5': '#fbd75b',  // Banane
  '6': '#ffb878',  // Mandarine
  '7': '#46d6db',  // Turquoise
  '8': '#e1e1e1',  // Graphite
  '9': '#5484ed',  // Bleuet
  '10': '#51b749', // Basilic
  '11': '#dc2127'  // Tomate
};

// Couleur par défaut si aucune couleur n'est définie
export const DEFAULT_COLOR = '#3b82f6'; // Bleu

/**
 * Convertit un colorId Google Calendar en code hexadécimal
 * @param colorId - L'ID de couleur de Google Calendar (string de '1' à '11')
 * @returns Le code couleur hexadécimal correspondant
 */
export function getColorFromGoogleId(colorId: string | undefined | null): string {
  if (!colorId) return DEFAULT_COLOR;
  const color = GOOGLE_CALENDAR_COLORS[colorId];
  console.log(`🎨 Conversion Google colorId ${colorId} → ${color || DEFAULT_COLOR}`);
  return color || DEFAULT_COLOR;
}

/**
 * Trouve le colorId Google le plus proche d'une couleur hexadécimale
 * Utile pour l'export : quand un événement local a une couleur custom,
 * on trouve la couleur Google la plus proche
 * @param hexColor - Code couleur hexadécimal (ex: '#3b82f6')
 * @returns Le colorId Google le plus proche
 */
export function findClosestGoogleColorId(hexColor: string): string {
  if (!hexColor) return '9'; // Bleu par défaut
  
  // Si la couleur existe déjà dans le mapping, retourner son ID
  const exactMatch = Object.entries(GOOGLE_CALENDAR_COLORS).find(
    ([_, color]) => color.toLowerCase() === hexColor.toLowerCase()
  );
  
  if (exactMatch) {
    console.log(`🎨 Couleur exacte trouvée: ${hexColor} → colorId ${exactMatch[0]}`);
    return exactMatch[0];
  }
  
  // Sinon, retourner un colorId par défaut (9 = bleuet)
  console.log(`🎨 Pas de correspondance exacte pour ${hexColor}, utilisation du bleu par défaut`);
  return '9';
}