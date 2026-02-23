/**
 * Список стран для селекта (регистрация, профиль).
 * Источник: пакет countries-list (ISO 3166-1, все страны).
 */
import { countries } from "countries-list";

export type CountryOption = { code: string; name: string };

/** Все страны: код (ISO 2) и название, отсортированы по имени. Для optional-селекта добавь пустой пункт в UI. */
export const COUNTRY_OPTIONS: CountryOption[] = Object.entries(countries)
  .map(([code, data]) => ({ code, name: data.name }))
  .sort((a, b) => a.name.localeCompare(b.name));
