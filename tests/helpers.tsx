import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { GoldlistDatabase } from "@/data/db";
import type { ExampleDraft } from "@/domain/types";
import { SettingsProvider } from "@/app/SettingsContext";
import {
  ServicesProvider,
  type AppServices,
} from "@/services/ServicesContext";
import { AsyncMutex } from "@/services/scheduler";
import type {
  TranslationService,
  TranslationStatus,
} from "@/services/translation/types";

let databaseCounter = 0;

export function makeTestDatabase(): GoldlistDatabase {
  databaseCounter += 1;
  return new GoldlistDatabase(`goldlist-test-${databaseCounter}-${Date.now()}`);
}

export function makeTranslation(translation = "перевод"): TranslationService {
  let status: TranslationStatus = { phase: "queued" };
  const listeners = new Set<(next: TranslationStatus) => void>();
  const setStatus = (next: TranslationStatus) => {
    status = next;
    for (const listener of listeners) {
      listener(next);
    }
  };
  return {
    async translate(text, onProgress) {
      setStatus({ phase: "queued" });
      onProgress?.({ phase: "queued" });
      setStatus({ phase: "translating" });
      onProgress?.({ phase: "translating" });
      setStatus({ phase: "ready" });
      return `${text} (${translation})`;
    },
    getStatus: () => status,
    subscribeStatus(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      listeners.clear();
    },
  };
}

export function makeServices(
  overrides: Partial<AppServices> & { database?: GoldlistDatabase } = {},
): AppServices {
  const database = overrides.database ?? makeTestDatabase();
  return {
    database,
    translation: overrides.translation ?? makeTranslation(),
    examples:
      overrides.examples ??
      (async (word: string): Promise<ExampleDraft[]> => [
        { text: `An example sentence with ${word}.`, source: "tatoeba" },
      ]),
    mutex: overrides.mutex ?? new AsyncMutex(),
  };
}

export function renderProviders({
  services,
  initialEntries = ["/"],
  children,
}: {
  services: AppServices;
  initialEntries?: string[];
  children: ReactNode;
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ServicesProvider services={services}>
        <SettingsProvider>{children}</SettingsProvider>
      </ServicesProvider>
    </MemoryRouter>
  );
}
