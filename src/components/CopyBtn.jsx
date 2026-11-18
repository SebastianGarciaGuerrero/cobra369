import { useState } from 'react'
import { copiarTexto } from '../utils/clipboard'

export default function CopyBtn({ value }) {
    const [ok, setOk] = useState(false)

    async function handleCopy() {
        if (!(await copiarTexto(String(value)))) return
        setOk(true)
        setTimeout(() => setOk(false), 1800)
    }

    return (
        <button
            type="button"
            className={`copy-inline ${ok ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copiar"
            aria-label="Copiar valor"
        >
            {ok ? '✓' : '⧉'}
        </button>
    )
}
