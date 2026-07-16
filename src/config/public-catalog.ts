/** Microtienda TELEFONÍA TOROCELL STORE (Sincelejo) — catálogo público en /tienda. */
export const DEFAULT_PUBLIC_CATALOG_STORE_ID = 'c5cd953a-7fd8-43f3-ac0d-abae7634e580'

export function getPublicCatalogStoreId(): string {
  const fromEnv =
    process.env.PUBLIC_CATALOG_STORE_ID?.trim() ||
    process.env.NEXT_PUBLIC_PUBLIC_CATALOG_STORE_ID?.trim()
  return fromEnv || DEFAULT_PUBLIC_CATALOG_STORE_ID
}
