// Calcul d'âge partagé par le module Famille (différence calendaire, et non
// division approximative par 365,25 jours).

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

export function ageEnAnnees(dateNaissance: Date | string, today: Date = new Date()): number {
  const birth = toDate(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

// Âge lisible pour un tableau : jours / mois pour un nourrisson, années ensuite.
export function formatAgeCourt(dateNaissance: Date | string | undefined | null, today: Date = new Date()): string {
  if (!dateNaissance) return '-';
  const birth = toDate(dateNaissance);
  const years = ageEnAnnees(birth, today);
  if (years >= 1) return `${years} an${years > 1 ? 's' : ''}`;

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months >= 1) return `${months} mois`;

  const days = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} jour${days > 1 ? 's' : ''}`;
}
