/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORABBIT_BACKEND_URL?: string;
  readonly VITE_ORABBIT_AUTH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
