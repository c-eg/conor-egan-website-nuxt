export const RepositorySortOptions = [
    "Name Ascending",
    "Name Descending",
    "Stars Ascending",
    "Stars Descending",
] as const;

export type RepositorySortOption = typeof RepositorySortOptions[number];
