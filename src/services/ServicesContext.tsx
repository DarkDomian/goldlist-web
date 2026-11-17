import { createContext, useContext, type ReactNode } from "react";
import type { GoldlistDatabase } from "@/data/db";
import { db } from "@/data/db";
import type { ExampleDraft } from "@/domain/types";
import { AsyncMutex } from "./scheduler";
import { getExampleCandidates } from "./tatoeba";
import { WorkerTranslationService } from "./translation/client";
import { FakeTranslationService } from "./translation/fake";
import type { TranslationService } from "./translation/types";

export interface AppServices {
  database: GoldlistDatabase;
  translation: TranslationService;
  examples: (word: string) => Promise<ExampleDraft[]>;
  mutex: AsyncMutex;
}

export function createDefaultServices(): AppServices {
  const translation =
    import.meta.env.VITE_E2E === "1"
      ? new FakeTranslationService()
      : new WorkerTranslationService();

  return {
    database: db,
    translation,
    examples: (word) => getExampleCandidates(word, { database: db }),
    mutex: new AsyncMutex(),
  };
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services?: AppServices;
  children: ReactNode;
}) {
  return (
    <ServicesContext.Provider value={services ?? createDefaultServices()}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error("useServices must be used inside ServicesProvider");
  }
  return services;
}
