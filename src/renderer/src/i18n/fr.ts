/*
  FRANÇAIS — langue de référence.
  Toutes les autres langues doivent avoir exactement les mêmes clés.
  Variables : {nom} est remplacé automatiquement (ex. {loader}, {version}).
*/
export const fr = {
  // ── Méta ────────────────────────────────────────────
  'meta.locale': 'fr-FR', // format des nombres (fr-FR, en-US, es-ES…)
  'meta.decimal': ',', // séparateur décimal
  'meta.documentTitle': 'Odyssey Launcher — Le monde est ouvert',

  // ── Unités ──────────────────────────────────────────
  'unit.gb': '{value} Go',
  'unit.mb': '{value} Mo',

  // ── Navigation (barre latérale) ─────────────────────
  'nav.aria': 'Navigation',
  'nav.play': 'Jouer',
  'nav.profile': 'Profil',
  'nav.settings': 'Réglages',
  'nav.biomes': 'Biomes',

  // ── Marque ──────────────────────────────────────────
  'brand.name': 'Odyssey',
  'brand.launcher': 'Launcher',
  'brand.logoAlt': 'Odyssey Launcher',
  'brand.tagline': 'Lance, explore, reviens plus loin.',

  // ── Pied de page ────────────────────────────────────
  'footer.coords': 'N 08.41° · W 77.02° · ALT 137 M',
  'footer.credits': 'Chahinez × Cla × Saida × Soumaya × Safya x Kaza',
  'footer.slogan': 'Le monde est ouvert.',

  // ── Commun ──────────────────────────────────────────
  'common.loading': 'Chargement…',

  // ── Vue Jouer ───────────────────────────────────────
  'play.panelAria': 'Partie',
  'play.version': 'Version Minecraft',
  'play.latest': 'Dernière version stable',
  'play.type': 'Type de jeu',
  'play.loaderVersion': 'Version {loader}',
  'play.noVersion': 'Aucune version disponible',
  'play.pack': 'Pack de ressources Odyssey',
  'play.player': 'Joueur',
  'play.noProfile': 'Aucun profil',
  'play.changeProfile': 'Changer de profil',
  'play.chooseProfile': 'Choisir un profil',
  'play.button': 'Jouer',

  // ── Types de jeu (noms propres, modifiables) ────────
  'loader.vanilla': 'Vanilla',
  'loader.fabric': 'Fabric',
  'loader.quilt': 'Quilt',
  'loader.forge': 'Forge',
  'loader.neoforge': 'NeoForge',

  // ── Vue Profil ──────────────────────────────────────
  'profile.title': 'Profil',
  'profile.accountType': 'Type de compte',
  'profile.microsoft': 'Microsoft',
  'profile.local': 'Local',
  'profile.account': 'Compte',
  'profile.connectedAccount': 'Compte connecté',
  'profile.noAccount': 'Aucun compte connecté',
  'profile.switchAccount': 'Changer de compte',
  'profile.loginMicrosoft': 'Connexion Microsoft',
  'profile.logout': 'Déconnexion',
  'profile.nickname': 'Pseudo',
  'profile.nicknamePlaceholder': 'Ton pseudo',
  'profile.counter': '{count} / 16',
  'profile.save': 'Enregistrer le profil',

  // ── Vue Réglages ────────────────────────────────────
  'settings.title': 'Réglages',

  'memory.title': 'Mémoire',
  'memory.total': 'RAM totale · {value}',
  'memory.reading': 'Lecture de la mémoire…',
  'memory.aria': 'Mémoire allouée',
  'zone.low': 'Insuffisant',
  'zone.recommended': 'Recommandé',
  'zone.limit': 'Limite',
  'zone.high': 'Trop élevé',

  'storage.title': 'Stockage',
  'storage.countOne': '{count} version · {size}',
  'storage.countMany': '{count} versions · {size}',
  'storage.reading': 'Lecture des versions…',
  'storage.empty': 'Aucune version installée. Lance une partie pour en télécharger une.',
  'storage.clearCache': 'Vider le cache',
  'storage.deleteVersions': 'Supprimer les versions',
  'storage.confirm': 'Confirmer',
  'storage.confirmCache': 'Clique à nouveau pour vider le cache.',
  'storage.confirmVersions': 'Clique à nouveau pour supprimer toutes les versions installées.',

  'language.title': 'Langue',
  'language.label': 'Langue du launcher',
  'language.hint': 'Le choix est enregistré.',

  // ── Vue Biomes ──────────────────────────────────────
  'biomes.title': 'Biomes',
  'biomes.intro': 'Choisis l’ambiance du launcher. Ton biome est enregistré et revient à chaque ouverture.',
  'biomes.active': 'Actif',
  'biomes.choose': 'Choisir',
  'theme.jungle.name': 'Jungle',
  'theme.jungle.desc': 'Le biome d’origine. Forêt dense, parties de tous les jours.',
  'theme.lagon.name': 'Lagon',
  'theme.lagon.desc': 'Eaux calmes. Sessions longues, mondes aquatiques.',
  'theme.volcan.name': 'Volcan',
  'theme.volcan.desc': 'Crépuscule chaud. Saisons, événements, grosses mises à jour.',
  'theme.aube.name': 'Aube',
  'theme.aube.desc': 'Thème clair. Lisibilité maximale, mode jour.',

  // ── Messages d'état (zone sous le bouton Jouer) ─────
  'status.ready': 'Prêt à partir.',
  'status.versionsError': 'Impossible de charger les versions',
  'status.loaderVersionsError': 'Impossible de charger les versions du loader',
  'status.connecting': 'Connexion à Microsoft…',
  'status.loginFailed': 'Connexion impossible',
  'status.microsoftDefaultName': 'Compte Microsoft',
  'status.connected': 'Connecté',
  'status.microsoftError': 'Erreur Microsoft',
  'status.loggedOut': 'Déconnecté',
  'status.logoutFailed': 'Déconnexion impossible',
  'status.saveFailed': 'Sauvegarde impossible',
  'status.profileSaved': 'Profil enregistré : {name}',
  'status.operationFailed': 'Opération impossible',
  'status.cacheCleared': 'Cache vidé',
  'status.versionsDeleted': 'Versions supprimées',
  'status.needMicrosoft': 'Connecte-toi avec Microsoft avant de lancer Minecraft.',
  'status.needNickname': 'Entre un pseudo.',
  'status.loadingVersions': 'Chargement des versions…',
  'status.noLoaderVersion': 'Aucune version {loader} pour Minecraft {version}.',
  'status.preparing': 'Préparation du lancement…',
  'status.launchFailed': 'Lancement impossible',
  'status.launchError': 'Erreur de lancement',

  // ── Mises à jour ────────────────────────────────────
  'update.title': 'Mises à jour',
  'update.version': 'Version {version}',
  'update.check': 'Rechercher une mise à jour',
  'update.checking': 'Recherche en cours…',
  'update.upToDate': 'Tu as la dernière version.',
  'update.available': 'Mise à jour {version} trouvée.',
  'update.downloading': 'Téléchargement de la mise à jour… {percent} %',
  'update.ready': 'La mise à jour {version} est prête.',
  'update.install': 'Redémarrer et installer',
  'update.error': 'Impossible de vérifier les mises à jour.',
  'update.devMode': 'Les mises à jour fonctionnent uniquement dans l’appli installée.',
  'update.bannerReady': 'Mise à jour {version} prête à installer.',
  'update.bannerDownloading': 'Téléchargement de la mise à jour {version}… {percent} %'
}

export type Dict = Record<keyof typeof fr, string>
export type TKey = keyof typeof fr