import { HttpClient } from "@angular/common/http";

/**
 * Abre un PDF protegido (requiere credencial en la cabecera) sin que el bloqueo
 * de popups lo impida.
 *
 * El truco: se abre la pestaña destino en el MISMO gesto del clic (síncrono);
 * si se abriera hasta que llega la respuesta del `fetch`, el navegador la trata
 * como popup no solicitado y la bloquea. Cuando el blob llega, se le carga.
 * Si el usuario tiene bloqueados los popups, cae a una descarga con `<a download>`.
 */
export function abrirPdf(
  http: HttpClient,
  url: string,
  opciones: { filename?: string; onError?: () => void } = {},
): void {
  const win = window.open("", "_blank");
  http.get(url, { responseType: "blob" }).subscribe({
    next: (blob) => {
      const objUrl = URL.createObjectURL(blob);
      if (win && !win.closed) {
        win.location.href = objUrl;
      } else {
        // Popups bloqueados: se descarga el archivo.
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = opciones.filename ?? "documento.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    },
    error: () => {
      try {
        win?.close();
      } catch {
        /* noop */
      }
      opciones.onError?.();
    },
  });
}
