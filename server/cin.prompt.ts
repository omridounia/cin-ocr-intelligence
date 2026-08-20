export const CIN_VISION_PROMPT_VERSION = "cin-v1" as const;

export const CIN_VISION_MODEL = "qwen2.5vl:3b" as const;

/**
 * Instruction métier envoyée au modèle de vision local.
 * Elle est versionnée afin que toute évolution soit visible dans Git.
 */
export function buildCinExtractionPrompt(): string {
  return `
Tu analyses le recto d'un spécimen FICTIF de CIN marocaine.

Objectif : produire une sortie JSON exploitable par un système informatique.

Règles impératives :
1. Traite uniquement les informations écrites en caractères latins. Ignore totalement l'arabe.
2. Ne recopie ni n'invente aucune information incertaine, masquée, partielle ou illisible.
3. Pour chaque champ absent ou incertain, retourne la valeur null.
4. Si l'image n'est pas le recto d'une CIN marocaine, retourne classification = "not-cin" et les cinq champs à null.
5. Si l'image est trop floue, tronquée ou illisible pour être traitée, retourne classification = "unreadable" et les cinq champs à null.
6. Une date doit être retournée uniquement si le jour, le mois et l'année sont certains. Utilise alors le format YYYY-MM-DD.
7. Un numéro CIN doit respecter exactement l'expression ^[A-Z]{1,2}\\d{4,8}$. Sinon retourne null.
8. Réponds uniquement avec un objet JSON valide, sans Markdown, sans phrase d'explication et sans clé supplémentaire.

Format JSON exact attendu :
{
  "classification": "cin" | "not-cin" | "unreadable",
  "fields": {
    "nom": string | null,
    "prénom": string | null,
    "dateNaissance": "YYYY-MM-DD" | null,
    "numeroCIN": string | null,
    "dateFinValidite": "YYYY-MM-DD" | null
  }
}

Si classification vaut "not-cin" ou "unreadable", les cinq valeurs de fields doivent être null.
`.trim();
}
