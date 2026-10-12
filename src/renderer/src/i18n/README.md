# Traductions du launcher

Tous les textes visibles sont ici. Rien n'est écrit en dur dans `App.tsx`.

| Fichier    | Rôle                                        |
| ---------- | ------------------------------------------- |
| `fr.ts`    | Langue de référence (définit toutes les clés) |
| `en.ts`    | Anglais                                     |
| `index.ts` | Liste des langues, chargement, fonction `t` |

## Modifier un texte
Ouvre `fr.ts` (ou `en.ts`), change la valeur à droite des deux-points. Enregistre : l'appli se met à jour.

## Ajouter une langue
1. Copie `en.ts` en `es.ts`, change `export const en` en `export const es`.
2. Traduis les valeurs. Ne change jamais les clés (à gauche).
3. Dans `index.ts` : `import { es } from './es'` puis ajoute `{ id: 'es', label: 'Español', dict: es }` dans `LANGUAGES`.
4. Pense à `meta.locale` (ex. `es-ES`) et `meta.decimal`.

## Variables
`{loader}`, `{version}`, `{name}`, `{count}`, `{size}`, `{value}` sont remplacées automatiquement.
Garde-les telles quelles dans la traduction, tu peux changer leur place dans la phrase.

## Limite
Les messages envoyés par le processus principal pendant le téléchargement et le lancement
(ex. « Téléchargement des racines… ») viennent de `src/main`, pas d'ici.
Pour les traduire, il faut modifier les chaînes dans le code du main process.
