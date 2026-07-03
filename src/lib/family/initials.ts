export const getInitials = (prenom?: string, nom?: string) => {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
};

export const initialsFromFullName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) || '';
  const b = parts[1]?.charAt(0) || '';
  return (a + b).toUpperCase() || '?';
};
