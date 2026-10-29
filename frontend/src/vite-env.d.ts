/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Padrão: "/api" (proxy do Vite em dev). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
