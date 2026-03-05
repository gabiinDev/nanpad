/**
 * Setup global para tests de Vitest del paquete @nanpad/core.
 * El core no depende de Tauri, por lo que no requiere mocks de APIs nativas.
 */

// No hay dependencias de plataforma que mockear en el core.
// Los repositorios usan IDatabase que en tests se sustituye por fakes en memoria.
