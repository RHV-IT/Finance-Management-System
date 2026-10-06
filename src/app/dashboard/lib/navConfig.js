// Must match the { section: '...' } headers in Sidebar's NAV.
export const NAV_SECTIONS = [
  'Overview', 'Revenue', 'Financials', 'Operations',
  'Procurement', 'Communication', 'Reports', 'Admin',
];

export function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}