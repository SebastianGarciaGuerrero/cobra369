/**
 * Copia texto al portapapeles. Si la API moderna no está disponible
 * (navegador antiguo, sitio sin https, permiso denegado) usa el método
 * clásico con un <textarea> oculto. Devuelve true si se pudo copiar.
 */
export async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto)
        return true
    } catch {
        const ta = document.createElement('textarea')
        ta.value = texto
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        let ok = false
        try { ok = document.execCommand('copy') } catch { ok = false }
        document.body.removeChild(ta)
        return ok
    }
}

/**
 * Plan B para imágenes cuando no se puede copiar al portapapeles
 * (típico en celulares): abre el menú "Compartir" del sistema (WhatsApp,
 * correo, etc.) y, si tampoco existe, descarga el archivo.
 * Devuelve 'compartida', 'descargada' o null si el usuario canceló.
 */
export async function compartirODescargar(blob, nombre) {
    const file = new File([blob], nombre, { type: blob.type })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] })
            return 'compartida'
        } catch {
            return null
        }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'descargada'
}
